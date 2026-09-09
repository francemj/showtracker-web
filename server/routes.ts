import type { Express, NextFunction, Request, Response } from "express"
import { createServer, type Server } from "http"
import rateLimit, { ipKeyGenerator } from "express-rate-limit"
import { z } from "zod"
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  lte,
  ne,
  sql,
} from "drizzle-orm"
import { db } from "./lib/db"
import {
  deviceTokens,
  episodes,
  shows,
  users,
  userShows,
  userShowsWithLastWatch,
  userShowsWithNextAir,
  watchProgress,
} from "../packages/shared/schema"
import {
  searchTVShows,
  getTVShowDetails,
  getTVShowSeason,
  type TmdbFetchOptions,
} from "./lib/tmdb"
import {
  APP_URL,
  consumePasswordResetToken,
  createPasswordResetToken,
  createSession,
  deletePasskey,
  finishPasskeyAuthentication,
  finishPasskeyRegistration,
  listPasskeys,
  resolveSession,
  revokeAllSessions,
  revokeSession,
  setPassword,
  startPasskeyAuthentication,
  startPasskeyRegistration,
  verifyCredentials,
  type AuthUser,
} from "./lib/auth"
import { sendPasswordResetEmail } from "./lib/email"
import { scheduleBackgroundTask } from "./lib/background-task"
import { isEpisodeAired, parseAirDate } from "../packages/shared/episode-utils"
import { inferShowStatus } from "../packages/shared/episode-progress"

interface AuthRequest extends Request {
  userId?: string
}

type WatchProgressRecord = typeof watchProgress.$inferInsert

/**
 * The composite key is not declared in the Drizzle schema, only in the
 * database, so every call site has to spell the conflict target out. Doing it
 * in one place keeps them from drifting apart.
 */
async function upsertWatchProgress(records: WatchProgressRecord[]) {
  if (records.length === 0) return
  await db
    .insert(watchProgress)
    .values(records)
    .onConflictDoUpdate({
      target: [
        watchProgress.userId,
        watchProgress.showId,
        watchProgress.seasonNumber,
        watchProgress.episodeNumber,
      ],
      set: {
        watched: sql`excluded.watched`,
        watchedAt: sql`excluded.watched_at`,
      },
    })
}

const SESSION_COOKIE = "st_session"

/**
 * Web holds its session in an httpOnly cookie, which script cannot read — that
 * is the point of it. Mobile has no cookie jar and carries a bearer token from
 * SecureStore instead.
 */
function readSessionToken(req: Request): {
  token: string | null
  fromCookie: boolean
} {
  const header = req.headers.authorization
  if (header?.startsWith("Bearer ")) {
    return { token: header.slice(7), fromCookie: false }
  }
  for (const part of req.headers.cookie?.split(";") ?? []) {
    const [name, ...value] = part.trim().split("=")
    if (name === SESSION_COOKIE) {
      return { token: decodeURIComponent(value.join("=")), fromCookie: true }
    }
  }
  return { token: null, fromCookie: false }
}

function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  })
}

/** Only a client that asks gets the raw token; browsers are meant to use the cookie. */
const wantsRawToken = (req: Request) => req.get("X-Auth-Mode") === "token"

async function respondWithSession(req: Request, res: Response, user: AuthUser) {
  const { token, expiresAt } = await createSession(user.id)
  setSessionCookie(res, token, expiresAt)
  res.json({ user, ...(wantsRawToken(req) ? { token } : {}) })
}

