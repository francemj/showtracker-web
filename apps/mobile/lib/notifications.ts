import * as Notifications from "expo-notifications"
import { Platform } from "react-native"
import Constants from "expo-constants"
import { apiRequest } from "@showtracker/api-client"

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

// Android 8+ delivers every notification through a channel. Without one it
// falls back to a default the user can't name or tune, so the only control they
// get is silencing the whole app.
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return
  await Notifications.setNotificationChannelAsync("episodes", {
    name: "New episodes",
    description: "When a show you follow airs something new.",
    importance: Notifications.AndroidImportance.DEFAULT,
  })
}

async function registerDeviceToken(): Promise<void> {
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    )
    const platform = Platform.OS === "ios" ? "ios" : "android"
    await apiRequest("POST", "/api/devices/register", {
      token: tokenData.data,
      platform,
    })
  } catch {
    // Non-fatal: push notifications won't work but the app still functions
  }
}

// iOS allows exactly one system permission prompt, and a decline is permanent
// short of a trip to Settings — so nothing here prompts on its own. On launch
// we only refresh the token of someone who has already said yes.
export async function syncPushRegistration(): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync()
  if (status !== "granted") return
  await ensureAndroidChannel()
  await registerDeviceToken()
}

// Called from a control the user pressed, where the prompt has a reason.
export async function requestPushPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync()
  const status =
    existing === "granted"
      ? existing
      : (await Notifications.requestPermissionsAsync()).status

  if (status !== "granted") return false
  await ensureAndroidChannel()
  await registerDeviceToken()
  return true
}

export async function hasPushPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync()
  return status === "granted"
}
