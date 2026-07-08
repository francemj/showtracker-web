# Showtracker

Monorepo for a TV show tracker — search shows via [The Movie Database](https://www.themoviedb.org/), add them to your collection, and track watch progress by season and episode. Available as a web app and a React Native mobile app.

## What it does

- **Auth**: Sign in with [Auth0](https://auth0.com/) Universal Login (popup). The API accepts a **Bearer access token** on protected routes; there is no password auth in the app itself. Users who previously had local accounts can be linked on first Auth0 login when the email matches (see [AUTH0_SETUP.md](./AUTH0_SETUP.md)).
- **Shows**: Search TMDB, add shows with a status (want to watch, watching, completed), and see posters, seasons, and episodes cached in the database.
- **Progress**: Mark episodes watched, with logic for bulk watch/unwatch, status ↔ progress sync, and air-date–aware status for ongoing shows.

## Tech stack

### Web (`apps/web`)

| Layer | Choice |
|--------|--------|
| Frontend | React 18, TypeScript, [Vite](https://vitejs.dev/), [Wouter](https://github.com/molefrog/wouter), [TanStack Query](https://tanstack.com/query), [Tailwind CSS](https://tailwindcss.com/) v4, [shadcn/ui](https://ui.shadcn.com/)–style Radix components |
| Forms | React Hook Form + Zod |
| Backend | [Express](https://expressjs.com/) (TypeScript), routes in `server/` |
| Entry | `api/index.ts` — local dev attaches Vite middleware for HMR; production serves `dist/public` |
| Data | [Supabase](https://supabase.com/) (PostgreSQL) via `@supabase/supabase-js` |
| Auth validation | Auth0 `/userinfo`; token → `sub` cache in [Upstash Redis](https://upstash.com/) (`server/lib/auth0.ts`) |
| External API | TMDB for show metadata |

### Mobile (`apps/mobile`)

| Layer | Choice |
|--------|--------|
| Framework | [Expo](https://expo.dev/) ~54, React Native 0.81, [Expo Router](https://expo.github.io/router/) v6 |
| UI | React Native Paper, Expo Linear Gradient, custom cinematic dark theme |
| Data fetching | TanStack Query with AsyncStorage persistence |
| Auth | Auth0 via `react-native-auth0`, tokens stored in Expo SecureStore |
| Notifications | Expo Notifications |
| Distribution | [EAS Build](https://expo.dev/eas) (`eas.json`), bundle IDs `dev.matt.showtracker` |

The mobile app connects to the same hosted API (`https://showtracker-web.vercel.app`).

### Shared packages (`packages/`)

- **`api-client`** — typed fetch wrappers shared between web and mobile
- **`shared`** — TypeScript types and Zod schemas (including Drizzle-style table definitions used with `drizzle-zod`)

## Repository layout

```
apps/
  web/                # Vite React web app
  mobile/             # Expo React Native app
packages/
  api-client/         # Shared typed API client
  shared/             # Shared schemas and types
api/index.ts          # Express app + Vercel serverless handler
server/               # API routes, Supabase/TMDB/Auth0 helpers
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

### Web / API (root)

```bash
npm install
npm run dev      # Development: Express + Vite (default port 3000)
npm run build    # Production client build → dist/public
npm run start    # Production: Express + static assets (NODE_ENV=production)
npm run check    # TypeScript check
npm run lint     # ESLint
```

### Mobile (`apps/mobile`)

```bash
cd apps/mobile
npx expo start          # Start Expo dev server
npx expo run:ios        # Run on iOS simulator
npx expo run:android    # Run on Android emulator
npx tsc --noEmit        # TypeScript check
```

EAS builds are configured in [`apps/mobile/eas.json`](./apps/mobile/eas.json). Run `eas build` to produce a production build via Expo Application Services.

#### Native dev client vs. Metro-only, especially when using git worktrees

This app uses native modules (`react-native-auth0`, `expo-notifications`), so it needs a compiled **dev client** on the simulator/device — Expo Go alone won't work (`TurboModuleRegistry.getEnforcing(...): 'A0Auth0' could not be found` means you're on Expo Go or a stale dev client).

`ios/` and `android/` are gitignored and regenerated on demand by `expo prebuild` (which `expo run:ios`/`run:android` call automatically). That means:

- **Only rebuild the native shell (`npx expo run:ios` / `run:android`) when native dependencies or `app.json` config/plugins actually change.** A full rebuild takes several minutes and, per checkout, regenerates multi-GB `ios/`/`android/`/Pods/DerivedData directories.
- **For everyday JS/TS-only changes, don't rebuild** — run `npx expo start --dev-client` and the already-installed dev client on the simulator will reconnect and load the new bundle in seconds.
- **In a git worktree specifically**: `ios/`/`android/` won't exist there (gitignored, so a fresh worktree has none), so rebuilding native from inside a worktree means a full prebuild + Xcode/Gradle build every time, and a separate multi-GB native project per worktree. Prefer building the dev client once from a single canonical checkout (e.g. your main clone), installing it on the simulator, and then just pointing `expo start --dev-client` at it from whichever worktree you're actively editing — the dev client doesn't care which directory served its JS bundle.

## Documentation in this repo

- [DATABASE_SETUP.md](./DATABASE_SETUP.md) — apply `database-schema.sql` in Supabase
- [AUTH0_SETUP.md](./AUTH0_SETUP.md) — Auth0 SPA settings and env vars (including legacy user migration)
- [design_guidelines.md](./design_guidelines.md) — UI palette, typography, and layout notes

## External services

- **Auth0** — identity and access tokens for the API
- **Supabase** — PostgreSQL and application data
- **TMDB** — TV search, details, seasons, episodes
- **Upstash Redis** — short-lived cache for Auth0 token validation