const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const { token, fromCookie } = readSessionToken(req)
  if (!token) {
    return res.status(401).json({ message: "Not authenticated" })
  }

  // SameSite=Lax already keeps the cookie off cross-site POSTs; this is the
  // belt to that pair of braces, and only applies to cookie auth because a
  // bearer token cannot be attached by a browser the user didn't ask.
  if (fromCookie && req.method !== "GET") {
    const origin = req.get("origin")
    if (origin && origin !== APP_URL) {
      return res.status(403).json({ message: "Cross-origin request refused" })
    }
  }

  const user = await resolveSession(token)
  if (!user) {
    return res.status(401).json({ message: "Session expired" })
  }

  req.userId = user.id
  next()
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Key by Bearer token prefix (unique per user, available before authMiddleware runs)
  const userKeyGenerator = (req: AuthRequest) => {
    const auth = req.headers.authorization
    if (auth?.startsWith("Bearer ")) return auth.slice(7, 60)
    return ipKeyGenerator(req.ip ?? "anonymous")
  }

  // 120 req/min per user across all /api routes
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    keyGenerator: userKeyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => !req.path.startsWith("/api"),
  })

  // Tighter limit on search (TMDB calls are expensive)
  const searchLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    keyGenerator: userKeyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
  })

  app.use(apiLimiter)

  // Auth routes
  //
  // Tighter than the global limiter and keyed on IP+email: the global one keys
  // on a bearer prefix, which by definition does not exist yet at sign-in, so
  // without this the password endpoints are unthrottled.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    keyGenerator: (req: Request) => {
      const email =
        typeof req.body?.email === "string" ? req.body.email.toLowerCase() : ""
      return `${ipKeyGenerator(req.ip ?? "anonymous")}:${email}`
    },
    standardHeaders: true,
    legacyHeaders: false,
  })

  const credentialsSchema = z.object({
    email: z.string().email().max(254),
    password: z.string().min(8).max(200),
    name: z.string().trim().min(1).max(100).optional(),
  })

  app.post(
    "/api/auth/register",
    authLimiter,
    async (req: Request, res: Response) => {
      const parsed = credentialsSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({
          message:
            "Enter an email address and a password of at least 8 characters",
        })
      }

      const email = parsed.data.email.toLowerCase()
      try {
        const [existing] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, email))
          .limit(1)

        if (existing) {
          return res
            .status(409)
            .json({ message: "An account already exists for that email" })
        }

        const [user] = await db
          .insert(users)
          .values({ email, name: parsed.data.name ?? email.split("@")[0] })
          .returning()

        await setPassword(user.id, parsed.data.password)
        await respondWithSession(req, res, user)
      } catch (error) {
        console.error("Register error:", error)
        res.status(500).json({ message: "Could not create your account" })
      }
    }
  )

  app.post(
    "/api/auth/login",
    authLimiter,
    async (req: Request, res: Response) => {
      const parsed = credentialsSchema
        .pick({ email: true, password: true })
        .safeParse(req.body)
      if (!parsed.success) {
        return res
          .status(400)
          .json({ message: "Enter your email and password" })
      }

      try {
        const user = await verifyCredentials(
          parsed.data.email,
          parsed.data.password
        )
        if (!user) {
          return res
            .status(401)
            .json({ message: "That email and password don't match" })
        }
        await respondWithSession(req, res, user)
      } catch (error) {
        console.error("Login error:", error)
        res.status(500).json({ message: "Could not sign you in" })
      }
    }
  )

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    // Revoking server-side is the whole job. Clearing the cookie alone would
    // leave a token that still works anywhere it had been copied.
    const { token } = readSessionToken(req)
    if (token) await revokeSession(token)
    res.clearCookie(SESSION_COOKIE, { path: "/" })
    res.json({ message: "Logged out" })
  })

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const { token } = readSessionToken(req)
    if (!token) {
      return res.status(401).json({ message: "Not authenticated" })
    }

    try {
      const user = await resolveSession(token)
      if (!user) {
        return res.status(401).json({ message: "Session expired" })
      }
      res.json({ user })
    } catch (error) {
      console.error("Auth check error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  })

  app.post(
    "/api/auth/forgot-password",
    authLimiter,
    async (req: Request, res: Response) => {
      const parsed = z
        .object({ email: z.string().email().max(254) })
        .safeParse(req.body)

      // Always the same answer, whether or not the address has an account —
      // otherwise this endpoint is a free account-existence oracle.
      const acknowledge = () =>
        res.json({
          message: "If that account exists, a reset link is on its way",
        })

      if (!parsed.success) return acknowledge()

      try {
        const [user] = await db
          .select({ id: users.id, email: users.email })
          .from(users)
          .where(eq(users.email, parsed.data.email.toLowerCase()))
          .limit(1)

        if (user) {
          const token = await createPasswordResetToken(user.id)
          await sendPasswordResetEmail(
            user.email,
            `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`
          )
        }
        acknowledge()
      } catch (error) {
        console.error("Forgot password error:", error)
        acknowledge()
      }
    }
  )

  app.post(
    "/api/auth/reset-password",
    authLimiter,
    async (req: Request, res: Response) => {
      const parsed = z
        .object({
          token: z.string().min(1),
          password: z.string().min(8).max(200),
        })
        .safeParse(req.body)

      if (!parsed.success) {
        return res
          .status(400)
          .json({ message: "Choose a password of at least 8 characters" })
      }

      try {
        const userId = await consumePasswordResetToken(parsed.data.token)
        if (!userId) {
          return res.status(400).json({
            message: "That reset link has expired or already been used",
          })
        }

        await setPassword(userId, parsed.data.password)
        // Resetting a password you believe is compromised has to evict whoever
        // else is holding a session, or it achieves nothing.
        await revokeAllSessions(userId)

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1)

        await respondWithSession(req, res, user)
      } catch (error) {
        console.error("Reset password error:", error)
        res.status(500).json({ message: "Could not reset your password" })
      }
    }
  )

  // Passkeys. Enrolment happens while signed in; sign-in is unauthenticated and
  // discovers the account from the credential the authenticator returns.
  app.post(
    "/api/auth/passkey/register/options",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, req.userId!))
          .limit(1)
        res.json(await startPasskeyRegistration(user))
      } catch (error) {
        console.error("Passkey register options error:", error)
        res.status(500).json({ message: "Could not start passkey setup" })
      }
    }
  )

  app.post(
    "/api/auth/passkey/register/verify",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      const { challengeId, response, name } = req.body ?? {}
      if (typeof challengeId !== "string" || !response) {
        return res.status(400).json({ message: "Invalid passkey response" })
      }

      try {
        const ok = await finishPasskeyRegistration(
          req.userId!,
          challengeId,
          response,
          typeof name === "string" ? name.slice(0, 100) : undefined
        )
        if (!ok) {
          return res
            .status(400)
            .json({ message: "Could not verify that passkey" })
        }
        res.json({ message: "Passkey added" })
      } catch (error) {
        console.error("Passkey register verify error:", error)
        res.status(500).json({ message: "Could not add that passkey" })
      }
    }
  )

  app.post(
    "/api/auth/passkey/login/options",
    authLimiter,
    async (_req: Request, res: Response) => {
      try {
        res.json(await startPasskeyAuthentication())
      } catch (error) {
        console.error("Passkey login options error:", error)
        res.status(500).json({ message: "Could not start passkey sign-in" })
      }
    }
  )

  app.post(
    "/api/auth/passkey/login/verify",
    authLimiter,
    async (req: Request, res: Response) => {
      const { challengeId, response } = req.body ?? {}
      if (typeof challengeId !== "string" || !response) {
        return res.status(400).json({ message: "Invalid passkey response" })
      }

      try {
        const user = await finishPasskeyAuthentication(challengeId, response)
        if (!user) {
          return res
            .status(401)
            .json({ message: "That passkey wasn't recognised" })
        }
        await respondWithSession(req, res, user)
      } catch (error) {
        console.error("Passkey login verify error:", error)
        res.status(500).json({ message: "Could not sign you in" })
      }
    }
  )

  app.get(
    "/api/auth/passkeys",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        res.json({ passkeys: await listPasskeys(req.userId!) })
      } catch (error) {
        console.error("List passkeys error:", error)
        res.status(500).json({ message: "Could not load your passkeys" })
      }
    }
  )

  app.delete(
    "/api/auth/passkeys/:id",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const removed = await deletePasskey(req.userId!, req.params.id)
        if (!removed) {
          return res.status(404).json({ message: "Passkey not found" })
        }
        res.json({ message: "Passkey removed" })
      } catch (error) {
        console.error("Delete passkey error:", error)
        res.status(500).json({ message: "Could not remove that passkey" })
      }
    }
  )

  // Update profile details (name, avatar)
  app.patch(
    "/api/user/profile",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const { name, picture } = req.body as {
          name?: string
          picture?: string
        }

        const updates: { name?: string; picture?: string } = {}
        if (name !== undefined) {
          if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ message: "Invalid name" })
          }
          updates.name = name.trim()
        }
        // An empty picture is a request to clear the avatar, not a bad value.
        if (picture !== undefined) {
          if (typeof picture !== "string") {
            return res.status(400).json({ message: "Invalid picture" })
          }
          updates.picture = picture.trim()
        }

        if (Object.keys(updates).length === 0) {
          return res.status(400).json({ message: "No fields to update" })
        }

        const [user] = await db
          .update(users)
          .set(updates)
          .where(eq(users.id, req.userId!))
          .returning()

        if (!user) {
          return res.status(500).json({ message: "Failed to update profile" })
        }

        res.json({ user })
      } catch (error) {
        console.error("Update profile error:", error)
        res.status(500).json({ message: "Failed to update profile" })
      }
    }
  )

  // Delete account (cascades to user_shows, watch_progress, device_tokens, user_credentials)
  app.delete(
    "/api/user",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        await db.delete(users).where(eq(users.id, req.userId!))

        res.json({ message: "Account deleted" })
      } catch (error) {
        console.error("Delete account error:", error)
        res.status(500).json({ message: "Failed to delete account" })
      }
    }
  )

  // Register mobile push notification token
  app.post(
    "/api/devices/register",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const { token, platform } = req.body as {
          token: string
          platform: string
        }
        if (!token || !platform) {
          return res
            .status(400)
            .json({ message: "token and platform are required" })
        }
        if (platform !== "ios" && platform !== "android") {
          return res
            .status(400)
            .json({ message: "platform must be 'ios' or 'android'" })
        }

        await db
          .insert(deviceTokens)
          .values({ userId: req.userId!, token, platform })
          .onConflictDoUpdate({
            target: deviceTokens.token,
            set: { userId: req.userId!, platform, updatedAt: new Date() },
          })

        res.json({ message: "Device registered" })
      } catch (err) {
        console.error("Error registering device:", err)
        res.status(500).json({ message: "Failed to register device" })
      }
    }
  )

  // Search shows
  app.get(
    "/api/search/shows/:query",
    authMiddleware,
    searchLimiter,
    async (req: AuthRequest, res: Response) => {
      try {
        const { query } = req.params
        if (!query) {
          return res.status(400).json({ message: "Query parameter required" })
        }

        const page = parseInt(req.query.page as string) || 1
        const result = await searchTVShows(query, page)
        res.json(result)
      } catch (error) {
        console.error("Search error:", error)
        res.status(500).json({ message: "Failed to search shows" })
      }
    }
  )

  // Get user stats (exclude stopped shows and their episodes)
  app.get(
    "/api/stats",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const rows = await db
          .select({ status: userShows.status, showId: userShows.showId })
          .from(userShows)
          .where(eq(userShows.userId, req.userId!))

        const activeShows = rows.filter((s) => s.status !== "stopped")
        const activeShowIds = activeShows.map((s) => s.showId)

        // Was an RPC to count_aired_watched_episodes(). That function existed
        // only to do the join server-side and dodge PostgREST's default row cap
        // on the underlying tables — a constraint that does not apply here.
        let episodesWatched = 0
        if (activeShowIds.length > 0) {
          const [row] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(watchProgress)
            .innerJoin(
              episodes,
              and(
                eq(episodes.showId, watchProgress.showId),
                eq(episodes.seasonNumber, watchProgress.seasonNumber),
                eq(episodes.episodeNumber, watchProgress.episodeNumber)
              )
            )
            .where(
              and(
                eq(watchProgress.userId, req.userId!),
                eq(watchProgress.watched, true),
                inArray(watchProgress.showId, activeShowIds),
                isNotNull(episodes.airDate),
                lte(episodes.airDate, new Date().toISOString())
              )
            )
          episodesWatched = row?.count ?? 0
        }

        const stats = {
          totalShows: activeShows.length,
          watchingShows: activeShows.filter((s) => s.status === "watching")
            .length,
          completedShows: activeShows.filter((s) => s.status === "completed")
            .length,
          wantToWatchShows: activeShows.filter(
            (s) => s.status === "want_to_watch"
          ).length,
          caughtUpShows: activeShows.filter((s) => s.status === "caught_up")
            .length,
          stoppedShows: rows.filter((s) => s.status === "stopped").length,
          episodesWatched,
        }

        res.json(stats)
      } catch (error) {
        console.error("Stats error:", error)
        res.status(500).json({ message: "Failed to get stats" })
      }
    }
  )

  // Get user shows
  app.get(
    "/api/user/shows",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        // Drizzle already returns camelCase, so the hand-written mapping
        // this replaced is no longer needed.
        const rows = await db
          .select({ showId: userShows.showId, status: userShows.status })
          .from(userShows)
          .where(eq(userShows.userId, req.userId!))

        res.json(rows)
      } catch (error) {
        console.error("Get user shows error:", error)
        res.status(500).json({ message: "Failed to get user shows" })
      }
    }
  )

  // Validate status for user's shows (refreshes TMDB data, caches episodes, re-runs inference)
  app.post(
    "/api/user/shows/validate-status",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      const scope = req.body?.scope ?? "all"
      const validScopes = new Set([
        "all",
        "caught_up_only",
        "completed_recheck",
      ])
      if (!validScopes.has(scope)) {
        return res.status(400).json({ message: "Invalid scope" })
      }

      let targetShowId: number | undefined
      if (req.body?.showId !== undefined) {
        const parsedShowId = Number(req.body.showId)
        if (!Number.isInteger(parsedShowId) || parsedShowId <= 0) {
          return res.status(400).json({ message: "Invalid showId" })
        }
        targetShowId = parsedShowId
      }

      const userId = req.userId!
      const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      console.log(`[validate-status:${runId}] request accepted`, {
        userId,
        scope,
        showId: targetShowId ?? null,
      })

      // A single show is cheap enough to finish inline, especially now that
      // TMDB responses are cached. Answering with the real result lets the
      // client refetch once, on a fact, instead of guessing with a timer.
      if (targetShowId !== undefined) {
        try {
          await runValidateStatusJob({ runId, userId, scope, targetShowId })
          return res.json({ message: "Validation complete", done: true })
        } catch (error) {
          console.error(`[validate-status:${runId}] inline run failed`, error)
          return res.status(500).json({ message: "Validation failed" })
        }
      }

      res.status(202).json({ message: "Validation started", done: false })

      const schedulerMode = scheduleBackgroundTask(
        async () =>
          runValidateStatusJob({
            runId,
            userId,
            scope,
            targetShowId,
          }),
        { taskName: `validate-status:${runId}` }
      )
      console.log(`[validate-status:${runId}] background scheduled`, {
        schedulerMode,
      })
    }
  )

  // Add show to user collection
  app.post(
    "/api/user/shows",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const { showId, initialStatus } = req.body

        const tmdbShow = await upsertShowFromTmdb(showId)

        // Add to user's collection
        // Default to want_to_watch if no initialStatus provided
        // If initialStatus is 'completed', mark all episodes as watched
        const [userShow] = await db
          .insert(userShows)
          .values({
            userId: req.userId!,
            showId,
            status: initialStatus || "want_to_watch",
          })
          .returning()

        if (!userShow) {
          return res.status(500).json({ message: "Failed to add show" })
        }

        // A show can carry watch progress from before it was added — rows left
        // by an earlier soft-delete, or orphaned by an older client. Returning
        // the default status there means the client renders "Want to Watch"
        // next to a real completion percentage, which is a state inference can
        // never produce. Recompute before responding so the two agree.
        const [prior] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(watchProgress)
          .where(
            and(
              eq(watchProgress.userId, req.userId!),
              eq(watchProgress.showId, showId),
              eq(watchProgress.watched, true)
            )
          )
        const priorWatched = prior?.count ?? 0

        if (priorWatched > 0 && !initialStatus) {
          const inferred = await updateInferredStatus(req.userId!, showId)
          if (inferred) userShow.status = inferred
        }

        // Cache episodes in background to enable status inference
        // If initialStatus is 'completed', also mark all episodes as watched
        ;(async () => {
          try {
            // Fetch and cache all seasons/episodes for this show
            if (tmdbShow.number_of_seasons) {
              const seasons = await Promise.all(
                Array.from(
                  { length: tmdbShow.number_of_seasons },
                  (_, i) => i + 1
                ).map(async (seasonNum) => {
                  return await getTVShowSeason(showId, seasonNum)
                })
              )

              await cacheEpisodesInDatabase(showId, seasons)

              // If marking as completed or caught_up, mark all aired episodes as watched
              if (
                initialStatus === "completed" ||
                initialStatus === "caught_up"
              ) {
                await markShowEpisodesWatched(req.userId!, showId, true)
              }

              // Now run status inference with cached data
              await updateInferredStatus(req.userId!, showId)
            }
          } catch (err: any) {
            console.error("Background episode caching/inference failed:", err)
          }
        })()

        res.json(userShow)
      } catch (error) {
        console.error("Add show error:", error)
        res.status(500).json({ message: "Failed to add show" })
      }
    }
  )

  // Explicitly set a show's status (e.g. mark as stopped, resume watching)
  app.patch(
    "/api/user/shows/:showId",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const showId = parseInt(req.params.showId, 10)
        if (Number.isNaN(showId)) {
          return res.status(400).json({ message: "Invalid show ID" })
        }

        const validStatuses = [
          "want_to_watch",
          "watching",
          "caught_up",
          "completed",
          "stopped",
        ]
        const { status } = req.body
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ message: "Invalid status" })
        }

        const [updated] = await db
          .update(userShows)
          .set({ status, updatedAt: new Date() })
          .where(
            and(eq(userShows.userId, req.userId!), eq(userShows.showId, showId))
          )
          .returning()

        if (!updated) {
          return res.status(404).json({ message: "Show not in collection" })
        }

        res.json(updated)
      } catch (error) {
        console.error("Update show status error:", error)
        res.status(500).json({ message: "Failed to update status" })
      }
    }
  )

  // Resume a stopped show. Stopping is the only manual status change in the
  // product; every other status is inferred, so resume recomputes rather than
  // letting the client name a destination.
  app.post(
    "/api/user/shows/:showId/resume",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const showId = parseInt(req.params.showId, 10)
        if (!Number.isInteger(showId) || showId <= 0) {
          return res.status(400).json({ message: "Invalid show ID" })
        }

        const [userShow] = await db
          .select({ status: userShows.status })
          .from(userShows)
          .where(
            and(eq(userShows.userId, req.userId!), eq(userShows.showId, showId))
          )
          .limit(1)

        if (!userShow) {
          return res.status(404).json({ message: "Show not in your library" })
        }

        const status = await updateInferredStatus(req.userId!, showId)
        if (!status) {
          return res
            .status(503)
            .json({ message: "Couldn't work out where this show belongs yet." })
        }

        res.json({ status })
      } catch (error) {
        console.error("Resume show error:", error)
        res.status(500).json({ message: "Failed to resume show" })
      }
    }
  )

  // Remove show from user collection (soft delete: set status to "stopped")
  app.delete(
    "/api/user/shows/:showId",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const showId = parseInt(req.params.showId, 10)
        if (Number.isNaN(showId)) {
          return res.status(400).json({ message: "Invalid show ID" })
        }

        await db
          .update(userShows)
          .set({ status: "stopped", updatedAt: new Date() })
          .where(
            and(eq(userShows.userId, req.userId!), eq(userShows.showId, showId))
          )

        res.status(204).send()
      } catch (error) {
        console.error("Remove show error:", error)
        res.status(500).json({ message: "Failed to remove show" })
      }
    }
  )

  // Get shows by status
  app.get(
    "/api/shows/watching",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 20
        const search = (req.query.search as string) || undefined
        const result = await getShowsWithProgress(req.userId!, "watching", {
          page,
          limit,
          sortBy: "recent_watch",
          search,
        })
        res.json(result)
      } catch (error) {
        console.error("Get watching shows error:", error)
        res.status(500).json({ message: "Failed to get shows" })
      }
    }
  )

  app.get(
    "/api/shows/completed",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 20
        const search = (req.query.search as string) || undefined
        const result = await getShowsWithProgress(req.userId!, "completed", {
          page,
          limit,
          search,
        })
        res.json(result)
      } catch (error) {
        console.error("Get completed shows error:", error)
        res.status(500).json({ message: "Failed to get shows" })
      }
    }
  )

  app.get(
    "/api/shows/want-to-watch",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 20
        const search = (req.query.search as string) || undefined
        const result = await getShowsWithProgress(
          req.userId!,
          "want_to_watch",
          { page, limit, search }
        )
        res.json(result)
      } catch (error) {
        console.error("Get want to watch shows error:", error)
        res.status(500).json({ message: "Failed to get shows" })
      }
    }
  )

  app.get(
    "/api/shows/stopped",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 20
        const search = (req.query.search as string) || undefined
        const result = await getShowsWithProgress(req.userId!, "stopped", {
          page,
          limit,
          search,
        })
        res.json(result)
      } catch (error) {
        console.error("Get stopped shows error:", error)
        res.status(500).json({ message: "Failed to get shows" })
      }
    }
  )

  app.get(
    "/api/shows/caught-up",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 20
        const search = (req.query.search as string) || undefined
        const result = await getShowsWithProgress(req.userId!, "caught_up", {
          page,
          limit,
          sortBy: "next_air_date",
          search,
        })
        res.json(result)
      } catch (error) {
        console.error("Get caught up shows error:", error)
        res.status(500).json({ message: "Failed to get shows" })
      }
    }
  )

  // Get show details
  app.get(
    "/api/shows/:id",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params
        const showId = parseInt(id, 10)
        if (!Number.isInteger(showId) || showId <= 0) {
          return res.status(400).json({ message: "Invalid show ID" })
        }

        const [show] = await db
          .select()
          .from(shows)
          .where(eq(shows.id, showId))
          .limit(1)

        if (!show) {
          const tmdbShow = await getTVShowDetails(showId).catch(() => null)
          if (!tmdbShow) {
            return res.status(404).json({ message: "Show not found" })
          }
          return res.json({
            id: tmdbShow.id,
            name: tmdbShow.name,
            overview: tmdbShow.overview,
            posterPath: tmdbShow.poster_path,
            backdropPath: tmdbShow.backdrop_path,
            firstAirDate: tmdbShow.first_air_date,
            voteAverage: tmdbShow.vote_average,
            numberOfSeasons: tmdbShow.number_of_seasons,
            numberOfEpisodes: tmdbShow.number_of_episodes,
            status: tmdbShow.status,
            genres: tmdbShow.genres?.map((g: any) => g.name),
            tmdbData: tmdbShow,
            lastUpdated: null,
            userShow: null,
            watchedEpisodes: 0,
            totalEpisodes: tmdbShow.number_of_episodes ?? 0,
            progress: 0,
            nextEpisode: undefined,
          })
        }

        if (show.status == null) {
          // upsertShowFromTmdb both refreshes the row and returns the TMDB
          // payload, so this is one fetch rather than the two the inline
          // version did.
          const tmdbShow = await upsertShowFromTmdb(showId)
          show.status = tmdbShow.status
        }

        const [userShow] = await db
          .select()
          .from(userShows)
          .where(
            and(eq(userShows.userId, req.userId!), eq(userShows.showId, showId))
          )
          .limit(1)

        const progress = await calculateShowProgress(req.userId!, parseInt(id))

        // Drizzle already returns camelCase, so the row goes out as-is
        // rather than being copied field by field.
        res.json({ ...show, userShow: userShow ?? null, ...progress })
      } catch (error) {
        console.error("Get show error:", error)
        res.status(500).json({ message: "Failed to get show" })
      }
    }
  )

  // Get show seasons with episodes
  app.get(
    "/api/shows/:id/seasons",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params
        const parsedId = parseInt(id, 10)
        if (!Number.isInteger(parsedId) || parsedId <= 0) {
          return res.status(400).json({ message: "Invalid show ID" })
        }

        const [show] = await db
          .select({ numberOfSeasons: shows.numberOfSeasons })
          .from(shows)
          .where(eq(shows.id, parsedId))
          .limit(1)

        let numberOfSeasons = show?.numberOfSeasons
        if (!numberOfSeasons) {
          // Show hasn't been cached locally yet (e.g. viewed before being
          // added to a collection) — fall back to TMDB, same as /api/shows/:id
          const tmdbShow = await getTVShowDetails(parseInt(id))
          numberOfSeasons = tmdbShow.number_of_seasons
        }

        if (!numberOfSeasons) {
          return res.json([])
        }

        const seasonNums = Array.from(
          { length: numberOfSeasons },
          (_, i) => i + 1
        )

        // The episodes table already holds everything this endpoint returns,
        // and every write path keeps it current. Serving from it turns one
        // request per season into a single query — for a 38-season show that
        // is 38 TMDB round trips replaced by one.
        const cachedSeasons = await readSeasonsFromCache(parsedId, seasonNums)
        if (cachedSeasons) {
          return res.json(cachedSeasons)
        }

        const seasonResults = await Promise.allSettled(
          seasonNums.map(async (seasonNum) => {
            return await getTVShowSeason(parsedId, seasonNum)
          })
        )

        const seasons = seasonResults
          .filter(
            (r): r is PromiseFulfilledResult<any> => r.status === "fulfilled"
          )
          .map((r) => r.value)

        // If everything failed, surface it as an error so the client can react.
        if (seasons.length === 0) {
          throw new Error("Failed to get seasons from TMDB")
        }

        // Cache episodes in database for faster status inference
        // This runs in background and doesn't block the response
        cacheEpisodesInDatabase(parseInt(id), seasons).catch((err) =>
          console.error("Failed to cache episodes:", err)
        )

        res.json(seasons)
      } catch (error) {
        console.error("Get seasons error:", error)
        res.status(500).json({ message: "Failed to get seasons" })
      }
    }
  )

  // Get watch progress
  app.get(
    "/api/shows/:id/progress",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params

        // season/episode rather than seasonNumber/episodeNumber: this is a
        // reshape the client expects, not just a case conversion.
        const progress = await db
          .select({
            season: watchProgress.seasonNumber,
            episode: watchProgress.episodeNumber,
            watched: watchProgress.watched,
          })
          .from(watchProgress)
          .where(
            and(
              eq(watchProgress.userId, req.userId!),
              eq(watchProgress.showId, parseInt(id))
            )
          )

        res.json(progress)
      } catch (error) {
        console.error("Get progress error:", error)
        res.status(500).json({ message: "Failed to get progress" })
      }
    }
  )

  // Toggle episode watched status
  app.post(
    "/api/shows/:id/progress",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params
        const { season, episode, watched } = req.body
        const showId = parseInt(id)

        if (watched) {
          const airDate = await getEpisodeAirDate(showId, season, episode)
          if (!isEpisodeAired(airDate)) {
            return res
              .status(400)
              .json({ message: "This episode hasn't aired yet." })
          }
        }

        await upsertWatchProgress([
          {
            userId: req.userId!,
            showId,
            seasonNumber: season,
            episodeNumber: episode,
            watched,
            watchedAt: watched ? new Date() : null,
          },
        ])

        if (watched) {
          await ensureUserShow(req.userId!, showId)
        }

        // Await the status recompute so the response the client invalidates
        // against already reflects the new status. Fire-and-forget here meant
        // the refetch raced the write and showed a stale status.
        try {
          await updateInferredStatus(req.userId!, showId)
        } catch (err) {
          console.error("Status update failed:", err)
        }

        res.json({ success: true })
      } catch (error) {
        console.error("Update progress error:", error)
        res.status(500).json({ message: "Failed to update progress" })
      }
    }
  )

  // Mark all episodes in season as watched/unwatched
  app.post(
    "/api/shows/:id/season/:seasonNumber/mark-all",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const { id, seasonNumber } = req.params
        const { watched } = req.body

        // Get season details to know episode count
        const season = await getTVShowSeason(
          parseInt(id),
          parseInt(seasonNumber)
        )

        if (!season.episodes) {
          return res.status(404).json({ message: "Season not found" })
        }

        // Only mark aired episodes
        const airedEpisodes = season.episodes.filter((ep: any) =>
          isEpisodeAired(ep.air_date)
        )

        // Upsert aired episodes only
        const progressRecords = airedEpisodes.map((ep: any) => ({
          userId: req.userId!,
          showId: parseInt(id),
          seasonNumber: parseInt(seasonNumber),
          episodeNumber: ep.episode_number,
          watched,
          watchedAt: watched ? new Date() : null,
        }))

        await upsertWatchProgress(progressRecords)

        if (watched && progressRecords.length > 0) {
          await ensureUserShow(req.userId!, parseInt(id))
        }

        // Await the status recompute so the response the client invalidates
        // against already reflects the new status. Fire-and-forget here meant
        // the refetch raced the write and showed a stale status.
        try {
          await updateInferredStatus(req.userId!, parseInt(id))
        } catch (err) {
          console.error("Status update failed:", err)
        }

        res.json({ success: true })
      } catch (error) {
        console.error("Mark season error:", error)
        res.status(500).json({ message: "Failed to mark season" })
      }
    }
  )

  // Bulk update episode progress
  app.post(
    "/api/shows/:id/progress/bulk",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params
        // Named episodeInputs, not episodes: the request body would otherwise
        // shadow the imported episodes table for the rest of this handler.
        const { episodes: episodeInputs } = req.body
        const showId = parseInt(id)

        if (!Array.isArray(episodeInputs) || episodeInputs.length === 0) {
          return res.status(400).json({ message: "Episodes array is required" })
        }

        // Drop watched=true entries for episodes that haven't aired; unwatching
        // is always allowed. Only fetch air dates for the entries that need one.
        const validEpisodes = await Promise.all(
          episodeInputs.map(async (ep: any) => {
            if (!ep.watched) return ep
            const airDate = await getEpisodeAirDate(
              showId,
              ep.season,
              ep.episode
            )
            return isEpisodeAired(airDate) ? ep : null
          })
        ).then((results) => results.filter((ep): ep is any => ep !== null))

        // Create progress records for the valid episodes
        const progressRecords = validEpisodes.map((ep: any) => ({
          userId: req.userId!,
          showId,
          seasonNumber: ep.season,
          episodeNumber: ep.episode,
          watched: ep.watched,
          watchedAt: ep.watched ? new Date() : null,
        }))

        if (progressRecords.length > 0) {
          await upsertWatchProgress(progressRecords)

          if (progressRecords.some((record) => record.watched)) {
            await ensureUserShow(req.userId!, showId)
          }
        }

        // Await the status recompute so the response the client invalidates
        // against already reflects the new status. Fire-and-forget here meant
        // the refetch raced the write and showed a stale status.
        try {
          await updateInferredStatus(req.userId!, showId)
        } catch (err) {
          console.error("Status update failed:", err)
        }

        res.json({
          success: true,
          count: progressRecords.length,
          skipped: episodeInputs.length - progressRecords.length,
        })
      } catch (error) {
        console.error("Bulk update progress error:", error)
        res.status(500).json({ message: "Failed to update progress" })
      }
    }
  )

  const httpServer = createServer(app)
  return httpServer
}

