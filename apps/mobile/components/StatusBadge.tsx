import React from "react"
import { View, Text, StyleSheet, useColorScheme } from "react-native"
import { STATUS_COLORS, STATUS_LABELS, StatusKey, SANS_700 } from "../lib/theme"

type Props = {
  status: string
  variant?: "card" | "detail"
}

export function StatusBadge({ status, variant = "card" }: Props) {
  const scheme = useColorScheme()
  const key = status as StatusKey
  const sp = STATUS_COLORS[key] ?? STATUS_COLORS.want_to_watch
  const colors = scheme === "dark" ? sp.dark : sp.light
  const label = STATUS_LABELS[key] ?? status

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[
        styles.label,
        {
          color: colors.fg,
          fontSize: variant === "detail" ? 13 : 11,
        },
      ]}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  label: {
    fontFamily: SANS_700,
    letterSpacing: 0.1,
    lineHeight: 14,
  },
})
