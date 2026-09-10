# Authentication

Auth runs inside this API. There is no identity provider, no redirect, and no
popup — sign-in happens on our own screens on both web and mobile.

## The model

| Piece | How |
|---|---|
| Passwords | `scrypt` from `node:crypto`, 16-byte random salt, stored as `scrypt$<salt>$<hash>` in `user_credentials` |
| Sessions | 32 random bytes; only the **SHA-256** is stored, in `sessions`. 60-day expiry, slid forward once past halfway |
| Passkeys | [`@simplewebauthn/server`](https://simplewebauthn.dev) on the API, `@simplewebauthn/browser` on web, `react-native-passkey` on mobile |
| Reset | Random token, hashed at rest, single-use, one hour |

`@simplewebauthn/server` is the only runtime dependency any of this adds. It
does the part that would be dangerous to write by hand — attestation and
assertion verification — and ships an explicit `require` condition, so it loads
natively in the CommonJS server (see
[`scripts/check-lambda-module-boundary.mjs`](./scripts/check-lambda-module-boundary.mjs)
for why that matters).

**Web gets an httpOnly cookie**, so no token is reachable from script. **Mobile
gets a bearer token** in Expo SecureStore, requested explicitly with the header
`X-Auth-Mode: token` — without that header the raw token is never in a response
body. `authMiddleware` accepts either, and refuses cookie-authenticated
mutations carrying a foreign `Origin`. CORS is an allowlist of `APP_URL` rather
than an origin reflector — with a cookie in play, reflecting arbitrary origins
would leave `SameSite=Lax` as the only lock. Requests with no `Origin` are
allowed through: that is the native app, which carries a bearer token and is
authorised on that basis.

## Environment

### Required

```
DATABASE_URL=postgres://…
APP_URL=https://your-domain.com     # also the passkey relying-party id
```

`APP_URL` is load-bearing: it is the expected WebAuthn origin, the passkey
relying-party id, the CORS allowlist, and the base for reset links. It must be
the origin the browser actually loaded — a host that merely reaches the same app
is not enough, or cookie-authenticated writes get a 403.

Set it on **production only**. Preview deployments each get their own generated
hostname and fall back to Vercel's `VERCEL_URL`; pinning them to production's
origin would 403 every write and break passkeys on exactly the deployments used
to test them.

`RP_ID` defaults to `APP_URL`'s hostname. Setting it to a parent domain
(`example.com` for a page on `app.example.com`) makes enrolled passkeys survive a
move to another subdomain — at the cost of letting every sibling subdomain use
them.

### Email (required in production)

```
RESEND_API_KEY=re_…
EMAIL_FROM=Showtracker <no-reply@your-domain.com>
```

Password reset is the only account-recovery path, so the server treats a missing
sender in production as an error rather than a degraded feature. In development
the email is printed to the console instead, so the flow is testable without
signing up for anything.

### Passkeys on mobile

Native passkeys only work if the app and the domain vouch for each other. The
API serves both association files, generated from these variables:

```
IOS_TEAM_ID=ABCDE12345              # Apple Developer team id
IOS_BUNDLE_ID=dev.matt.showtracker  # optional, this is the default
ANDROID_SHA256_FINGERPRINT=AA:BB:…  # from `eas credentials`; comma-separate several
ANDROID_PACKAGE=dev.matt.showtracker
ANDROID_APK_KEY_HASH=<base64url SHA-256 of the signing cert>  # comma-separate several
```

Until they are set, `/.well-known/apple-app-site-association` and
`/.well-known/assetlinks.json` return 404 — deliberately, so an unconfigured
deployment is visibly missing rather than serving a plausible file that silently
fails to associate.

`ANDROID_APK_KEY_HASH` is separate and easy to miss: Android does not send an
https origin for an assertion, it sends `android:apk-key-hash:<hash>`. Without
it, iOS and web passkeys work and every Android one fails origin validation.

It is the *same certificate* as `ANDROID_SHA256_FINGERPRINT`, in a different
encoding — base64url of the digest bytes rather than colon-separated hex:

```bash
echo "AB:CD:EF:..." | tr -d ':' | xxd -r -p | base64 | tr '+/' '-_' | tr -d '='
```

Both accept a comma-separated list. An app signed by Google Play has a
different certificate from the one EAS uses for internal builds, so list both
or passkeys will work in testing and fail in production.

`app.json` carries the matching `ios.associatedDomains` entry
(`webcredentials:<domain>`), and `vercel.json` routes `/.well-known/*` to the
API — the SPA catch-all would otherwise answer both with `index.html`.

`app.config.js` appends `?mode=developer` to that entry for every build profile
except `production`. iOS fetches the association file through Apple's CDN and
caches it, so a correction can take hours to reach a device; developer mode
fetches straight from the domain. It must not ship — the device has to be in
Developer Mode for the entry to resolve at all — which is why the profile
decides rather than a note asking someone to remember.

Once deployed, the endpoints are the verification. They echo the configured
values back, which is more use than reading the environment variables (Vercel
stores them as sensitive and will not return them):

```bash
curl -s https://<domain>/.well-known/apple-app-site-association
curl -s https://<domain>/.well-known/assetlinks.json
```

> **Changing the domain invalidates every enrolled passkey.** The relying-party
> id is part of the credential. Settle the domain before anyone enrols.

## Endpoints

```
POST /api/auth/register            {email, password, name?}
POST /api/auth/login               {email, password}
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/forgot-password     {email}
POST /api/auth/reset-password      {token, password}

POST /api/auth/passkey/register/options    (authenticated)
POST /api/auth/passkey/register/verify     (authenticated)
POST /api/auth/passkey/login/options
POST /api/auth/passkey/login/verify
GET  /api/auth/passkeys                    (authenticated)
DELETE /api/auth/passkeys/:id              (authenticated)
```

Everything under `/api/auth` is rate limited separately from the rest of the
API, keyed on IP + email, because the global limiter keys on a bearer prefix
that by definition does not exist yet at sign-in.

## Accounts that predate this

No data migration is needed. `users.email` is unique, so an existing account
that sets a password gets a `user_credentials` row against the same `users.id`
and keeps its whole library. Those users have no password yet, so send them
through "Forgot?" once.

`users.auth0_id` is now nullable and unused; drop it once every account has
signed in again.

## Tests

```bash
npm test
```

Needs a Postgres with [`database-schema.sql`](./database-schema.sql) applied
(`DATABASE_URL`; CI runs a service container). The suite covers the failures
that are otherwise silent — a logout that does not revoke, a reset link that
works twice, a password change that leaves other sessions alive, sign-in timing
that reveals whether an account exists. None of those produce a type error or a
failed build, which is the whole reason the file exists.