async function runValidateStatusJob({
  runId,
  userId,
  scope,
  targetShowId,
}: {
  runId: string
  userId: string
  scope: "all" | "caught_up_only" | "completed_recheck"
  targetShowId?: number
}) {
  const runStartMs = Date.now()
  try {
    console.log(`[validate-status:${runId}] run started`)

    const isTargetedShow = targetShowId !== undefined

    const filters = [
      eq(userShows.userId, userId),
      ne(userShows.status, "stopped"),
    ]

    if (scope === "caught_up_only") {
      filters.push(eq(userShows.status, "caught_up"))
    } else if (scope === "completed_recheck") {
      filters.push(eq(userShows.status, "completed"))
    } else if (!isTargetedShow) {
      // Bulk "all" sweeps skip completed shows (they rarely change); a
      // targeted single-show check (e.g. from the show detail page) still
      // re-validates a completed show in case it was renewed.
      filters.push(ne(userShows.status, "completed"))
    }
    if (isTargetedShow) {
      filters.push(eq(userShows.showId, targetShowId!))
    }

    const rows = await db
      .select({ showId: userShows.showId })
      .from(userShows)
      .where(and(...filters))

    if (!rows.length) {
      console.log(`[validate-status:${runId}] no matching shows`, {
        userId,
        scope,
        showId: targetShowId ?? null,
      })
      return
    }

    console.log(`[validate-status:${runId}] selected shows`, {
      count: rows.length,
    })

    let succeeded = 0
    let failed = 0
    let skipped = 0

    for (const row of rows) {
      const showId = row.showId
      const showStartMs = Date.now()
      try {
        console.log(`[validate-status:${runId}] show start`, { showId })
        // This job is what keeps our database current with TMDB, so it always
        // goes to the source. Serving it a cached response would mean
        // "refreshing" our source of truth with data we already had. The fresh
        // results are written back to the cache, so read paths benefit too.
        const tmdbShow = await upsertShowFromTmdb(showId, {
          forceRefresh: true,
        })
        if (tmdbShow?.number_of_seasons) {
          // Show details are one cheap call and tell us whether anything can
          // have changed. Refetching every season is the expensive part, so
          // skip it for a finished show whose episode count already matches —
          // nothing can move. Anything still running is always refetched,
          // since air dates shift without the count changing.
          if (await needsEpisodeRefresh(showId, tmdbShow)) {
            const seasons = await Promise.all(
              Array.from(
                { length: tmdbShow.number_of_seasons },
                (_, i) => i + 1
              ).map((n) => getTVShowSeason(showId, n, { forceRefresh: true }))
            )
            await cacheEpisodesInDatabase(showId, seasons)
          } else {
            skipped += 1
            console.log(`[validate-status:${runId}] episodes unchanged`, {
              showId,
            })
          }
        }
        await updateInferredStatus(userId, showId)
        succeeded += 1
        console.log(`[validate-status:${runId}] show complete`, {
          showId,
          elapsedMs: Date.now() - showStartMs,
        })
      } catch (err: any) {
        failed += 1
        console.error(`[validate-status:${runId}] show failed`, {
          showId,
          error: err,
          elapsedMs: Date.now() - showStartMs,
        })
      }
    }

    console.log(`[validate-status:${runId}] run complete`, {
      processed: rows.length,
      succeeded,
      failed,
      seasonRefetchSkipped: skipped,
      elapsedMs: Date.now() - runStartMs,
    })
  } catch (err: any) {
    console.error(`[validate-status:${runId}] run failed`, {
      error: err,
      elapsedMs: Date.now() - runStartMs,
    })
  }
}

