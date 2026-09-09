const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM

/**
 * Resend over plain fetch rather than their SDK — one HTTPS POST does not
 * justify a dependency in a serverless bundle.
 */
async function send(to: string, subject: string, text: string): Promise<void> {
  if (!RESEND_API_KEY || !EMAIL_FROM) {
    // Password reset is the only account-recovery path, so a misconfigured
    // sender in production is a real outage rather than a degraded feature —
    // say so loudly. Locally, printing the mail keeps the flow testable without
    // signing up for anything.
    if (process.env.NODE_ENV === "production") {
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
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, text }),
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
