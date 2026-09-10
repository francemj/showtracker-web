/**
 * The origin this deployment answers on. It is the expected WebAuthn origin,
 * the passkey relying-party id, the CORS allowlist, and the base for reset
 * links — so it has to be the host the browser actually loaded, not merely a
 * host that reaches the same app.
 *
 * Production sets APP_URL explicitly, because Vercel's own VERCEL_URL is the
 * deployment's generated hostname rather than the custom domain. Preview
 * deployments deliberately leave it unset and fall back to VERCEL_URL: each one
 * has a different generated host, and pinning them all to production's origin
 * would reject every cookie-authenticated write with a 403 and break passkeys
 * on exactly the deployments used to test them.
 */
export const APP_URL =
  process.env.APP_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000")
