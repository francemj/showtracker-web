import {
  randomBytes,
  createHash,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto"
import { promisify } from "node:util"
import { and, eq, lt, ne, sql } from "drizzle-orm"
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server"
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server"

import { db } from "./db"
import { users } from "../../packages/shared/schema"
import {
  userCredentials,
  sessions,
  webauthnCredentials,
  webauthnChallenges,
  passwordResetTokens,
} from "./schema"

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>

export const APP_URL = process.env.APP_URL ?? "http://localhost:3000"
const RP_NAME = "Showtracker"
const RP_ID = process.env.RP_ID ?? new URL(APP_URL).hostname

/**
 * Android does not send an https origin for a passkey assertion — it sends
 * `android:apk-key-hash:<base64url SHA-256 of the signing certificate>`. Unless
 * that exact string is listed, every Android passkey fails origin validation
 * while iOS and web work fine, which is a confusing way to find out.
 */
const ANDROID_ORIGIN = process.env.ANDROID_APK_KEY_HASH
  ? `android:apk-key-hash:${process.env.ANDROID_APK_KEY_HASH}`
  : null
const EXPECTED_ORIGINS = [APP_URL, ...(ANDROID_ORIGIN ? [ANDROID_ORIGIN] : [])]

const SESSION_TTL_MS = 60 * 24 * 60 * 60 * 1000
const RESET_TTL_MS = 60 * 60 * 1000
const CHALLENGE_TTL_MS = 5 * 60 * 1000
const SCRYPT_KEYLEN = 64

export type AuthUser = typeof users.$inferSelect

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

function newToken(): string {
  return randomBytes(32).toString("base64url")
}

// ---------------------------------------------------------------- passwords

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = await scrypt(password, salt, SCRYPT_KEYLEN)
  return `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`
}

async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [scheme, saltB64, hashB64] = stored.split("$")
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false

  const expected = Buffer.from(hashB64, "base64")
  const derived = await scrypt(
    password,
    Buffer.from(saltB64, "base64"),
    expected.length
  )
  return (
    derived.length === expected.length && timingSafeEqual(derived, expected)
  )
}

/**
 * A real hash of a value nobody knows. Sign-in for an address with no account
 * is verified against this so it costs the same scrypt work as a wrong password
 * on a real account — otherwise response time alone answers "does this email
 * have an account here?".
 */
let decoyHash: Promise<string> | null = null
function getDecoyHash(): Promise<string> {
  if (!decoyHash) decoyHash = hashPassword(randomBytes(32).toString("hex"))
  return decoyHash
}

/**
 * The only supported way to check an email/password pair. It owns the decoy
 * comparison above, so callers cannot accidentally reintroduce the enumeration
 * timing leak by short-circuiting on "no such user".
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<AuthUser | null> {
  const [row] = await db
    .select({ user: users, passwordHash: userCredentials.passwordHash })
    .from(users)
    .leftJoin(userCredentials, eq(userCredentials.userId, users.id))
    .where(eq(users.email, email.toLowerCase()))
    .limit(1)

  const ok = await verifyPassword(
    password,
    row?.passwordHash ?? (await getDecoyHash())
  )
  return ok && row?.passwordHash ? row.user : null
}

export async function setPassword(
  userId: string,
  password: string
): Promise<void> {
  const passwordHash = await hashPassword(password)
  await db
    .insert(userCredentials)
    .values({ userId, passwordHash })
    .onConflictDoUpdate({
      target: userCredentials.userId,
      set: { passwordHash, updatedAt: new Date() },
    })
}

// ----------------------------------------------------------------- sessions

export async function createSession(
  userId: string
): Promise<{ token: string; expiresAt: Date }> {
  const token = newToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await db
    .insert(sessions)
    .values({ userId, tokenHash: sha256(token), expiresAt })
  return { token, expiresAt }
}

export async function resolveSession(token: string): Promise<AuthUser | null> {
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.tokenHash, sha256(token)))
    .limit(1)

  if (!row) return null

  if (row.session.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, row.session.id))
    return null
  }

  // Slide the window once a session is past halfway through its life, so an
  // app in daily use never expires under someone — without a write per request.
  const remaining = row.session.expiresAt.getTime() - Date.now()
  if (remaining < SESSION_TTL_MS / 2) {
    await db
      .update(sessions)
      .set({
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
        lastUsedAt: new Date(),
      })
      .where(eq(sessions.id, row.session.id))
  }

  return row.user
}

export async function revokeSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)))
}

/**
 * Used after a password change. `exceptToken` keeps the caller signed in on the
 * device they just changed it from; every other session dies, which is the
 * entire point of resetting a password you believe is compromised.
 */
export async function revokeAllSessions(
  userId: string,
  exceptToken?: string
): Promise<void> {
  const scope = exceptToken
    ? and(
        eq(sessions.userId, userId),
        ne(sessions.tokenHash, sha256(exceptToken))
      )
    : eq(sessions.userId, userId)
  await db.delete(sessions).where(scope)
}

// ------------------------------------------------------------ reset tokens

