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
// A preview deployment answers on two hostnames: VERCEL_URL, unique per
// deployment, and VERCEL_BRANCH_URL, stable per branch and the one Vercel links
// from the pull request — so it is the one a person actually opens. Preferring
// it matters because a passkey's relying-party id must be a suffix of the
// origin in the address bar: pick the wrong hostname of the two and the browser
// refuses the ceremony outright, on a deployment that otherwise looks healthy.
const vercelHost = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL

export const APP_URL =
  process.env.APP_URL ??
  (vercelHost ? `https://${vercelHost}` : "http://localhost:3000")
