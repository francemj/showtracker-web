# Showtracker

Monorepo for a TV show tracker — search shows via [The Movie Database](https://www.themoviedb.org/), add them to your collection, and track watch progress by season and episode. Available as a web app and a React Native mobile app.

## What it does

- **Auth**: Email and password, or a passkey (Face ID / Touch ID / Windows Hello), on our own screens — no identity provider, no redirect, no popup. Web holds its session in an httpOnly cookie; mobile holds a bearer token in SecureStore. See [AUTH.md](./AUTH.md).
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
| Data | Self-hosted PostgreSQL via [Drizzle](https://orm.drizzle.team/) over `postgres.js`, behind PgBouncer |
| Auth | Own sessions in Postgres, passkeys via [SimpleWebAuthn](https://simplewebauthn.dev) (`server/lib/auth.ts`) |
| External API | TMDB for show metadata |

### Mobile (`apps/mobile`)

| Layer | Choice |
|--------|--------|
| Framework | [Expo](https://expo.dev/) ~54, React Native 0.81, [Expo Router](https://expo.github.io/router/) v6 |
| UI | React Native Paper, Expo Linear Gradient, custom cinematic dark theme |
| Data fetching | TanStack Query with AsyncStorage persistence |
| Auth | Email/password and passkeys via `react-native-passkey`, session token in Expo SecureStore |
| Notifications | Expo Notifications |
| Distribution | [EAS Build](https://expo.dev/eas) + [EAS Update](https://docs.expo.dev/eas-update/introduction/) (`eas.json`), bundle IDs `dev.matt.showtracker` |

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
server/               # API routes, database/TMDB/auth helpers
database-schema.sql   # Postgres schema (source of truth)
```

## Prerequisites

- **Node.js** 20+ recommended (aligned with `@types/node` and tooling in this repo)
- A PostgreSQL database with `database-schema.sql` applied (see the `postgres-host` repo)
- TMDB API key
- Upstash Redis REST URL and token (required at server startup; caches TMDB responses)
- A [Resend](https://resend.com/) API key for password-reset email, and — for mobile passkeys — the app-association values in [AUTH.md](./AUTH.md)

## Environment variables

Config is loaded from **`.env.<NODE_ENV>`** (e.g. `.env.development`, `.env.production`) in the project root, with fallback to `.env` ([`server/env-config.ts`](./server/env-config.ts)).

| Variable | Where | Purpose |
|----------|--------|---------|
| `DATABASE_URL` | Server | Postgres connection string, via PgBouncer, with `sslmode=verify-full` |
| `APP_URL` | Server | Public origin; the passkey relying party and the base for reset links |
| `TMDB_API_KEY` | Server | TMDB API v3 key |
| `UPSTASH_REDIS_REST_URL` | Server | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Server | Upstash Redis token |
| `PORT` | Server | Optional; default **3000** locally |
| `RESEND_API_KEY` | Server | Transactional email for password reset |
| `EMAIL_FROM` | Server | Sender address for that email |

Passkey app-association variables (`IOS_TEAM_ID`, `ANDROID_SHA256_FINGERPRINT`, `ANDROID_APK_KEY_HASH`, …) are documented in [AUTH.md](./AUTH.md).

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

#### Build profiles

Builds go through [EAS](https://expo.dev/eas); the profiles live in [`apps/mobile/eas.json`](./apps/mobile/eas.json).

| Profile | Produces | Use it for |
| --- | --- | --- |
| `development` | Debug build with `expo-dev-client` | Install once on a device, then iterate over Metro |
| `preview` | Release-mode APK, internal distribution | Testing a release candidate |
| `production` | Signed release APK, auto-incremented `versionCode` | Tagged releases, built in CI |

```bash
cd apps/mobile
eas build --profile development --platform android   # install once, then stop rebuilding
eas build --profile preview --platform android       # release-mode test build
```

`production` runs in CI on a `v*` or `mobile/v*` tag and attaches the APK to the GitHub
release, so there is normally no reason to run that profile by hand.

Signing keys are managed by EAS (`eas credentials -p android`) rather than stored in this
repo or in GitHub secrets, and `appVersionSource: remote` means EAS owns the `versionCode`.
The keystore fingerprint has to match the one served at `/.well-known/assetlinks.json` or
every Android passkey fails origin validation — see [AUTH.md](./AUTH.md).

#### Shipping JS-only changes without a rebuild

`expo-updates` is configured with a channel per build profile and a `fingerprint` runtime
version, so a JS/TS-only change can go out over the air instead of through a new binary:

```bash
cd apps/mobile
eas update --branch production --message "fix episode counter"
```

The fingerprint policy is derived from the native dependency set, so an update that needs a
different native shell will not be served to a build that cannot run it; that case needs a
new `production` build instead.

#### Native dev client vs. Metro-only, especially when using git worktrees

This app uses native modules (`react-native-passkey`, `expo-notifications`), so it needs a compiled **dev client** on the simulator/device — Expo Go alone won't work (a `TurboModuleRegistry.getEnforcing(...)` failure naming one of those modules means you're on Expo Go or a stale dev client).

`ios/` and `android/` are gitignored and regenerated on demand by `expo prebuild` (which `expo run:ios`/`run:android` call automatically). That means:

- **Only rebuild the native shell (`npx expo run:ios` / `run:android`) when native dependencies or `app.json` config/plugins actually change.** A full rebuild takes several minutes and, per checkout, regenerates multi-GB `ios/`/`android/`/Pods/DerivedData directories.
- **For everyday JS/TS-only changes, don't rebuild** — run `npx expo start --dev-client` and the already-installed dev client on the simulator will reconnect and load the new bundle in seconds.
- **In a git worktree specifically**: `ios/`/`android/` won't exist there (gitignored, so a fresh worktree has none), so rebuilding native from inside a worktree means a full prebuild + Xcode/Gradle build every time, and a separate multi-GB native project per worktree. The cleanest way out is `eas build --profile development`, which builds the dev client on EAS and gives you an install link — no local native project at all. Failing that, build the dev client once from a single canonical checkout (e.g. your main clone). Either way, point `expo start --dev-client` at the installed client from whichever worktree you're actively editing — it doesn't care which directory served its JS bundle.

## Documentation in this repo

- [DATABASE_SETUP.md](./DATABASE_SETUP.md) — connecting, and applying `database-schema.sql`
- [AUTH.md](./AUTH.md) — the auth model, env vars, passkey domain setup, and migrating pre-existing accounts
- [design_guidelines.md](./design_guidelines.md) — UI palette, typography, and layout notes

## External services

- **PostgreSQL** — application data, and every session and credential, self-hosted
- **TMDB** — TV search, details, seasons, episodes
- **Upstash Redis** — short-lived cache for TMDB responses
- **Resend** — password-reset email
