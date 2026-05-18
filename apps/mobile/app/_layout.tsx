import React, { useEffect } from "react"
import { useColorScheme } from "react-native"
import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { QueryClientProvider } from "@tanstack/react-query"
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from "react-native-paper"
import { SafeAreaProvider } from "react-native-safe-area-context"
import {
  useFonts,
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from "@expo-google-fonts/instrument-serif"
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans"
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
} from "@expo-google-fonts/jetbrains-mono"
import { AuthProvider } from "../lib/auth"
import { queryClient } from "../lib/queryClient"

SplashScreen.preventAutoHideAsync()

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#1a9268",
    onPrimary: "#ffffff",
    primaryContainer: "#e6f7f1",
    onPrimaryContainer: "#0d5c41",
    secondary: "#5C5B57",
    onSecondary: "#ffffff",
    secondaryContainer: "#F2F1EC",
    onSecondaryContainer: "#16161A",
    background: "#FAFAF7",
    onBackground: "#16161A",
    surface: "#FFFFFF",
    onSurface: "#16161A",
    surfaceVariant: "#F2F1EC",
    onSurfaceVariant: "#5C5B57",
    outline: "#E6E4DD",
    outlineVariant: "#D7D4CB",
  },
}

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#36c98a",
    onPrimary: "#00311e",
    primaryContainer: "#0d3d28",
    onPrimaryContainer: "#6de0b0",
    secondary: "#9C9C95",
    onSecondary: "#0E0F12",
    secondaryContainer: "#1C1F24",
    onSecondaryContainer: "#F4F4F0",
    background: "#0E0F12",
    onBackground: "#F4F4F0",
    surface: "#16181C",
    onSurface: "#F4F4F0",
    surfaceVariant: "#1C1F24",
    onSurfaceVariant: "#9C9C95",
    outline: "#262A30",
    outlineVariant: "#3A3F47",
  },
}

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const theme = colorScheme === "dark" ? darkTheme : lightTheme

  const [fontsLoaded] = useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
  })

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded])

  if (!fontsLoaded) return null

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
