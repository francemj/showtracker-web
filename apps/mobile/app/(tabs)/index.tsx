import React from "react"
import { ScrollView, View, StyleSheet, TouchableOpacity } from "react-native"
import { Text, Card, useTheme } from "react-native-paper"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { ShowList } from "../../components/ShowList"
import type { ShowWithProgress } from "@showtracker/shared"

const DASHBOARD_LIMIT = 6

type Stats = {
  totalShows: number
  watchingShows: number
  completedShows: number
  episodesWatched: number
}

type ShowsResponse = {
  shows: ShowWithProgress[]
  total: number
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

function SectionHeader({
  title,
  total,
  href,
}: {
  title: string
  total: number | undefined
  href: string
}) {
  const theme = useTheme()
  const router = useRouter()
  const hasMore = total != null && total > DASHBOARD_LIMIT

  return (
    <View style={styles.sectionHeader}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        {title}
      </Text>
      {hasMore && (
        <TouchableOpacity onPress={() => router.push(href as any)}>
          <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
            See All ({total})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export default function DashboardScreen() {
  const theme = useTheme()

  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  })

  const { data: watching, isLoading: watchingLoading } =
    useQuery<ShowsResponse>({
      queryKey: [`/api/shows/watching?page=1&limit=${DASHBOARD_LIMIT}`],
    })

  const { data: wantToWatch, isLoading: wtwLoading } = useQuery<ShowsResponse>({
    queryKey: [`/api/shows/want-to-watch?page=1&limit=${DASHBOARD_LIMIT}`],
  })

  const { data: caughtUp, isLoading: cuLoading } = useQuery<ShowsResponse>({
    queryKey: [`/api/shows/caught-up?page=1&limit=${DASHBOARD_LIMIT}`],
  })

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
    >
      {stats && (
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard label="Shows" value={stats.totalShows} />
            <StatCard label="Watching" value={stats.watchingShows} />
          </View>
          <View style={styles.statsRow}>
            <StatCard label="Completed" value={stats.completedShows} />
            <StatCard label="Episodes" value={stats.episodesWatched} />
          </View>
        </View>
      )}

      <View style={styles.section}>
        <SectionHeader
          title="Watching"
          total={watching?.total}
          href="/(tabs)/library/watching"
        />
        <ShowList
          shows={watching?.shows}
          isLoading={watchingLoading}
          horizontal
          emptyMessage="Nothing watching yet"
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Want to Watch"
          total={wantToWatch?.total}
          href="/(tabs)/library/want-to-watch"
        />
        <ShowList
          shows={wantToWatch?.shows}
          isLoading={wtwLoading}
          horizontal
          emptyMessage="Nothing queued up"
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Caught Up"
          total={caughtUp?.total}
          href="/(tabs)/library/caught-up"
        />
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
    gap: 8,
  },
  statsRow: {
    flexDirection: "row",
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontWeight: "600",
  },
})
