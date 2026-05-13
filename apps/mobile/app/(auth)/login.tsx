import React from "react"
import { View, StyleSheet } from "react-native"
import { Button, Text, ActivityIndicator, useTheme } from "react-native-paper"
import { Redirect } from "expo-router"
import { useAuth } from "../../lib/auth"

export default function LoginScreen() {
  const { login, isLoading, user } = useAuth()
  const theme = useTheme()

  if (user) return <Redirect href="/(tabs)" />

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.hero}>
        <Text variant="displaySmall" style={styles.title}>
          ShowTracker
        </Text>
        <Text
          variant="bodyLarge"
          style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}
        >
          Track your TV shows,{"\n"}episode by episode.
        </Text>
      </View>
      {isLoading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} />
      ) : (
        <Button
          mode="contained"
          onPress={login}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Sign In
        </Button>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 48,
  },
  hero: {
    alignItems: "center",
    gap: 16,
  },
  title: {
    fontWeight: "bold",
  },
  button: {
    width: "100%",
    maxWidth: 320,
  },
  buttonContent: {
    paddingVertical: 8,
  },
})