async function upsertShowFromTmdb(
  showId: number,
  options: TmdbFetchOptions = {}
) {
  const tmdbShow = await getTVShowDetails(showId, options)
  const values = {
    id: tmdbShow.id,
    name: tmdbShow.name,
    overview: tmdbShow.overview,
    posterPath: tmdbShow.poster_path,
    backdropPath: tmdbShow.backdrop_path,
    firstAirDate: tmdbShow.first_air_date,
    voteAverage: tmdbShow.vote_average?.toString(),
    numberOfSeasons: tmdbShow.number_of_seasons,
    numberOfEpisodes: tmdbShow.number_of_episodes,
    status: tmdbShow.status,
    genres: tmdbShow.genres?.map((g: any) => g.name),
    tmdbData: tmdbShow,
    lastUpdated: new Date(),
  }
  try {
    await db
      .insert(shows)
      .values(values)
      .onConflictDoUpdate({ target: shows.id, set: values })
  } catch (error) {
    console.error("Show upsert error:", error)
  }
  return tmdbShow
}

type GetShowsWithProgressOptions = {
  page?: number
  limit?: number
  sortBy?: "updated_at" | "recent_watch" | "next_air_date"
  search?: string
}

type UserShowRow = {
  id: string
  userId: string
  showId: number
  status: string
  rating: number | null
  notes: string | null
  addedAt: Date
  updatedAt: Date
  show?: Record<string, unknown> | null
  lastWatchAt?: Date | null
  nextAirDate?: string | null
  nextSeasonNumber?: number | null
  nextEpisodeNumber?: number | null
}

