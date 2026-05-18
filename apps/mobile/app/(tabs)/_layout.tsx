import React, { useEffect } from "react"
import { useColorScheme } from "react-native"
import { Tabs, Redirect } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useAuth } from "../../lib/auth"
import { registerForPushNotifications } from "../../lib/notifications"
import { COLORS, SANS_600 } from "../../lib/theme"

export default function TabLayout() {
  const { user } = useAuth()
  const scheme = useColorScheme()
  const t = scheme === "dark" ? COLORS.dark : COLORS.light

  useEffect(() => {
    if (user) {
      registerForPushNotifications()
    }
  }, [user])

  if (!user) return <Redirect href="/(auth)/login" />

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.fgMuted,
        tabBarStyle: {
          backgroundColor: t.surface,
          borderTopColor: t.border,
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontFamily: SANS_600,
          fontSize: 10.5,
          letterSpacing: 0.1,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarLabel: "Search",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          tabBarLabel: "Library",
          href: "/library",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bookmark-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
