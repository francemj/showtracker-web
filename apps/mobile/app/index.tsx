import { Redirect } from "expo-router"
import { useAuth } from "../lib/auth"
import { View, ActivityIndicator } from "react-native"

export default function Index() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return <Redirect href={user ? "/(tabs)" : "/(auth)/login"} />
}
