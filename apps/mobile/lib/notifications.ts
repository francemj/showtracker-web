import * as Notifications from "expo-notifications"
import { Platform } from "react-native"
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

export async function registerForPushNotifications(): Promise<void> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== "granted") return

  const tokenData = await Notifications.getExpoPushTokenAsync()
  const platform = Platform.OS === "ios" ? "ios" : "android"

  try {
    await apiRequest("POST", "/api/devices/register", {
      token: tokenData.data,
      platform,
    })
  } catch {
    // Non-fatal: push notifications won't work but the app still functions
  }
}
