import React from "react"
import { View, TouchableOpacity, StyleSheet } from "react-native"
import { Text, Checkbox, useTheme } from "react-native-paper"

type Props = {
  episodeNumber: number
  name: string
  airDate?: string | null
  watched: boolean
  onToggle: () => void
  disabled?: boolean
}

export function EpisodeRow({
  episodeNumber,
  name,
  airDate,
  watched,
  onToggle,
  disabled = false,
}: Props) {
  const theme = useTheme()

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onToggle}
      disabled={disabled}
      activeOpacity={0.6}
    >
      <Checkbox
        status={watched ? "checked" : "unchecked"}
        onPress={onToggle}
        disabled={disabled}
        color={theme.colors.primary}
      />
      <View style={styles.info}>
        <Text
          variant="bodyMedium"
          style={watched ? { color: theme.colors.onSurfaceVariant } : undefined}
          numberOfLines={1}
        >
          {episodeNumber}. {name}
        </Text>
        {airDate && (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {airDate}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  info: {
    flex: 1,
  },
})
