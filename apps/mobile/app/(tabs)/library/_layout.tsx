import React from "react"
import { View, ScrollView, TouchableOpacity, StyleSheet } from "react-native"
import { Text } from "react-native-paper"
import { Slot, useRouter, usePathname } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useQuery } from "@tanstack/react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  useAppTheme,
  STATUS_COLORS,
  SERIF,
  SANS,
  SANS_700,
  MONO,
} from "../../../lib/theme"
import {
  STATUS_ORDER,
  STATUS_SLUG,
  type StatusKey,
} from "@showtracker/shared/status"

type ShowsResponse = { shows: unknown[]; total: number }

// Full-length labels; the short ones in theme.ts are for poster badges.
const TAB_LABELS: Record<StatusKey, string> = {
  watching: "Watching",
  want_to_watch: "Want to Watch",
  caught_up: "Caught Up",
  completed: "Completed",
  stopped: "Stopped",
}

const TABS = STATUS_ORDER.map((id) => ({
  id,
  label: TAB_LABELS[id],
  href: `/(tabs)/library/${STATUS_SLUG[id]}`,
  segment: STATUS_SLUG[id],
}))

function StatusDot({ color, size = 6 }: { color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
      }}
    />
  )
}

export default function LibraryLayout() {
  const t = useAppTheme()
  const router = useRouter()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()

  // Fetch total counts for each tab
  const { data: watchingData } = useQuery<ShowsResponse>({
    queryKey: ["/api/shows/watching?page=1&limit=1"],
  })
  const { data: wtwData } = useQuery<ShowsResponse>({
    queryKey: ["/api/shows/want-to-watch?page=1&limit=1"],
  })
  const { data: cuData } = useQuery<ShowsResponse>({
    queryKey: ["/api/shows/caught-up?page=1&limit=1"],
  })
  const { data: compData } = useQuery<ShowsResponse>({
    queryKey: ["/api/shows/completed?page=1&limit=1"],
  })
  const { data: stoppedData } = useQuery<ShowsResponse>({
    queryKey: ["/api/shows/stopped?page=1&limit=1"],
  })

  const totals: Record<StatusKey, number | undefined> = {
    watching: watchingData?.total,
    want_to_watch: wtwData?.total,
    caught_up: cuData?.total,
    completed: compData?.total,
    stopped: stoppedData?.total,
  }

  const activeTab = TABS.find((tab) => pathname.includes(tab.segment))
  const activeCount = activeTab ? totals[activeTab.id] : undefined

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.eyebrow, { color: t.fgFaint }]}>
              {activeCount != null && activeTab
                ? `${activeCount} ${activeTab.label.toUpperCase()}`
                : ""}
            </Text>
            <Text style={[styles.title, { color: t.fg }]}>Library</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/profile")}
            style={styles.profileBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Profile and settings"
          >
            <Ionicons
              name="person-circle-outline"
              size={28}
              color={t.fgMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Underline tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.tabsContent,
          { borderBottomColor: t.border },
        ]}
        style={styles.tabsScroll}
      >
        {TABS.map((tab) => {
          const isActive = pathname.includes(tab.segment)
          const sp = STATUS_COLORS[tab.id]
          const solidColor = sp.light.solid
          const count = totals[tab.id]
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => router.push(tab.href as any)}
              style={[
                styles.tab,
                {
                  borderBottomColor: isActive ? solidColor : "transparent",
                  borderBottomWidth: 2,
                },
              ]}
              activeOpacity={0.7}
            >
              <StatusDot color={solidColor} />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? t.fg : t.fgMuted,
                    fontFamily: isActive ? SANS_700 : SANS,
                  },
                ]}
              >
                {tab.label}
              </Text>
              {count != null && (
                <Text style={[styles.tabCount, { color: t.fgFaint }]}>
                  {count}
                </Text>
              )}
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 22,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  profileBtn: {
    marginBottom: 6,
  },
  eyebrow: {
    fontFamily: SANS,
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: {
    fontFamily: SERIF,
    fontSize: 44,
    letterSpacing: -0.8,
    lineHeight: 44,
  },
  tabsScroll: {
    flexGrow: 0,
  },
  tabsContent: {
    paddingHorizontal: 22,
    gap: 18,
    borderBottomWidth: 1,
    paddingBottom: 0,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 12,
    marginBottom: -1,
  },
  tabLabel: {
    fontSize: 13.5,
  },
  tabCount: {
    fontFamily: MONO,
    fontSize: 11,
  },
  content: {
    flex: 1,
  },
})
