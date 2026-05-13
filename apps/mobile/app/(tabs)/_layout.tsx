import React, { useEffect } from "react"
import { Tabs, Redirect } from "expo-router"
import { useTheme } from "react-native-paper"
import { useAuth } from "../../lib/auth"
import { registerForPushNotifications } from "../../lib/notifications"

export default function TabLayout() {
  const { user } = useAuth()
  const theme = useTheme()

  useEffect(() => {
    if (user) {
      registerForPushNotifications()
    }
  }, [user])

  if (!user) return <Redirect href="/(auth)/login" />

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: { backgroundColor: theme.colors.surface },
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Dashboard", tabBarLabel: "Home" }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: "Search", tabBarLabel: "Search" }}
      />
      <Tabs.Screen
        name="library"
        options={{ title: "Library", tabBarLabel: "Library", href: "/library" }}
      />
    </Tabs>
  )
}
