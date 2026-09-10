// Read at call time rather than captured at import: it keeps the behaviour
// testable, and a serverless instance should not bake in whatever the
// environment happened to look like when the module first loaded.
const config = () => ({
  apiKey: process.env.RESEND_API_KEY,
  from: process.env.EMAIL_FROM,
  // Vercel sets NODE_ENV=production on preview deployments too, so this means
  // "running somewhere real", not "the production environment".
  isDeployed: process.env.NODE_ENV === "production",
})

/**
 * Whether a reset mail can actually leave the building.
 *
 * Callers check this *before* looking an account up, so a misconfigured
 * deployment answers the same way for every address. That reveals nothing about
 * any account, and it is the difference between a visible outage and a button
 * that silently does nothing — which is the worst possible failure mode for the
 * only account-recovery path there is.
 *
 * Locally, printing the mail to the console counts as deliverable: the flow
 * stays testable without signing up for anything.
 */
export function canSendEmail(): boolean {
  const { apiKey, from, isDeployed } = config()
  return Boolean(apiKey && from) || !isDeployed
}

/**
 * Resend over plain fetch rather than their SDK — one HTTPS POST does not
 * justify a dependency in a serverless bundle.
 */
async function send(to: string, subject: string, text: string): Promise<void> {
  const { apiKey, from, isDeployed } = config()
  if (!apiKey || !from) {
    if (isDeployed) {
      console.error(
        "[email] RESEND_API_KEY/EMAIL_FROM missing — password reset cannot be delivered"
      )
      throw new Error("Email is not configured")
    }
    console.log(`\n[email] to ${to}\n[email] ${subject}\n${text}\n`)
    return
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text }),
  })

  if (!res.ok) {
    throw new Error(`Resend failed: ${res.status} ${await res.text()}`)
  }
}

export function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  return send(
    to,
    "Reset your Showtracker password",
    `Someone asked to reset the password for this Showtracker account.\n\n${resetUrl}\n\nThe link works once and expires in an hour. If this wasn't you, ignore this email — nothing has changed.`
  )
}
