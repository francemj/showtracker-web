import React from "react"
import { useColorScheme } from "react-native"
import { Stack } from "expo-router"
import { QueryClientProvider } from "@tanstack/react-query"
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from "react-native-paper"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { AuthProvider } from "../lib/auth"
import { queryClient } from "../lib/queryClient"

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const theme = colorScheme === "dark" ? MD3DarkTheme : MD3LightTheme

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </AuthProvider>
        </QueryClientProvider>
      </PaperProvider>
    </SafeAreaProvider>
  )
}