async function batchShowProgress(
  userId: string,
  rows: UserShowRow[],
  showsById: Record<number, Record<string, unknown>>
) {
  const showIds = rows.map((us) => us.showId)

  const [watchProgressRows, episodeRows] = await Promise.all([
    db
      .select({
        showId: watchProgress.showId,
        seasonNumber: watchProgress.seasonNumber,
        episodeNumber: watchProgress.episodeNumber,
      })
      .from(watchProgress)
      .where(
        and(
          eq(watchProgress.userId, userId),
          inArray(watchProgress.showId, showIds),
          eq(watchProgress.watched, true)
        )
      ),
    db
      .select({
        showId: episodes.showId,
        seasonNumber: episodes.seasonNumber,
        episodeNumber: episodes.episodeNumber,
        airDate: episodes.airDate,
        name: episodes.name,
      })
      .from(episodes)
      .where(inArray(episodes.showId, showIds))
      .orderBy(
        asc(episodes.showId),
        asc(episodes.seasonNumber),
        asc(episodes.episodeNumber)
      ),
  ])

  // Group watch progress by show
  const watchedByShow: Record<number, Set<string>> = {}
  for (const row of watchProgressRows) {
    if (!watchedByShow[row.showId]) watchedByShow[row.showId] = new Set()
    watchedByShow[row.showId].add(`${row.seasonNumber}-${row.episodeNumber}`)
  }

  // Group episodes by show (already ordered asc)
  type EpisodeRow = (typeof episodeRows)[number]
  const episodesByShow: Record<number, EpisodeRow[]> = {}
  for (const ep of episodeRows) {
    if (!episodesByShow[ep.showId]) episodesByShow[ep.showId] = []
    episodesByShow[ep.showId].push(ep)
  }

  const now = new Date().toISOString()

  return rows.map((us) => {
    const show = us.show ?? showsById[us.showId] ?? {}
    const watched = watchedByShow[us.showId] ?? new Set()

    // showEpisodes, not episodes: that name is the imported table here.
    const showEpisodes = episodesByShow[us.showId]
    const airedKeys = showEpisodes
      ? new Set(
          showEpisodes
            .filter(
              (ep) => ep.seasonNumber !== 0 && ep.airDate && ep.airDate <= now
            )
            .map((ep) => `${ep.seasonNumber}-${ep.episodeNumber}`)
        )
      : null

    // Fall back to the unfiltered TMDB episode count if we don't have
    // cached episodes yet, so we don't regress to "0/1" for such shows.
    const watchedEpisodes = airedKeys
      ? Array.from(watched).filter((key) => airedKeys.has(key)).length
      : watched.size
    const totalEpisodes = airedKeys
      ? airedKeys.size || 1
      : (show.numberOfEpisodes as number) || 1
    const progress = (watchedEpisodes / totalEpisodes) * 100

    let nextEpisode: {
      season: number
      episode: number
      airDate: string | null
      daysUntil: number | null
      name: string | null
    } | null = null

    if (showEpisodes) {
      for (const ep of showEpisodes) {
        const key = `${ep.seasonNumber}-${ep.episodeNumber}`
        if (!watched.has(key)) {
          const airDate = ep.airDate ?? null
          const daysUntil = airDate
            ? Math.ceil((new Date(airDate).getTime() - Date.now()) / 86400000)
            : null
          nextEpisode = {
            season: ep.seasonNumber,
            episode: ep.episodeNumber,
            airDate,
            daysUntil,
            name: ep.name ?? null,
          }
          break
        }
      }
    }

    return { watchedEpisodes, totalEpisodes, progress, nextEpisode }
  })
}

