import { sql } from "drizzle-orm"
import { pgTable, text, timestamp } from "drizzle-orm/pg-core"

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
 */

/** Credentials for users who predate Auth0. Not written any more; kept so those
 * accounts still resolve. */
export const userCredentials = pgTable("user_credentials", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
