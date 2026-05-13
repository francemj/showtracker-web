import React, { useState } from "react"
import { View, StyleSheet } from "react-native"
import { Chip, useTheme } from "react-native-paper"
import { Slot, useRouter, usePathname } from "expo-router"

const TABS = [
  { label: "Watching", href: "/(tabs)/library/watching" },
  { label: "Want", href: "/(tabs)/library/want-to-watch" },
  { label: "Caught Up", href: "/(tabs)/library/caught-up" },
  { label: "Completed", href: "/(tabs)/library/completed" },
]

export default function LibraryLayout() {
  const theme = useTheme()
  const router = useRouter()
  const pathname = usePathname()

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View
        style={[styles.tabBar, { backgroundColor: theme.colors.surface }]}
      >
        {TABS.map((tab) => {
          const isActive = pathname.includes(tab.href.split("/").pop() ?? "")
          return (
            <Chip
              key={tab.href}
              selected={isActive}
              onPress={() => router.push(tab.href as any)}
              style={styles.chip}
              compact
            >
              {tab.label}
            </Chip>
          )
        })}
      </View>
      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
    gap: 6,
    elevation: 2,
  },
  chip: { flexShrink: 1 },
  content: { flex: 1 },
})
