import React from "react"
import { useColorScheme } from "react-native"
import { Stack } from "expo-router"
import { QueryClientProvider } from "@tanstack/react-query"
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from "react-native-paper"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { AuthProvider } from "../lib/auth"
import { queryClient } from "../lib/queryClient"

// Mirrors the web app's slate + teal palette
const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#1a9268",           // teal — hsl(158 65% 36%)
    onPrimary: "#ffffff",
    primaryContainer: "#c2f0dc",  // light teal surface
    onPrimaryContainer: "#00311e",
    secondary: "#667585",         // muted slate — hsl(215 18% 48%)
    onSecondary: "#ffffff",
    secondaryContainer: "#dae3ef",
    onSecondaryContainer: "#202c38",
  },
}

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#36c98a",           // lighter teal for dark bg — hsl(158 58% 50%)
    onPrimary: "#00311e",
    primaryContainer: "#003d26",  // dark teal surface
    onPrimaryContainer: "#c2f0dc",
    secondary: "#9aaebb",         // lighter slate for dark — hsl(215 18% 68%)
    onSecondary: "#202c38",
    secondaryContainer: "#3a4756",
    onSecondaryContainer: "#dae3ef",
  },
}

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const theme = colorScheme === "dark" ? darkTheme : lightTheme

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
