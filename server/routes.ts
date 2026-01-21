import type { Express, NextFunction, Request, Response } from "express"
import { createServer, type Server } from "http"
import { supabase } from "./lib/supabase"
import { searchTVShows, getTVShowDetails, getTVShowSeason } from "./lib/tmdb"
import { getUserFromAccessToken } from "./lib/auth0"

interface AuthRequest extends Request {
  userId?: string
}

const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing authorization token" })
  }

  const token = authHeader.slice(7)
  try {
    const auth0User = await getUserFromAccessToken(token)
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("auth0_id", auth0User.sub)
      .single()

    if (!user) {
      return res.status(401).json({ message: "User not found" })
    }
    req.userId = user.id
    next()
  } catch {
    return res.status(401).json({ message: "Invalid token" })
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/callback", async (req: Request, res: Response) => {
    try {
      const { access_token } = req.body
      if (!access_token || typeof access_token !== "string") {
        return res.status(400).json({ message: "Missing access_token" })
      }

      const auth0User = await getUserFromAccessToken(access_token)
      const { sub, email, name, picture } = auth0User

      // 1) Find by auth0_id (existing Auth0 or migrated user)
      const { data: existingByAuth0 } = await supabase
        .from("users")
        .select("*")
        .eq("auth0_id", sub)
        .single()

      if (existingByAuth0) {
        return res.json({ user: existingByAuth0 })
      }

      // 2) Legacy: same email with local_ auth0_id — link this Auth0 account to existing Supabase user
      if (email) {
        const { data: legacy } = await supabase
          .from("users")
          .select("*")
          .eq("email", email)
          .like("auth0_id", "local_%")
          .limit(1)
          .maybeSingle()

        if (legacy) {
          const { error: updateErr } = await supabase
            .from("users")
            .update({ auth0_id: sub, picture: picture || legacy.picture })
            .eq("id", legacy.id)

          if (!updateErr) {
            await supabase
              .from("user_credentials")
              .delete()
              .eq("user_id", legacy.id)
            return res.json({
              user: {
                ...legacy,
                auth0_id: sub,
                picture: picture || legacy.picture,
              },
            })
          }
        }
      }

      // 3) New user
      const { data: newUser, error: insertErr } = await supabase
        .from("users")
        .insert({
          email: email || `${sub.replace(/[^a-zA-Z0-9]/g, "_")}@auth0.local`,
          name: name || "User",
          auth0_id: sub,
          picture:
            picture ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&background=6366F1&color=fff`,
        })
        .select()
        .single()

      if (insertErr || !newUser) {
        console.error("Supabase insert failed:", insertErr)
        return res.status(500).json({ message: "Failed to create user" })
      }

      res.json({ user: newUser })
    } catch (error: any) {
      console.error("Auth callback error:", error)
      const status = error.message?.includes("Invalid or expired") ? 401 : 500
      res
        .status(status)
        .json({ message: error.message || "Authentication failed" })
    }
  })

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Not authenticated" })
      }

      const token = authHeader.slice(7)
      const auth0User = await getUserFromAccessToken(token)

      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("auth0_id", auth0User.sub)
        .single()

      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }

      res.json({ user })
    } catch (error) {
      console.error("Auth check error:", error)
      const isAuthError = (error as Error)?.message?.includes(
        "Invalid or expired"
      )
      res.status(isAuthError ? 401 : 500).json({
        message: isAuthError ? "Invalid token" : "Internal server error",
      })
    }
  })

  app.post("/api/auth/logout", (_req: Request, res: Response) => {
    res.json({ message: "Logged out" })
  })

  // Search shows
  app.get(
    "/api/search/shows/:query",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const { query } = req.params
        if (!query) {
          return res.status(400).json({ message: "Query parameter required" })
        }

        const results = await searchTVShows(query)
        res.json(results)
      } catch (error) {
        console.error("Search error:", error)
        res.status(500).json({ message: "Failed to search shows" })
      }
    }
  )

  // Get user stats
  app.get(
    "/api/stats",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const { data: userShows } = await supabase
          .from("user_shows")
          .select("status")
          .eq("user_id", req.userId)

        const { count: episodesWatched } = await supabase
          .from("watch_progress")
          .select("*", { count: "exact", head: true })
          .eq("user_id", req.userId)
          .eq("watched", true)

        const stats = {
          totalShows: userShows?.length || 0,
          watchingShows:
            userShows?.filter((s) => s.status === "watching").length || 0,
          completedShows:
            userShows?.filter((s) => s.status === "completed").length || 0,
          episodesWatched: episodesWatched || 0,
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
        const { data: userShows } = await supabase
          .from("user_shows")
          .select("show_id, status")
          .eq("user_id", req.userId)

        // Map snake_case to camelCase for frontend
        const mappedShows = (userShows || []).map((us: any) => ({
          showId: us.show_id,
          status: us.status,
        }))

        res.json(mappedShows)
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
      const userId = req.userId!

      res.status(202).json({ message: "Validation started" })

      setImmediate(async () => {
        try {
          let query = supabase
            .from("user_shows")
            .select("show_id")
            .eq("user_id", userId)
            .neq("status", "completed")

          if (scope === "caught_up_only") {
            query = query.eq("status", "caught_up")
          }

          const { data: rows, error } = await query

          if (error || !rows?.length) {
            if (error) console.error("validate-status: fetch user_shows", error)
            return
          }

          for (const row of rows) {
            const showId = row.show_id as number
            try {
              const tmdbShow = await upsertShowFromTmdb(showId)
              if (tmdbShow?.number_of_seasons) {
                const seasons = await Promise.all(
                  Array.from(
                    { length: tmdbShow.number_of_seasons },
                    (_, i) => i + 1
                  ).map((n) => getTVShowSeason(showId, n))
                )
                await cacheEpisodesInDatabase(showId, seasons)
              }
              await updateInferredStatus(userId, showId)
            } catch (err: any) {
              console.error(`validate-status: show ${showId}`, err?.message)
            }
          }
        } catch (err: any) {
          console.error("validate-status: run failed", err)
        }
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
        const { data: userShow, error } = await supabase
          .from("user_shows")
          .insert({
            user_id: req.userId,
            show_id: showId,
            status: initialStatus || "want_to_watch",
          })
          .select()
          .single()

        if (error) {
          return res.status(500).json({ message: "Failed to add show" })
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

  // Get shows by status
  app.get(
    "/api/shows/watching",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const shows = await getShowsWithProgress(req.userId!, "watching", true)
        res.json(shows)
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
        const shows = await getShowsWithProgress(req.userId!, "completed")
        res.json(shows)
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
        const shows = await getShowsWithProgress(req.userId!, "want_to_watch")
        res.json(shows)
      } catch (error) {
        console.error("Get want to watch shows error:", error)
        res.status(500).json({ message: "Failed to get shows" })
      }
    }
  )

  app.get(
    "/api/shows/caught-up",
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
      try {
        const shows = await getShowsWithProgress(req.userId!, "caught_up")

        // Enhance with next episode info (when available)
        const showsWithNext = await Promise.all(
          shows.map(async (show) => {
            const nextEp = await getNextUnairedEpisode(show.id)
            return {
              ...show,
              nextEpisode: nextEp,
            }
          })
        )

        res.json(showsWithNext)
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

        const { data: show } = await supabase
          .from("shows")
          .select("*")
          .eq("id", parseInt(id))
          .single()

        if (!show) {
          const tmdbShow = await getTVShowDetails(parseInt(id))
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
          const tmdbShow = await getTVShowDetails(parseInt(id))
          await supabase.from("shows").upsert({
            id: tmdbShow.id,
            name: tmdbShow.name,
            overview: tmdbShow.overview,
            poster_path: tmdbShow.poster_path,
            backdrop_path: tmdbShow.backdrop_path,
            first_air_date: tmdbShow.first_air_date,
            vote_average: tmdbShow.vote_average?.toString(),
            number_of_seasons: tmdbShow.number_of_seasons,
            number_of_episodes: tmdbShow.number_of_episodes,
            status: tmdbShow.status,
            genres: tmdbShow.genres?.map((g: any) => g.name),
            tmdb_data: tmdbShow,
          })
          show.status = tmdbShow.status
        }

        const { data: userShow } = await supabase
          .from("user_shows")
          .select("*")
          .eq("user_id", req.userId)
          .eq("show_id", parseInt(id))
          .single()

        const progress = await calculateShowProgress(req.userId!, parseInt(id))

        // Map snake_case database fields to camelCase for frontend
        res.json({
          id: show.id,
          name: show.name,
          overview: show.overview,
          posterPath: show.poster_path,
          backdropPath: show.backdrop_path,
          firstAirDate: show.first_air_date,
          voteAverage: show.vote_average,
          numberOfSeasons: show.number_of_seasons,
          numberOfEpisodes: show.number_of_episodes,
          status: show.status,
          genres: show.genres,
          tmdbData: show.tmdb_data,
          lastUpdated: show.last_updated,
          userShow: userShow
            ? {
                id: userShow.id,
                userId: userShow.user_id,
                showId: userShow.show_id,
                status: userShow.status,
                rating: userShow.rating,
                notes: userShow.notes,
                addedAt: userShow.added_at,
                updatedAt: userShow.updated_at,
              }
            : null,
          ...progress,
        })
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

        const { data: show } = await supabase
          .from("shows")
          .select("number_of_seasons")
          .eq("id", parseInt(id))
          .single()

        if (!show || !show.number_of_seasons) {
          return res.json([])
        }

        const seasons = await Promise.all(
          Array.from({ length: show.number_of_seasons }, (_, i) => i + 1).map(
            async (seasonNum) => {
              return await getTVShowSeason(parseInt(id), seasonNum)
            }
          )
        )

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

        const { data: progress } = await supabase
          .from("watch_progress")
          .select("season_number, episode_number, watched")
          .eq("user_id", req.userId)
          .eq("show_id", parseInt(id))

        // Map snake_case to camelCase for frontend
        const mappedProgress = (progress || []).map((p: any) => ({
          seasonNumber: p.season_number,
          episodeNumber: p.episode_number,
          watched: p.watched,
        }))

        res.json(mappedProgress)
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
        const { seasonNumber, episodeNumber, watched } = req.body
        const showId = parseInt(id)

        const { error } = await supabase.from("watch_progress").upsert(
          {
            user_id: req.userId,
            show_id: showId,
            season_number: seasonNumber,
            episode_number: episodeNumber,
            watched,
            watched_at: watched ? new Date().toISOString() : null,
          },
          {
            onConflict: "user_id,show_id,season_number,episode_number",
          }
        )

        if (error) {
          return res.status(500).json({ message: "Failed to update progress" })
        }

        // Ensure user_shows exists so updateInferredStatus can update it
        const { data: existing } = await supabase
          .from("user_shows")
          .select("id")
          .eq("user_id", req.userId)
          .eq("show_id", showId)
          .maybeSingle()

        if (!existing) {
          await supabase.from("user_shows").insert({
            user_id: req.userId,
            show_id: showId,
            status: "watching",
          })
        }

        // Update inferred status in background (don't wait)
        updateInferredStatus(req.userId!, showId).catch((err) =>
          console.error("Background status update failed:", err)
        )

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
        const now = new Date()
        const airedEpisodes = season.episodes.filter(
          (ep: any) => ep.air_date && new Date(ep.air_date) <= now
        )

        // Upsert aired episodes only
        const progressRecords = airedEpisodes.map((ep: any) => ({
          user_id: req.userId,
          show_id: parseInt(id),
          season_number: parseInt(seasonNumber),
          episode_number: ep.episode_number,
          watched,
          watched_at: watched ? new Date().toISOString() : null,
        }))

        const { error } = await supabase
          .from("watch_progress")
          .upsert(progressRecords, {
            onConflict: "user_id,show_id,season_number,episode_number",
          })

        if (error) {
          return res.status(500).json({ message: "Failed to update season" })
        }

        // Update inferred status in background (don't wait)
        updateInferredStatus(req.userId!, parseInt(id)).catch((err) =>
          console.error("Background status update failed:", err)
        )

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
        const { episodes } = req.body

        if (!Array.isArray(episodes) || episodes.length === 0) {
          return res.status(400).json({ message: "Episodes array is required" })
        }

        // Create progress records for all episodes
        const progressRecords = episodes.map((ep: any) => ({
          user_id: req.userId,
          show_id: parseInt(id),
          season_number: ep.seasonNumber,
          episode_number: ep.episodeNumber,
          watched: ep.watched,
          watched_at: ep.watched ? new Date().toISOString() : null,
        }))

        // Batch upsert all episodes (specify composite key for conflict resolution)
        const { error } = await supabase
          .from("watch_progress")
          .upsert(progressRecords, {
            onConflict: "user_id,show_id,season_number,episode_number",
          })

        if (error) {
          console.error("Bulk progress update error:", error)
          return res.status(500).json({ message: "Failed to update progress" })
        }

        // Update inferred status in background (don't wait)
        updateInferredStatus(req.userId!, parseInt(id)).catch((err) =>
          console.error("Background status update failed:", err)
        )

        res.json({ success: true, count: episodes.length })
      } catch (error) {
        console.error("Bulk update progress error:", error)
        res.status(500).json({ message: "Failed to update progress" })
      }
    }
  )

  const httpServer = createServer(app)
  return httpServer
}

async function upsertShowFromTmdb(showId: number) {
  const tmdbShow = await getTVShowDetails(showId)
  const { error: showError } = await supabase.from("shows").upsert({
    id: tmdbShow.id,
    name: tmdbShow.name,
    overview: tmdbShow.overview,
    poster_path: tmdbShow.poster_path,
    backdrop_path: tmdbShow.backdrop_path,
    first_air_date: tmdbShow.first_air_date,
    vote_average: tmdbShow.vote_average?.toString(),
    number_of_seasons: tmdbShow.number_of_seasons,
    number_of_episodes: tmdbShow.number_of_episodes,
    status: tmdbShow.status,
    genres: tmdbShow.genres?.map((g: any) => g.name),
    tmdb_data: tmdbShow,
  })
  if (showError) {
    console.error("Show upsert error:", showError)
  }
  return tmdbShow
}

// Get next unaired episode for a show (for caught-up shows)
async function getNextUnairedEpisode(showId: number) {
  try {
    const now = new Date().toISOString()
    const { data: nextEpisode } = await supabase
      .from("episodes")
      .select("season_number, episode_number, air_date")
      .eq("show_id", showId)
      .neq("season_number", 0) // Skip specials
      .gt("air_date", now) // Future episodes only
      .order("air_date", { ascending: true })
      .limit(1)
      .single()

    if (!nextEpisode) {
      return null
    }

    // Calculate days until air
    const airDate = new Date(nextEpisode.air_date)
    const nowDate = new Date()
    const diffTime = airDate.getTime() - nowDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return {
      season: nextEpisode.season_number,
      episode: nextEpisode.episode_number,
      airDate: nextEpisode.air_date,
      daysUntil: diffDays,
    }
  } catch (error) {
    console.error("Error fetching next unaired episode:", error)
    // Single query returns error if no rows, so just return null
    return null
  }
}

async function getShowsWithProgress(
  userId: string,
  status: string,
  sortByRecentWatch: boolean = false
) {
  const query = supabase
    .from("user_shows")
    .select("*, shows(*)")
    .eq("user_id", userId)
    .eq("status", status)

  if (sortByRecentWatch) {
    // For watching shows, we want to sort by most recent watch activity
    // We'll get the data first, then sort in memory
    const { data: userShows } = await query

    if (!userShows || userShows.length === 0) {
      return []
    }

    // Get most recent watch timestamp for each show
    const showsWithTimestamps = await Promise.all(
      userShows.map(async (us: any) => {
        const { data: recentWatch } = await supabase
          .from("watch_progress")
          .select("updated_at")
          .eq("user_id", userId)
          .eq("show_id", us.show_id)
          .eq("watched", true)
          .order("updated_at", { ascending: false })
          .limit(1)
          .single()

        return {
          ...us,
          mostRecentWatch: recentWatch?.updated_at || us.updated_at,
        }
      })
    )

    // Sort by most recent watch
    showsWithTimestamps.sort((a, b) => {
      const dateA = new Date(a.mostRecentWatch).getTime()
      const dateB = new Date(b.mostRecentWatch).getTime()
      return dateB - dateA // Descending
    })

    const shows = await Promise.all(
      showsWithTimestamps.map(async (us: any) => {
        const progress = await calculateShowProgress(userId, us.show_id)
        const show = us.shows

        // Map snake_case database fields to camelCase for frontend
        return {
          id: show.id,
          name: show.name,
          overview: show.overview,
          posterPath: show.poster_path,
          backdropPath: show.backdrop_path,
          firstAirDate: show.first_air_date,
          voteAverage: show.vote_average,
          numberOfSeasons: show.number_of_seasons,
          numberOfEpisodes: show.number_of_episodes,
          status: show.status,
          genres: show.genres,
          tmdbData: show.tmdb_data,
          lastUpdated: show.last_updated,
          userShow: {
            id: us.id,
            userId: us.user_id,
            showId: us.show_id,
            status: us.status,
            rating: us.rating,
            notes: us.notes,
            addedAt: us.added_at,
            updatedAt: us.updated_at,
          },
          ...progress,
        }
      })
    )

    return shows
  } else {
    // Normal sorting by updated_at
    const { data: userShows } = await query.order("updated_at", {
      ascending: false,
    })

    const shows = await Promise.all(
      (userShows || []).map(async (us: any) => {
        const progress = await calculateShowProgress(userId, us.show_id)
        const show = us.shows

        // Map snake_case database fields to camelCase for frontend
        return {
          id: show.id,
          name: show.name,
          overview: show.overview,
          posterPath: show.poster_path,
          backdropPath: show.backdrop_path,
          firstAirDate: show.first_air_date,
          voteAverage: show.vote_average,
          numberOfSeasons: show.number_of_seasons,
          numberOfEpisodes: show.number_of_episodes,
          status: show.status,
          genres: show.genres,
          tmdbData: show.tmdb_data,
          lastUpdated: show.last_updated,
          userShow: {
            id: us.id,
            userId: us.user_id,
            showId: us.show_id,
            status: us.status,
            rating: us.rating,
            notes: us.notes,
            addedAt: us.added_at,
            updatedAt: us.updated_at,
          },
          ...progress,
        }
      })
    )

    return shows
  }
}

async function findNextUnwatchedEpisode(userId: string, showId: number) {
  try {
    // Get show details to know how many seasons
    const { data: show } = await supabase
      .from("shows")
      .select("number_of_seasons")
      .eq("id", showId)
      .single()

    if (!show || !show.number_of_seasons) {
      return null
    }

    // Get all watched episodes for this show
    const { data: watchedProgress } = await supabase
      .from("watch_progress")
      .select("season_number, episode_number")
      .eq("user_id", userId)
      .eq("show_id", showId)
      .eq("watched", true)

    const watchedSet = new Set(
      (watchedProgress || []).map(
        (w: any) => `${w.season_number}-${w.episode_number}`
      )
    )

    // Iterate through seasons to find first unwatched episode
    for (let seasonNum = 1; seasonNum <= show.number_of_seasons; seasonNum++) {
      try {
        const seasonData = await getTVShowSeason(showId, seasonNum)
        if (seasonData.episodes && seasonData.episodes.length > 0) {
          for (const episode of seasonData.episodes) {
            const key = `${seasonNum}-${episode.episode_number}`
            if (!watchedSet.has(key)) {
              return {
                seasonNumber: seasonNum,
                episodeNumber: episode.episode_number,
                name: episode.name,
                airDate: episode.air_date,
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
  const { data: show } = await supabase
    .from("shows")
    .select("number_of_episodes")
    .eq("id", showId)
    .single()

  const { data: progress } = await supabase
    .from("watch_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("show_id", showId)
    .eq("watched", true)

  const watchedEpisodes = progress?.length || 0
  const totalEpisodes = show?.number_of_episodes || 1
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
    const { data: show } = await supabase
      .from("shows")
      .select("number_of_seasons")
      .eq("id", showId)
      .single()

    if (!show || !show.number_of_seasons) {
      console.warn(`Show ${showId} has no season data`)
      return
    }

    // Fetch all episodes for all seasons from TMDB
    const allEpisodes: Array<{ seasonNumber: number; episodeNumber: number }> =
      []

    for (let seasonNum = 1; seasonNum <= show.number_of_seasons; seasonNum++) {
      try {
        const seasonData = await getTVShowSeason(showId, seasonNum)
        if (seasonData.episodes && seasonData.episodes.length > 0) {
          seasonData.episodes.forEach((episode: any) => {
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
      user_id: userId,
      show_id: showId,
      season_number: ep.seasonNumber,
      episode_number: ep.episodeNumber,
      watched,
      watched_at: watched ? new Date().toISOString() : null,
    }))

    // Batch upsert in chunks of 100 to respect Supabase limits
    const CHUNK_SIZE = 100
    for (let i = 0; i < watchProgressRecords.length; i += CHUNK_SIZE) {
      const chunk = watchProgressRecords.slice(i, i + CHUNK_SIZE)

      const { error } = await supabase.from("watch_progress").upsert(chunk, {
        onConflict: "user_id,show_id,season_number,episode_number",
      })

      if (error) {
        console.error(`Failed to upsert watch progress chunk:`, error)
        throw error
      }
    }

    console.log(
      `Successfully marked ${allEpisodes.length} episodes as ${watched ? "watched" : "unwatched"} for show ${showId}`
    )
  } catch (error) {
    console.error(`Error in markShowEpisodesWatched:`, error)
    throw error
  }
}

// Ensure episodes are cached for a show (fetches from TMDB if missing). No-op if already cached.
async function ensureEpisodesCached(showId: number): Promise<void> {
  const { count } = await supabase
    .from("episodes")
    .select("*", { count: "exact", head: true })
    .eq("show_id", showId)
  if ((count ?? 0) > 0) return

  let { data: show } = await supabase
    .from("shows")
    .select("number_of_seasons")
    .eq("id", showId)
    .single()

  if (!show?.number_of_seasons) {
    await upsertShowFromTmdb(showId)
    const r = await supabase
      .from("shows")
      .select("number_of_seasons")
      .eq("id", showId)
      .single()
    show = r.data
  }

  const n = show?.number_of_seasons
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
    const episodesToCache: any[] = []

    for (const season of seasons) {
      if (!season.episodes || season.season_number === 0) continue

      for (const episode of season.episodes) {
        episodesToCache.push({
          show_id: showId,
          season_number: season.season_number,
          episode_number: episode.episode_number,
          name: episode.name,
          air_date: episode.air_date,
          runtime: episode.runtime,
          overview: episode.overview,
          still_path: episode.still_path,
        })
      }
    }

    if (episodesToCache.length > 0) {
      // Upsert episodes in batches with error handling
      const CHUNK_SIZE = 100
      for (let i = 0; i < episodesToCache.length; i += CHUNK_SIZE) {
        const chunk = episodesToCache.slice(i, i + CHUNK_SIZE)

        const { error } = await supabase.from("episodes").upsert(chunk, {
          onConflict: "show_id,season_number,episode_number",
        })

        if (error) {
          console.error(
            `Failed to cache episodes chunk for show ${showId}:`,
            error
          )
          throw error
        }
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

// Update show status based on watch progress and show details
// This is called whenever progress changes to keep the stored status in sync
// Uses cached episodes from the database for accurate aired episode counting
async function updateInferredStatus(userId: string, showId: number) {
  try {
    // Get show status
    const { data: show } = await supabase
      .from("shows")
      .select("status")
      .eq("id", showId)
      .single()

    if (!show) {
      console.log(`⚠ Show ${showId} not found, skipping status update`)
      return
    }

    // Count watched episodes
    const { data: watchedProgress } = await supabase
      .from("watch_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("show_id", showId)
      .eq("watched", true)

    const watchedCount = watchedProgress?.length || 0

    // Count aired episodes from cached episodes table
    const now = new Date().toISOString()
    const { count: airedCount, error: countError } = await supabase
      .from("episodes")
      .select("*", { count: "exact" })
      .eq("show_id", showId)
      .neq("season_number", 0) // Skip special seasons
      .lte("air_date", now) // Only count aired episodes
      .not("air_date", "is", null)

    if (countError) {
      console.error(
        `Error counting aired episodes for show ${showId}:`,
        countError
      )
      return
    }

    let totalAiredEpisodes = airedCount || 0

    // If no episodes cached yet, try to fetch and cache from TMDB, then re-query
    if (totalAiredEpisodes === 0) {
      await ensureEpisodesCached(showId)
      const { count: airedCount2, error: countError2 } = await supabase
        .from("episodes")
        .select("*", { count: "exact", head: true })
        .eq("show_id", showId)
        .neq("season_number", 0)
        .lte("air_date", now)
        .not("air_date", "is", null)
      if (!countError2) totalAiredEpisodes = airedCount2 ?? 0
      if (totalAiredEpisodes === 0) {
        console.log(
          `⚠ No cached episodes for show ${showId}, skipping status update`
        )
        return
      }
    }

    // Determine new status based on aired episodes
    let newStatus: string

    const isShowEnded = show.status === "Ended" || show.status === "Canceled"
    const allAiredWatched =
      totalAiredEpisodes > 0 && watchedCount >= totalAiredEpisodes

    if (watchedCount === 0) {
      // No episodes watched → Want to Watch
      newStatus = "want_to_watch"
    } else if (isShowEnded && allAiredWatched) {
      // Show ended/canceled and all aired episodes watched → Completed
      newStatus = "completed"
    } else if (!isShowEnded && allAiredWatched) {
      // Show still airing and all aired episodes watched → Caught Up
      newStatus = "caught_up"
    } else {
      // Some episodes watched but not all → Watching
      newStatus = "watching"
    }

    // Update the status in the database
    const { error: updateError } = await supabase
      .from("user_shows")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("show_id", showId)

    if (updateError) {
      console.error(
        `Error updating user_shows status for show ${showId}:`,
        updateError
      )
      return
    }

    console.log(
      `✓ Auto-updated show ${showId} status to "${newStatus}" (${watchedCount}/${totalAiredEpisodes} aired episodes watched, show status: ${show.status})`
    )
  } catch (error) {
    console.error(`Error updating inferred status:`, error)
    // Don't throw - we don't want status updates to fail progress tracking
  }
}
