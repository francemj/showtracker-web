import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "../../packages/shared/schema"

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL")
}

/**
 * Runs as a Vercel serverless function, so each concurrent invocation is its own
 * process. A pool inside one of them multiplies against Postgres' connection
 * limit rather than sharing anything — hence max: 1, with PgBouncer doing the
 * actual pooling.
 *
 * prepare: false is required by PgBouncer's transaction mode: each transaction
 * may land on a different backend, so a statement prepared on one is not there
 * for the next.
 */
const client = postgres(process.env.DATABASE_URL, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
})

export const db = drizzle(client, { schema })