export async function createPasswordResetToken(
  userId: string
): Promise<string> {
  const token = newToken()
  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  })
  return token
}

/**
 * Marks the token used and returns its owner, or null. The used/expiry check is
 * part of the UPDATE rather than a prior SELECT, so two simultaneous uses of
 * the same link cannot both pass — only one row is affected.
 */
export async function consumePasswordResetToken(
  token: string
): Promise<string | null> {
  const [row] = await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokens.tokenHash, sha256(token)),
        sql`${passwordResetTokens.usedAt} IS NULL`,
        sql`${passwordResetTokens.expiresAt} > NOW()`
      )
    )
    .returning({ userId: passwordResetTokens.userId })

  return row?.userId ?? null
}

// -------------------------------------------------------------- passkeys

async function storeChallenge(
  challenge: string,
  kind: "registration" | "authentication",
  userId: string | null
): Promise<string> {
  await db
    .delete(webauthnChallenges)
    .where(lt(webauthnChallenges.expiresAt, new Date()))

  const [row] = await db
    .insert(webauthnChallenges)
    .values({
      challenge,
      kind,
      userId,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    })
    .returning({ id: webauthnChallenges.id })

  return row.id
}

/** Deletes as it reads, so a challenge can never be presented twice. */
async function consumeChallenge(
  id: string,
  kind: "registration" | "authentication"
): Promise<{ challenge: string; userId: string | null } | null> {
  const [row] = await db
    .delete(webauthnChallenges)
    .where(
      and(
        eq(webauthnChallenges.id, id),
        eq(webauthnChallenges.kind, kind),
        sql`${webauthnChallenges.expiresAt} > NOW()`
      )
    )
    .returning({
      challenge: webauthnChallenges.challenge,
      userId: webauthnChallenges.userId,
    })

  return row ?? null
}

export async function startPasskeyRegistration(user: AuthUser) {
  const existing = await db
    .select({
      id: webauthnCredentials.id,
      transports: webauthnCredentials.transports,
    })
    .from(webauthnCredentials)
    .where(eq(webauthnCredentials.userId, user.id))

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: user.email,
    userDisplayName: user.name ?? user.email,
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({
      id: c.id,
      transports: c.transports ?? undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  })

  const challengeId = await storeChallenge(
    options.challenge,
    "registration",
    user.id
  )
  return { challengeId, options }
}

export async function finishPasskeyRegistration(
  userId: string,
  challengeId: string,
  response: RegistrationResponseJSON,
  name?: string
): Promise<boolean> {
  const pending = await consumeChallenge(challengeId, "registration")
  if (!pending || pending.userId !== userId) return false

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: pending.challenge,
    expectedOrigin: EXPECTED_ORIGINS,
    expectedRPID: RP_ID,
  })

  if (!verification.verified) return false

  const { credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo

  await db.insert(webauthnCredentials).values({
    id: credential.id,
    userId,
    publicKey: Buffer.from(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports ?? null,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    name: name ?? null,
  })

  return true
}

export async function startPasskeyAuthentication() {
  // No allowCredentials: the account is unknown until the authenticator
  // answers, which is what makes a passkey a one-tap sign-in rather than a
  // second step after typing an email.
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "preferred",
  })

  const challengeId = await storeChallenge(
    options.challenge,
    "authentication",
    null
  )
  return { challengeId, options }
}

export async function finishPasskeyAuthentication(
  challengeId: string,
  response: AuthenticationResponseJSON
): Promise<AuthUser | null> {
  const pending = await consumeChallenge(challengeId, "authentication")
  if (!pending) return null

  const [stored] = await db
    .select({ credential: webauthnCredentials, user: users })
    .from(webauthnCredentials)
    .innerJoin(users, eq(users.id, webauthnCredentials.userId))
    .where(eq(webauthnCredentials.id, response.id))
    .limit(1)

  if (!stored) return null

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: pending.challenge,
    expectedOrigin: EXPECTED_ORIGINS,
    expectedRPID: RP_ID,
    credential: {
      id: stored.credential.id,
      publicKey: new Uint8Array(stored.credential.publicKey),
      counter: stored.credential.counter,
      transports: stored.credential.transports ?? undefined,
    },
  })

  if (!verification.verified) return null

  await db
    .update(webauthnCredentials)
    .set({
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: new Date(),
    })
    .where(eq(webauthnCredentials.id, stored.credential.id))

  return stored.user
}

export async function listPasskeys(userId: string) {
  return db
    .select({
      id: webauthnCredentials.id,
      name: webauthnCredentials.name,
      createdAt: webauthnCredentials.createdAt,
      lastUsedAt: webauthnCredentials.lastUsedAt,
    })
    .from(webauthnCredentials)
    .where(eq(webauthnCredentials.userId, userId))
}

export async function deletePasskey(
  userId: string,
  credentialId: string
): Promise<boolean> {
  const deleted = await db
    .delete(webauthnCredentials)
    .where(
      and(
        eq(webauthnCredentials.id, credentialId),
        eq(webauthnCredentials.userId, userId)
      )
    )
    .returning({ id: webauthnCredentials.id })

  return deleted.length > 0
}
