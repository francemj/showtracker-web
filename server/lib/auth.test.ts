import "../env-config"

import test, { before, after, describe } from "node:test"
import assert from "node:assert/strict"
import { eq } from "drizzle-orm"

import { db } from "./db"
import { users } from "../../packages/shared/schema"
import { sessions, passwordResetTokens, webauthnChallenges } from "./schema"
import type { AuthenticationResponseJSON } from "@simplewebauthn/server"

import {
  consumePasswordResetToken,
  finishPasskeyAuthentication,
  startPasskeyAuthentication,
  createPasswordResetToken,
  createSession,
  hashPassword,
  resolveSession,
  revokeAllSessions,
  revokeSession,
  setPassword,
  verifyCredentials,
} from "./auth"

/**
 * These cover the failures that are silent: a logout that doesn't revoke, a
 * reset link that works twice, a password change that leaves other sessions
 * alive. None of them produce a type error or a failed build, so this file is
 * the only thing standing between them and production.
 *
 * Needs a Postgres with database-schema.sql applied — DATABASE_URL from
 * .env.development locally, or the service container in CI.
 */

const PASSWORD = "correct-horse-battery"
const email = `auth-test-${Date.now()}@example.invalid`
let userId: string

before(async () => {
  const [user] = await db
    .insert(users)
    .values({ email, name: "Auth Test" })
    .returning()
  userId = user.id
  await setPassword(userId, PASSWORD)
})

after(async () => {
  await db.delete(users).where(eq(users.id, userId))
})

describe("passwords", () => {
  test("the same password hashes differently every time", async () => {
    assert.notEqual(await hashPassword(PASSWORD), await hashPassword(PASSWORD))
  })

  test("accepts the right password", async () => {
    const user = await verifyCredentials(email, PASSWORD)
    assert.equal(user?.id, userId)
  })

  test("rejects the wrong password", async () => {
    assert.equal(await verifyCredentials(email, "not-the-password"), null)
  })

  test("rejects an email with no account", async () => {
    assert.equal(
      await verifyCredentials("nobody@example.invalid", PASSWORD),
      null
    )
  })

  test("an unknown email still costs a password comparison", async () => {
    // The point is that it does not return early. scrypt at these parameters
    // takes tens of milliseconds; a short-circuit would come back in ~1ms and
    // turn response time into an account-existence oracle. The bound is
    // deliberately loose so this fails on a regression, not on a slow machine.
    const started = process.hrtime.bigint()
    await verifyCredentials("nobody@example.invalid", PASSWORD)
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6
    assert.ok(elapsedMs > 10, `returned in ${elapsedMs.toFixed(1)}ms`)
  })
})

describe("sessions", () => {
  test("a fresh session resolves to its user", async () => {
    const { token } = await createSession(userId)
    assert.equal((await resolveSession(token))?.id, userId)
  })

  test("the raw token is never stored", async () => {
    const { token } = await createSession(userId)
    const rows = await db
      .select({ tokenHash: sessions.tokenHash })
      .from(sessions)
      .where(eq(sessions.userId, userId))
    assert.ok(rows.length > 0)
    assert.ok(rows.every((r) => r.tokenHash !== token))
  })

  test("expiry survives the database's timezone", async () => {
    // Drizzle's plain timestamp() drops the offset when reading a TIMESTAMPTZ
    // back, reinterpreting the server's local wall clock as UTC. Nothing else
    // in the suite notices: a session skewed by a few hours is still valid for
    // 60 days. Left alone it expires sessions early on any non-UTC database.
    await revokeAllSessions(userId)
    const { expiresAt } = await createSession(userId)
    const [row] = await db
      .select({ expiresAt: sessions.expiresAt })
      .from(sessions)
      .where(eq(sessions.userId, userId))

    assert.equal(
      row.expiresAt.getTime(),
      expiresAt.getTime(),
      "stored expiry drifted from the instant it was written"
    )
  })

  test("logout revokes server-side, not just on the client", async () => {
    const { token } = await createSession(userId)
    await revokeSession(token)
    assert.equal(await resolveSession(token), null)
  })

  test("an expired session is refused and cleaned up", async () => {
    // Clear first so the row this test back-dates is unambiguously its own —
    // earlier tests leave live sessions on the same user.
    await revokeAllSessions(userId)
    const { token } = await createSession(userId)
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(sessions.userId, userId))

    assert.equal(await resolveSession(token), null)
    const remaining = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.userId, userId))
    assert.equal(remaining.length, 0)
  })

  test("revoking all sessions can spare the current one", async () => {
    const keep = await createSession(userId)
    const other = await createSession(userId)

    await revokeAllSessions(userId, keep.token)

    assert.equal((await resolveSession(keep.token))?.id, userId)
    assert.equal(await resolveSession(other.token), null)
  })
})

describe("password reset", () => {
  test("a token works exactly once", async () => {
    const token = await createPasswordResetToken(userId)
    assert.equal(await consumePasswordResetToken(token), userId)
    assert.equal(await consumePasswordResetToken(token), null)
  })

  test("an expired token is refused", async () => {
    const token = await createPasswordResetToken(userId)
    await db
      .update(passwordResetTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(passwordResetTokens.userId, userId))

    assert.equal(await consumePasswordResetToken(token), null)
  })

  test("an unknown token is refused", async () => {
    assert.equal(await consumePasswordResetToken("not-a-real-token"), null)
  })
})

describe("passkeys", () => {
  test("a challenge does not survive an attempt, successful or not", async () => {
    const { challengeId } = await startPasskeyAuthentication()

    const pending = async () =>
      (
        await db
          .select({ id: webauthnChallenges.id })
          .from(webauthnChallenges)
          .where(eq(webauthnChallenges.id, challengeId))
      ).length

    assert.equal(await pending(), 1)

    // An unknown credential id — the point is what happens to the challenge,
    // not the assertion, which cannot be forged here anyway.
    const response = {
      id: "not-a-real-credential",
    } as AuthenticationResponseJSON
    assert.equal(await finishPasskeyAuthentication(challengeId, response), null)

    // Gone on first use, so the same challenge can never be presented twice.
    assert.equal(await pending(), 0)
    assert.equal(await finishPasskeyAuthentication(challengeId, response), null)
  })
})
