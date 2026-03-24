# Showtracker Web

Web app for searching TV shows (via [The Movie Database](https://www.themoviedb.org/)), adding them to your collection, and tracking watch progress by season and episode.

## What it does

- **Auth**: Sign in with [Auth0](https://auth0.com/) Universal Login (popup). The API accepts a **Bearer access token** on protected routes; there is no password auth in the app itself. Users who previously had local accounts can be linked on first Auth0 login when the email matches (see [AUTH0_SETUP.md](./AUTH0_SETUP.md)).
- **Shows**: Search TMDB, add shows with a status (want to watch, watching, completed), and see posters, seasons, and episodes cached in the database.
- **Progress**: Mark episodes watched, with logic for bulk watch/unwatch, status ↔ progress sync, and air-date–aware status for ongoing shows.

## Tech stack

| Layer | Choice |
|--------|--------|
| Frontend | React 18, TypeScript, [Vite](https://vitejs.dev/), [Wouter](https://github.com/molefrog/wouter), [TanStack Query](https://tanstack.com/query), [Tailwind CSS](https://tailwindcss.com/) v4, [shadcn/ui](https://ui.shadcn.com/)–style Radix components |
| Forms | React Hook Form + Zod |
| Backend | [Express](https://expressjs.com/) (TypeScript), routes in `server/` |
| Entry | `api/index.ts` — local dev attaches Vite middleware for HMR; production serves `dist/public` |
| Data | [Supabase](https://supabase.com/) (PostgreSQL) via `@supabase/supabase-js` |
| Auth validation | Auth0 `/userinfo`; token → `sub` cache in [Upstash Redis](https://upstash.com/) (`server/lib/auth0.ts`) |
| External API | TMDB for show metadata |

Shared TypeScript types and Zod helpers live under `shared/` (including Drizzle-style table definitions used with `drizzle-zod` for validation shapes).

## Repository layout

```
api/index.ts          # Express app + Vercel serverless handler
client/               # Vite React app (root for Vite)
server/               # API routes, Supabase/TMDB/Auth0 helpers
shared/               # Shared schemas and types
database-schema.sql   # Postgres schema for Supabase
```

## Prerequisites

- **Node.js** 20+ recommended (aligned with `@types/node` and tooling in this repo)
- A Supabase project and applied schema from `database-schema.sql`
- Auth0 SPA application and env vars (see [AUTH0_SETUP.md](./AUTH0_SETUP.md))
- TMDB API key
- Upstash Redis REST URL and token (required at server startup for auth token caching)

## Environment variables

Config is loaded from **`.env.<NODE_ENV>`** (e.g. `.env.development`, `.env.production`) in the project root, with fallback to `.env` ([`server/env-config.ts`](./server/env-config.ts)).

| Variable | Where | Purpose |
|----------|--------|---------|
| `SUPABASE_URL` | Server | Supabase project URL |
| `SUPABASE_ANON_KEY` | Server | Supabase anon (public) key |
| `AUTH0_DOMAIN` | Server | Auth0 tenant domain |
| `TMDB_API_KEY` | Server | TMDB API v3 key |
| `UPSTASH_REDIS_REST_URL` | Server | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Server | Upstash Redis token |
| `PORT` | Server | Optional; default **3000** locally |
| `VITE_AUTH0_DOMAIN` | Client (build-time) | Same as `AUTH0_DOMAIN` |
| `VITE_AUTH0_CLIENT_ID` | Client (build-time) | Auth0 SPA client ID |

On [Vercel](https://vercel.com/), `VERCEL` is set automatically; the app exports a serverless handler from `api/index.ts` (see [`vercel.json`](./vercel.json)).

## Scripts

```bash
npm install
npm run dev      # Development: Express + Vite (default port 3000)
npm run build    # Production client build → dist/public
npm run start    # Production: Express + static assets (NODE_ENV=production)
npm run check    # TypeScript check
npm run lint     # ESLint
```

## Documentation in this repo

- [DATABASE_SETUP.md](./DATABASE_SETUP.md) — apply `database-schema.sql` in Supabase
- [AUTH0_SETUP.md](./AUTH0_SETUP.md) — Auth0 SPA settings and env vars (including legacy user migration)
- [design_guidelines.md](./design_guidelines.md) — UI palette, typography, and layout notes

## External services

- **Auth0** — identity and access tokens for the API
- **Supabase** — PostgreSQL and application data
- **TMDB** — TV search, details, seasons, episodes
- **Upstash Redis** — short-lived cache for Auth0 token validation
