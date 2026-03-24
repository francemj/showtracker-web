# Auth0 Setup for Login with Popup (Universal Login)

This app uses **Auth0’s Universal Login** with **login with popup**. Users sign in or sign up in an Auth0-hosted page in a popup; **passwords never go through your app**.

## 1. Application type

- In [Auth0 Dashboard](https://manage.auth0.com/) → **Applications** → **Applications**, create an application or open the one you use for this project.
- Set **Application Type** to **Single Page Application**.

## 2. Allowed Callback URLs

Add the URLs where your app runs (Auth0 redirects the popup here after login):

- Local: `http://localhost:3000` (or the port from `npm run dev`)
- Production: `https://your-production-domain.com`

Example:

```
http://localhost:3000, https://your-app.vercel.app
```

## 3. Allowed Logout URLs

Add the same app URLs so users are sent back after logout:

```
http://localhost:3000, https://your-app.vercel.app
```

## 4. Allowed Web Origins

Required for `loginWithPopup` and silent token refresh. Add the same origins (no path):

```
http://localhost:3000, https://your-app.vercel.app
```

## 5. Allowed Origins (CORS)

If your Auth0 API or CORS settings ask for “Allowed Origins,” use the same list as Allowed Web Origins.

---

## Environment variables

### Client (Vite; prefix with `VITE_`)

In `.env.development`, `.env.production`, or your deploy config:

```
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your_client_id
```

- **VITE_AUTH0_DOMAIN**: Auth0 tenant domain (e.g. `mycompany.auth0.com`).
- **VITE_AUTH0_CLIENT_ID**: Application **Client ID** from the Auth0 Application settings.

### Server

```
AUTH0_DOMAIN=your-tenant.auth0.com
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
```

- **AUTH0_DOMAIN**: Same as `VITE_AUTH0_DOMAIN`. Used to call the `/userinfo` endpoint and validate the access token.
- **UPSTASH_REDIS_***: Required. The server caches the mapping from access token → Auth0 `sub` in Redis for a few minutes to avoid hitting `/userinfo` on every API request ([`server/lib/auth0.ts`](./server/lib/auth0.ts)). Without these variables the server will fail to start when loading the auth module.

`AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET` are **not** required for this flow; the backend does not call Auth0’s token or Management APIs.

---

## Auth0 connections

- In **Authentication** → **Database** (or **Social**), enable the **Username-Password-Authentication** database (and any social providers you want).
- Universal Login will show Sign In and Sign Up; which connections appear is controlled in the Auth0 Dashboard, not in this app.

---

## Summary of changes in Auth0

| Setting               | Value                                                                 |
|-----------------------|-----------------------------------------------------------------------|
| Application Type      | **Single Page Application**                                           |
| Allowed Callback URLs | `http://localhost:3000`, `https://your-production-domain.com`         |
| Allowed Logout URLs   | Same as above                                                         |
| Allowed Web Origins   | Same origins (no path), e.g. `http://localhost:3000`, `https://...`   |

---

## Legacy users (`auth0_id` like `local_%`)

If you had users created before this refactor with `auth0_id` starting with `local_`, they can still be migrated when they first sign in with Universal Login:

1. They use **Create Account** (or Sign In with the same email) in the Auth0 popup.
2. The backend finds their Supabase user by email and `auth0_id` like `local_%`, updates `auth0_id` to the new Auth0 `sub`, and removes their old `user_credentials` row.
3. Future logins use the normal Auth0 path.

No extra Auth0 or app changes are needed for this migration.
