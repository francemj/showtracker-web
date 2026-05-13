import React from "react"
import { ScrollView, View, StyleSheet } from "react-native"
import { Text, Card, useTheme } from "react-native-paper"
import { useQuery } from "@tanstack/react-query"
import { ShowList } from "../../components/ShowList"
import type { ShowWithProgress } from "@showtracker/shared"

type Stats = {
  totalShows: number
  watchingShows: number
  completedShows: number
  episodesWatched: number
}

function StatCard({ label, value }: { label: string; value: number }) {
  const theme = useTheme()
  return (
    <Card style={styles.statCard}>
      <Card.Content style={styles.statContent}>
        <Text variant="headlineMedium" style={{ color: theme.colors.primary }}>
          {value.toLocaleString()}
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {label}
        </Text>
      </Card.Content>
    </Card>
  )
}

export default function DashboardScreen() {
  const theme = useTheme()

  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  })

  const { data: watching, isLoading: watchingLoading } = useQuery<{
    shows: ShowWithProgress[]
  }>({
    queryKey: ["/api/shows/watching?page=1&limit=6"],
  })

  const { data: wantToWatch, isLoading: wtwLoading } = useQuery<{
    shows: ShowWithProgress[]
  }>({
    queryKey: ["/api/shows/want-to-watch?page=1&limit=6"],
  })

  const { data: caughtUp, isLoading: cuLoading } = useQuery<{
    shows: ShowWithProgress[]
  }>({
    queryKey: ["/api/shows/caught-up?page=1&limit=6"],
  })

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
    >
      {stats && (
        <View style={styles.statsGrid}>
          <StatCard label="Shows" value={stats.totalShows} />
          <StatCard label="Watching" value={stats.watchingShows} />
          <StatCard label="Completed" value={stats.completedShows} />
          <StatCard label="Episodes" value={stats.episodesWatched} />
        </View>
      )}

      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Watching
        </Text>
        <ShowList
          shows={watching?.shows}
          isLoading={watchingLoading}
          horizontal
          emptyMessage="Nothing watching yet"
        />
      </View>

      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Want to Watch
        </Text>
        <ShowList
          shows={wantToWatch?.shows}
          isLoading={wtwLoading}
          horizontal
          emptyMessage="Nothing queued up"
        />
      </View>

      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Caught Up
        </Text>
        <ShowList
          shows={caughtUp?.shows}
          isLoading={cuLoading}
          horizontal
          emptyMessage="Nothing caught up"
        />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 24,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statCard: {
    flex: 1,
  },
  statContent: {
    alignItems: "center",
    paddingVertical: 12,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontWeight: "600",
    paddingHorizontal: 4,
  },
})
