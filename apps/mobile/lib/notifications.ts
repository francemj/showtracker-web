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
  await registerDeviceToken()
  return true
}

export async function hasPushPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync()
  return status === "granted"
}
