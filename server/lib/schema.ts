import { sql } from "drizzle-orm"
import {
  pgTable,
  text,
  timestamp,
  bigint,
  boolean,
  customType,
} from "drizzle-orm/pg-core"

import { users } from "../../packages/shared/schema"

/**
 * Server-only tables.
 *
 * These deliberately do not live in packages/shared. The mobile app bundles
 * that module for its TypeScript types, and Metro keeps the table definitions —
 * they are side-effectful pgTable() calls, not types — so every column name in
 * it ends up as a literal string inside the shipped APK. A table describing
 * password hashes has no reason to be in a client binary, and a static scanner
 * reading `user_credentials` and `password_hash` out of an APK can reasonably
 * conclude it is looking at credential harvesting.
 *
 * Everything auth writes lives here for that reason: credentials, sessions,
 * passkeys and reset tokens.
 *
 * Every timestamp here is declared `withTimezone`, unlike the display
 * timestamps in packages/shared. These are compared as absolute instants —
 * session and token expiry — and Drizzle's plain `timestamp()` drops the
 * offset when reading a TIMESTAMPTZ back, reinterpreting the database's local
 * wall clock as UTC. On a Postgres running America/New_York that silently
 * expires every session five hours early.
 */

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
})

/** One row per user with a password. Passkey-only accounts have none. */
export const userCredentials = pgTable("user_credentials", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

/**
 * Sessions. Only the SHA-256 of the token is stored — the token itself exists
 * on the client and nowhere else, so a leaked dump yields nothing presentable.
 */
export const sessions = pgTable("sessions", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

/** Registered passkeys. `id` is the authenticator's own credential ID. */
export const webauthnCredentials = pgTable("webauthn_credentials", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  publicKey: bytea("public_key").notNull(),
  // Signature counter, used to spot cloned authenticators. bigint because the
  // spec allows a 32-bit value that some authenticators increment aggressively.
  counter: bigint("counter", { mode: "number" }).default(0).notNull(),
  transports: text("transports").array(),
  deviceType: text("device_type"),
  backedUp: boolean("backed_up").default(false).notNull(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
})

/**
 * In-flight WebAuthn challenges, held between the options and verify legs.
 * Deleted on use: a replayable challenge is a replayable login. userId is null
 * for sign-in, where the account isn't known until the authenticator answers.
 */
export const webauthnChallenges = pgTable("webauthn_challenges", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  challenge: text("challenge").notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").$type<"registration" | "authentication">().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

/** Hashed at rest like sessions, and single-use via usedAt. */
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})