async function getShowsWithProgress(
  userId: string,
  status: string,
  options: GetShowsWithProgressOptions = {}
) {
  const page = options.page ?? 1
  const limit = options.limit ?? 20
  const sortBy = options.sortBy ?? "updated_at"
  const search = options.search
  const offset = (page - 1) * limit

  // shows.id is a NOT NULL foreign key on user_shows, so an inner join matches
  // the same rows a left join would and lets the name filter act as a plain
  // WHERE. Under PostgREST this needed the !inner hint, and the two view paths
  // below needed an entirely separate round trip to resolve matching ids first,
  // because a view could not be joined to a table at all.
  const nameFilter = search ? ilike(shows.name, `%${search}%`) : undefined

  let rows: UserShowRow[]
  let count: number

  const countOf = async (
    from:
      | typeof userShows
      | typeof userShowsWithLastWatch
      | typeof userShowsWithNextAir,
    joinCol: any,
    where: any
  ) => {
    const [row] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(from as any)
      .innerJoin(shows, eq(shows.id, joinCol))
      .where(where)
    return row?.value ?? 0
  }

  if (sortBy === "updated_at") {
    const where = and(
      eq(userShows.userId, userId),
      eq(userShows.status, status),
      nameFilter
    )
    const [total, joined] = await Promise.all([
      countOf(userShows, userShows.showId, where),
      db
        .select({ us: userShows, show: shows })
        .from(userShows)
        .innerJoin(shows, eq(shows.id, userShows.showId))
        .where(where)
        .orderBy(desc(userShows.updatedAt))
        .limit(limit)
        .offset(offset),
    ])
    rows = joined.map((r) => ({ ...r.us, show: r.show })) as UserShowRow[]
    count = total
  } else if (sortBy === "recent_watch") {
    const v = userShowsWithLastWatch
    const where = and(eq(v.userId, userId), eq(v.status, status), nameFilter)
    const [total, joined] = await Promise.all([
      countOf(v, v.showId, where),
      db
        // Views need their columns listed individually; Drizzle will not take a
        // whole pgView as a selection the way it takes a pgTable.
        .select({
          id: v.id,
          userId: v.userId,
          showId: v.showId,
          status: v.status,
          rating: v.rating,
          notes: v.notes,
          addedAt: v.addedAt,
          updatedAt: v.updatedAt,
          lastWatchAt: v.lastWatchAt,
          show: shows,
        })
        .from(v)
        .innerJoin(shows, eq(shows.id, v.showId))
        .where(where)
        .orderBy(sql`${v.lastWatchAt} desc nulls last`)
        .limit(limit)
        .offset(offset),
    ])
    rows = joined as unknown as UserShowRow[]
    count = total
  } else {
    const v = userShowsWithNextAir
    const where = and(eq(v.userId, userId), eq(v.status, status), nameFilter)
    const [total, joined] = await Promise.all([
      countOf(v, v.showId, where),
      db
        .select({
          id: v.id,
          userId: v.userId,
          showId: v.showId,
          status: v.status,
          rating: v.rating,
          notes: v.notes,
          addedAt: v.addedAt,
          updatedAt: v.updatedAt,
          nextAirDate: v.nextAirDate,
          nextSeasonNumber: v.nextSeasonNumber,
          nextEpisodeNumber: v.nextEpisodeNumber,
          show: shows,
        })
        .from(v)
        .innerJoin(shows, eq(shows.id, v.showId))
        .where(where)
        .orderBy(sql`${v.nextAirDate} asc nulls last`)
        .limit(limit)
        .offset(offset),
    ])
    rows = joined as unknown as UserShowRow[]
    count = total
  }

  if (rows.length === 0) {
    return { shows: [], total: 0, page, totalPages: 0 }
  }

  const totalPages = Math.ceil(count / limit)
  const progressResults = await batchShowProgress(userId, rows, {})

  const result = rows.map((us, i) => {
    const { watchedEpisodes, totalEpisodes, progress, nextEpisode } =
      progressResults[i]

    // Drizzle already returns camelCase, so the show row and the user_show row
    // both go out as-is rather than being copied field by field.
    return {
      ...(us.show as Record<string, unknown>),
      userShow: {
        id: us.id,
        userId: us.userId,
        showId: us.showId,
        status: us.status,
        rating: us.rating,
        notes: us.notes,
        addedAt: us.addedAt,
        updatedAt: us.updatedAt,
      },
      watchedEpisodes,
      totalEpisodes,
      progress,
      ...(nextEpisode ? { nextEpisode } : {}),
    }
  })

  return { shows: result, total: count, page, totalPages }
}

