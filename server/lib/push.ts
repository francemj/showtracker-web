const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const message = {
    to: token,
    sound: "default",
    title,
    body,
    data: data ?? {},
  }

  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Expo push failed: ${res.status} ${text}`)
  }
}

export async function sendBulkPushNotifications(
  notifications: Array<{
    token: string
    title: string
    body: string
    data?: Record<string, unknown>
  }>
): Promise<void> {
  if (notifications.length === 0) return

  // Expo push API accepts up to 100 messages per request
  const chunks: (typeof notifications)[] = []
  for (let i = 0; i < notifications.length; i += 100) {
    chunks.push(notifications.slice(i, i + 100))
  }

  await Promise.all(
    chunks.map((chunk) =>
      fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          chunk.map((n) => ({
            to: n.token,
            sound: "default",
            title: n.title,
            body: n.body,
            data: n.data ?? {},
          }))
        ),
      })
    )
  )
}
