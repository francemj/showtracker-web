import React from "react"
import { Stack } from "expo-router"
import { QueryClientProvider } from "@tanstack/react-query"
import { PaperProvider } from "react-native-paper"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { AuthProvider } from "../lib/auth"
import { queryClient } from "../lib/queryClient"

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </AuthProvider>
        </QueryClientProvider>
      </PaperProvider>
    </SafeAreaProvider>
  )
}