async function findNextUnwatchedEpisode(userId: string, showId: number) {
  try {
    // Get show details to know how many seasons
    const [show] = await db
      .select({ numberOfSeasons: shows.numberOfSeasons })
      .from(shows)
      .where(eq(shows.id, showId))
      .limit(1)

    if (!show || !show.numberOfSeasons) {
      return null
    }

    // Get all watched episodes for this show
    const watchedProgress = await db
      .select({
        seasonNumber: watchProgress.seasonNumber,
        episodeNumber: watchProgress.episodeNumber,
      })
      .from(watchProgress)
      .where(
        and(
          eq(watchProgress.userId, userId),
          eq(watchProgress.showId, showId),
          eq(watchProgress.watched, true)
        )
      )

    const watchedSet = new Set(
      watchedProgress.map((w) => `${w.seasonNumber}-${w.episodeNumber}`)
    )

    // Iterate through seasons to find first unwatched episode
    for (let seasonNum = 1; seasonNum <= show.numberOfSeasons; seasonNum++) {
      try {
        const seasonData = await getTVShowSeason(showId, seasonNum)
        if (seasonData.episodes && seasonData.episodes.length > 0) {
          for (const episode of seasonData.episodes) {
            const key = `${seasonNum}-${episode.episode_number}`
            if (!watchedSet.has(key)) {
              const airDate = episode.air_date as string | null
              const daysUntil = airDate
                ? Math.ceil(
                    (parseAirDate(airDate)!.getTime() - Date.now()) / 86400000
                  )
                : null
              return {
                season: seasonNum,
                episode: episode.episode_number,
                name: episode.name,
                airDate,
                daysUntil,
              }
            }
          }
        }
      } catch (error) {
        console.error(
          `Failed to fetch season ${seasonNum} for next episode search:`,
          error
        )
      }
    }

    return null
  } catch (error) {
    console.error("Error finding next unwatched episode:", error)
    return null
  }
}

async function calculateShowProgress(userId: string, showId: number) {
  const now = new Date().toISOString()
  const fetchAiredEpisodes = () =>
    db
      .select({
        seasonNumber: episodes.seasonNumber,
        episodeNumber: episodes.episodeNumber,
      })
      .from(episodes)
      .where(
        and(
          eq(episodes.showId, showId),
          ne(episodes.seasonNumber, 0),
          isNotNull(episodes.airDate),
          lte(episodes.airDate, now)
        )
      )

  let airedEpisodes = await fetchAiredEpisodes()
  if (airedEpisodes.length === 0) {
    await ensureEpisodesCached(showId)
    airedEpisodes = await fetchAiredEpisodes()
  }

  const progress = await db
    .select({
      seasonNumber: watchProgress.seasonNumber,
      episodeNumber: watchProgress.episodeNumber,
    })
    .from(watchProgress)
    .where(
      and(
        eq(watchProgress.userId, userId),
        eq(watchProgress.showId, showId),
        eq(watchProgress.watched, true)
      )
    )

  const airedKeys = new Set(
    airedEpisodes.map((e) => `${e.seasonNumber}-${e.episodeNumber}`)
  )
  const watchedEpisodes = progress.filter((p) =>
    airedKeys.has(`${p.seasonNumber}-${p.episodeNumber}`)
  ).length
  const totalEpisodes = airedKeys.size || 1
  const progressPercent = (watchedEpisodes / totalEpisodes) * 100

  // Find next unwatched episode
  const nextEpisode = await findNextUnwatchedEpisode(userId, showId)

  return {
    watchedEpisodes,
    totalEpisodes,
    progress: progressPercent,
    nextEpisode,
  }
}

async function markShowEpisodesWatched(
  userId: string,
  showId: number,
  watched: boolean = true
) {
  try {
    // Get show details including number of seasons
    const [show] = await db
      .select({ numberOfSeasons: shows.numberOfSeasons })
      .from(shows)
      .where(eq(shows.id, showId))
      .limit(1)

    if (!show || !show.numberOfSeasons) {
      console.warn(`Show ${showId} has no season data`)
      return
    }

    // Fetch all episodes for all seasons from TMDB
    const allEpisodes: Array<{ seasonNumber: number; episodeNumber: number }> =
      []

    for (let seasonNum = 1; seasonNum <= show.numberOfSeasons; seasonNum++) {
      try {
        const seasonData = await getTVShowSeason(showId, seasonNum)
        if (seasonData.episodes && seasonData.episodes.length > 0) {
          // Only mark aired episodes
          seasonData.episodes
            .filter((episode: any) => isEpisodeAired(episode.air_date))
            .forEach((episode: any) => {
              allEpisodes.push({
                seasonNumber: seasonNum,
                episodeNumber: episode.episode_number,
              })
            })
        }
      } catch (error) {
        console.error(
          `Failed to fetch season ${seasonNum} for show ${showId}:`,
          error
        )
      }
    }

    if (allEpisodes.length === 0) {
      console.warn(`No episodes found for show ${showId}`)
      return
    }

    // Prepare watch_progress records for bulk upsert
    const watchProgressRecords = allEpisodes.map((ep) => ({
      userId,
      showId,
      seasonNumber: ep.seasonNumber,
      episodeNumber: ep.episodeNumber,
      watched,
      watchedAt: watched ? new Date() : null,
    }))

    // Chunked to keep any single statement from carrying thousands of rows
    const CHUNK_SIZE = 100
    for (let i = 0; i < watchProgressRecords.length; i += CHUNK_SIZE) {
      const chunk = watchProgressRecords.slice(i, i + CHUNK_SIZE)

      await upsertWatchProgress(chunk)
    }

    console.log(
      `Successfully marked ${allEpisodes.length} episodes as ${watched ? "watched" : "unwatched"} for show ${showId}`
    )
  } catch (error) {
    console.error(`Error in markShowEpisodesWatched:`, error)
    throw error
  }
}

// Returns a specific episode's air date, refreshing that season from TMDB if
// it's missing from the cache (handles shows whose cache is stale/partial,
// which ensureEpisodesCached's whole-show check won't catch). Returns null if
// the episode can't be found even after a live check.
async function getEpisodeAirDate(
  showId: number,
  seasonNumber: number,
  episodeNumber: number
): Promise<string | null> {
  const [cached] = await db
    .select({ airDate: episodes.airDate })
    .from(episodes)
    .where(
      and(
        eq(episodes.showId, showId),
        eq(episodes.seasonNumber, seasonNumber),
        eq(episodes.episodeNumber, episodeNumber)
      )
    )
    .limit(1)

  if (cached) return cached.airDate

  try {
    const season = await getTVShowSeason(showId, seasonNumber)
    await cacheEpisodesInDatabase(showId, [season])
    const ep = (season.episodes || []).find(
      (e: any) => e.episode_number === episodeNumber
    )
    return ep?.air_date ?? null
  } catch (err) {
    console.error(
      `Failed to refresh season ${seasonNumber} for show ${showId}:`,
      err
    )
    return null
  }
}

// True when a show's episodes could have changed since we last cached them.
// A finished show whose cached episode count already matches TMDB cannot have
// moved, so its seasons don't need refetching — that's the bulk of a sweep's
// cost. Anything still running always refreshes: air dates shift for upcoming
// episodes without the episode count changing at all.
async function needsEpisodeRefresh(
  showId: number,
  tmdbShow: { status?: string; number_of_episodes?: number }
): Promise<boolean> {
  const isEnded = tmdbShow.status === "Ended" || tmdbShow.status === "Canceled"
  if (!isEnded) return true
  if (!tmdbShow.number_of_episodes) return true

  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(episodes)
      .where(eq(episodes.showId, showId))
    return row.count !== tmdbShow.number_of_episodes
  } catch {
    return true
  }
}

