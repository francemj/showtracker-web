import React from "react"
import { View, Image, TouchableOpacity, StyleSheet } from "react-native"
import { Text, ProgressBar, useTheme } from "react-native-paper"
import { useRouter } from "expo-router"
import type { ShowWithProgress } from "@showtracker/shared"
import { StatusBadge } from "./StatusBadge"

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w300"

type Props = {
  show: ShowWithProgress
  compact?: boolean
}

export function ShowCard({ show, compact = false }: Props) {
  const router = useRouter()
  const theme = useTheme()

  const posterUri = show.posterPath
    ? `${TMDB_IMAGE_BASE}${show.posterPath}`
    : null

  const progress =
    show.progress != null
      ? show.progress / 100
      : show.watchedEpisodes && show.totalEpisodes
        ? show.watchedEpisodes / show.totalEpisodes
        : null

  const isCaughtUp = show.userShow?.status === "caught_up"
  const nextEp = show.nextEpisode
  const hasUpcoming = isCaughtUp && nextEp != null && nextEp.daysUntil >= 0
  const showStatusBadge = show.userShow?.status && (!isCaughtUp || !hasUpcoming)

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: theme.colors.background },
        compact && styles.cardCompact,
      ]}
      onPress={() => router.push(`/shows/${show.id}`)}
      activeOpacity={0.7}
    >
      {posterUri ? (
        <Image source={{ uri: posterUri }} style={styles.poster} />
      ) : (
        <View
          style={[
            styles.poster,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        />
      )}
      <View style={styles.info}>
        <Text
          variant="titleSmall"
          numberOfLines={compact ? 1 : 2}
          style={styles.title}
        >
          {show.name}
        </Text>
        {show.firstAirDate && (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {show.firstAirDate.slice(0, 4)}
          </Text>
        )}
        {showStatusBadge && show.userShow && (
          <View style={styles.badgeRow}>
            <StatusBadge status={show.userShow.status} />
          </View>
        )}
        {hasUpcoming && nextEp && (
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.upcomingBadge,
                { borderColor: "rgba(20,184,166,0.3)" },
              ]}
            >
              <Text
                variant="bodySmall"
                style={{ color: "#0d9488", fontWeight: "500" }}
              >
                S{nextEp.season}E{nextEp.episode}{" "}
                {nextEp.daysUntil === 0
                  ? "today"
                  : `in ${nextEp.daysUntil} ${nextEp.daysUntil === 1 ? "day" : "days"}`}
              </Text>
            </View>
          </View>
        )}
        {progress != null && (
          <View style={styles.progressRow}>
            <ProgressBar
              progress={progress}
              color={theme.colors.primary}
              style={styles.progressBar}
            />
            {show.watchedEpisodes != null && show.totalEpisodes != null && (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {show.watchedEpisodes}/{show.totalEpisodes} eps
              </Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 8,
    marginVertical: 4,
    overflow: "hidden",
    elevation: 1,
  },
  cardCompact: {
    width: 200,
  },
  poster: {
    width: 60,
    height: 90,
  },
  info: {
    flex: 1,
    minWidth: 0,
    padding: 8,
    gap: 4,
  },
  title: {
    fontWeight: "600",
  },
  badgeRow: {
    marginTop: 2,
  },
  progressRow: {
    gap: 2,
    marginTop: 4,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  upcomingBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(20,184,166,0.08)",
  },
})
