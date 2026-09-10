# Database Setup

The app stores all application data in **PostgreSQL**, reached through
[Drizzle](https://orm.drizzle.team/) over `postgres.js`. It is self-hosted —
see the `postgres-host` repository for the box itself.

## Connecting

Set `DATABASE_URL`:

```
postgresql://showtracker:<password>@db.example.com:6432/showtracker?sslmode=verify-full
```

Port 6432 is PgBouncer, not Postgres directly. Two things follow from that, and
both are already handled in [`server/lib/db.ts`](./server/lib/db.ts):

- `prepare: false` — transaction pooling may hand each transaction a different
  backend, so a prepared statement from one is not there for the next.
- `max: 1` — each Vercel invocation is its own process, so a pool inside one
  multiplies against the connection limit rather than sharing anything.

Use `sslmode=verify-full`, not `require`: `require` encrypts the connection but
does not authenticate the server.

## Applying the schema

[`database-schema.sql`](./database-schema.sql) is the source of truth. It
creates the tables, indexes, the two sort-support views and the
`count_aired_watched_episodes` function.

```bash
psql "$DATABASE_URL_DIRECT" -f database-schema.sql
```

Apply it over a direct Postgres connection (an SSH tunnel to port 5432), not
through PgBouncer.

## Schema notes

- **Authentication now lives in this database.** `user_credentials`,
  `sessions`, `webauthn_credentials`, `webauthn_challenges` and
  `password_reset_tokens` hold everything auth writes; their Drizzle
  definitions are in `server/lib/schema.ts` rather than `packages/shared` so
  credential column names stay out of the mobile bundle. See [AUTH.md](./AUTH.md).
- **`user_shows_with_last_watch` and `user_shows_with_next_air`** back the
  "recent watch" and "next air date" sort modes. They existed only inside the
  old hosted project until they were recovered from the catalog during the
  migration; they are now in `database-schema.sql` and declared in
  [`packages/shared/schema.ts`](./packages/shared/schema.ts) with `.existing()`.
- **`count_aired_watched_episodes`** is retained by the schema file but no
  longer called. It existed to work around PostgREST's default row cap, which
  does not apply to direct SQL; `/api/stats` now does the join itself.
- **`seasons` and `import_history`** were dropped. Both held zero rows and were
  never read or written by any code path.