// Rebuild the seasons payload from the episodes table. Returns null when the
// cache can't stand in for TMDB — no rows at all, or a season missing entirely
// (a newly announced season won't be there yet).
async function readSeasonsFromCache(
  showId: number,
  seasonNums: number[]
): Promise<any[] | null> {
  // The rows come back camelCase, but this payload stands in for TMDB's, so
  // the output stays snake_case to match TMDBSeason.
  let rows: {
    seasonNumber: number
    episodeNumber: number
    name: string | null
    airDate: string | null
    runtime: number | null
    overview: string | null
    stillPath: string | null
  }[]
  try {
    rows = await db
      .select({
        seasonNumber: episodes.seasonNumber,
        episodeNumber: episodes.episodeNumber,
        name: episodes.name,
        airDate: episodes.airDate,
        runtime: episodes.runtime,
        overview: episodes.overview,
        stillPath: episodes.stillPath,
      })
      .from(episodes)
      .where(eq(episodes.showId, showId))
      .orderBy(asc(episodes.seasonNumber), asc(episodes.episodeNumber))
  } catch {
    return null
  }

  if (!rows.length) return null

  const bySeason = new Map<number, any[]>()
  for (const row of rows) {
    const list = bySeason.get(row.seasonNumber) ?? []
    list.push({
      id: `${showId}-${row.seasonNumber}-${row.episodeNumber}`,
      episode_number: row.episodeNumber,
      season_number: row.seasonNumber,
      name: row.name,
      overview: row.overview,
      still_path: row.stillPath,
      air_date: row.airDate,
      runtime: row.runtime,
    })
    bySeason.set(row.seasonNumber, list)
  }

  // A partially cached show would silently hide seasons, so fall back instead.
  if (seasonNums.some((n) => !bySeason.has(n))) return null

  return seasonNums.map((n) => ({
    id: `${showId}-${n}`,
    season_number: n,
    name: `Season ${n}`,
    overview: "",
    poster_path: null,
    air_date: bySeason.get(n)![0]?.air_date ?? null,
    episode_count: bySeason.get(n)!.length,
    episodes: bySeason.get(n)!,
  }))
}

// Ensure episodes are cached for a show (fetches from TMDB if missing). No-op if already cached.
async function ensureEpisodesCached(showId: number): Promise<void> {
  const [cachedCount] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(episodes)
    .where(eq(episodes.showId, showId))
  if (cachedCount.value > 0) return

  const selectSeasonCount = async () => {
    const [row] = await db
      .select({ numberOfSeasons: shows.numberOfSeasons })
      .from(shows)
      .where(eq(shows.id, showId))
      .limit(1)
    return row
  }

  let show = await selectSeasonCount()

  if (!show?.numberOfSeasons) {
    await upsertShowFromTmdb(showId)
    show = await selectSeasonCount()
  }

  const n = show?.numberOfSeasons
  if (!n) return

  const seasons = await Promise.all(
    Array.from({ length: n }, (_, i) => i + 1).map((s) =>
      getTVShowSeason(showId, s)
    )
  )
  await cacheEpisodesInDatabase(showId, seasons)
}

// Cache episodes in the database for faster lookups
async function cacheEpisodesInDatabase(showId: number, seasons: any[]) {
  try {
    // Typed rather than any[]: these are column names now, and an any[] here
    // silently hid the snake_case keys this used to push.
    const episodesToCache: (typeof episodes.$inferInsert)[] = []

    for (const season of seasons) {
      if (!season.episodes || season.season_number === 0) continue

      for (const episode of season.episodes) {
        episodesToCache.push({
          showId,
          seasonNumber: season.season_number,
          episodeNumber: episode.episode_number,
          name: episode.name,
          airDate: episode.air_date,
          runtime: episode.runtime,
          overview: episode.overview,
          stillPath: episode.still_path,
        })
      }
    }

    if (episodesToCache.length > 0) {
      // Upsert episodes in batches with error handling
      const CHUNK_SIZE = 100
      for (let i = 0; i < episodesToCache.length; i += CHUNK_SIZE) {
        const chunk = episodesToCache.slice(i, i + CHUNK_SIZE)

        await db
          .insert(episodes)
          .values(chunk)
          .onConflictDoUpdate({
            target: [
              episodes.showId,
              episodes.seasonNumber,
              episodes.episodeNumber,
            ],
            set: {
              name: sql`excluded.name`,
              overview: sql`excluded.overview`,
              stillPath: sql`excluded.still_path`,
              airDate: sql`excluded.air_date`,
              runtime: sql`excluded.runtime`,
            },
          })
      }
      console.log(
        `✓ Cached ${episodesToCache.length} episodes for show ${showId}`
      )
    }
  } catch (error) {
    console.error(`Error caching episodes for show ${showId}:`, error)
    throw error
  }
}

// Marking an episode watched is a statement that you are tracking the show, so
// every progress write makes sure a user_shows row exists first. Without this,
// `watch_progress` rows accumulate for shows that were never added — and
// updateInferredStatus, which UPDATEs user_shows by (user_id, show_id), matches
// zero rows and silently does nothing. Adding the show later then inherits that
// orphaned progress, arriving with a status that contradicts it.
async function ensureUserShow(userId: string, showId: number): Promise<void> {
  // Seeded, not decided: updateInferredStatus runs immediately after every
  // caller and replaces this with the status the progress actually implies.
  // onConflictDoNothing replaces a select-then-insert that could double-insert
  // when two episodes were ticked at once.
  try {
    await db
      .insert(userShows)
      .values({ userId, showId, status: "watching" })
      .onConflictDoNothing({ target: [userShows.userId, userShows.showId] })
  } catch (error) {
    console.error(`Error creating user_shows row for show ${showId}:`, error)
  }
}

// Update show status based on watch progress and show details
// This is called whenever progress changes to keep the stored status in sync
// Uses cached episodes from the database for accurate aired episode counting
async function updateInferredStatus(
  userId: string,
  showId: number
): Promise<string | null> {
  try {
    // Get show status
    const [show] = await db
      .select({ status: shows.status })
      .from(shows)
      .where(eq(shows.id, showId))
      .limit(1)

    if (!show) {
      console.log(`⚠ Show ${showId} not found, skipping status update`)
      return null
    }

    // Count watched episodes
    const [watched] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(watchProgress)
      .where(
        and(
          eq(watchProgress.userId, userId),
          eq(watchProgress.showId, showId),
          eq(watchProgress.watched, true)
        )
      )
    const watchedCount = watched?.value ?? 0

    // Count aired episodes from cached episodes table
    const now = new Date().toISOString()
    const countAired = async () => {
      const [row] = await db
        .select({ value: sql<number>`count(*)::int` })
        .from(episodes)
        .where(
          and(
            eq(episodes.showId, showId),
            ne(episodes.seasonNumber, 0), // Skip special seasons
            isNotNull(episodes.airDate),
            lte(episodes.airDate, now) // Only count aired episodes
          )
        )
      return row?.value ?? 0
    }

    let totalAiredEpisodes = await countAired()

    // If no episodes cached yet, try to fetch and cache from TMDB, then re-query
    if (totalAiredEpisodes === 0) {
      await ensureEpisodesCached(showId)
      totalAiredEpisodes = await countAired()
      if (totalAiredEpisodes === 0) {
        console.log(
          `⚠ No cached episodes for show ${showId}, skipping status update`
        )
        return null
      }
    }

    // Determine new status based on aired episodes
    const newStatus = inferShowStatus({
      tmdbStatus: show.status,
      watchedEpisodes: watchedCount,
      totalAiredEpisodes,
    })

    // Update the status in the database
    try {
      await db
        .update(userShows)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(and(eq(userShows.userId, userId), eq(userShows.showId, showId)))
    } catch (updateError) {
      console.error(
        `Error updating user_shows status for show ${showId}:`,
        updateError
      )
      return null
    }

    console.log(
      `✓ Auto-updated show ${showId} status to "${newStatus}" (${watchedCount}/${totalAiredEpisodes} aired episodes watched, show status: ${show.status})`
    )
    return newStatus
  } catch (error) {
    console.error(`Error updating inferred status:`, error)
    // Don't throw - we don't want status updates to fail progress tracking
    return null
  }
}
