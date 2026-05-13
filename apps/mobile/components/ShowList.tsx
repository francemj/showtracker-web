import React from "react"
import { FlatList, View, StyleSheet } from "react-native"
import { ActivityIndicator, Text, useTheme } from "react-native-paper"
import type { ShowWithProgress } from "@showtracker/shared"
import { ShowCard } from "./ShowCard"

type Props = {
  shows: ShowWithProgress[] | undefined
  isLoading: boolean
  emptyMessage?: string
  horizontal?: boolean
  onEndReached?: () => void
}

export function ShowList({
  shows,
  isLoading,
  emptyMessage = "No shows found.",
  horizontal = false,
  onEndReached,
}: Props) {
  const theme = useTheme()

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  if (!shows || shows.length === 0) {
    return (
      <View style={styles.center}>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {emptyMessage}
        </Text>
      </View>
    )
  }

  return (
    <FlatList
      data={shows}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <ShowCard show={item} compact={horizontal} />
      )}
      horizontal={horizontal}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={
        horizontal ? styles.horizontalList : styles.verticalList
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
    />
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  horizontalList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  verticalList: {
    padding: 12,
  },
})
