import React from "react"
import {
  FlatList,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Text,
  ActivityIndicator,
} from "react-native"
import { useRouter } from "expo-router"
import type { ShowWithProgress } from "@showtracker/shared"
import {
  useAppTheme,
  StatusKey,
  SERIF_ITALIC,
  SANS,
  SANS_600,
  SANS_700,
  MONO,
} from "../lib/theme"

const TMDB_W342 = "https://image.tmdb.org/t/p/w342"
const SCREEN_WIDTH = Dimensions.get("window").width
const POSTER_WIDTH = Math.floor((SCREEN_WIDTH - 22 * 2 - 18) / 2)
const POSTER_HEIGHT = Math.floor(POSTER_WIDTH * 1.5)

type Props = {
  shows: ShowWithProgress[] | undefined
  isLoading: boolean
  status: StatusKey
  emptyMessage?: string
  onEndReached?: () => void
  isFetchingNextPage?: boolean
}

function SkeletonCard() {
  const t = useAppTheme()
  return (
    <View style={[styles.cell, { width: POSTER_WIDTH }]}>
      <View
        style={[
          styles.posterSkeleton,
          {
            backgroundColor: t.surfaceAlt,
            width: POSTER_WIDTH,
            height: POSTER_HEIGHT,
          },
        ]}
      />
      <View
        style={[
          styles.skelLine,
          { backgroundColor: t.surfaceAlt, width: "80%", marginTop: 10 },
        ]}
      />
      <View
        style={[
          styles.skelLineSmall,
          { backgroundColor: t.surfaceAlt, width: "50%" },
        ]}
      />
    </View>
  )
}

function EmptyState({
  status: _status,
  t,
}: {
  status: StatusKey
  t: ReturnType<typeof useAppTheme>
}) {
  const router = useRouter()

  return (
    <View style={styles.emptyCenter}>
      <View style={styles.ghostPosters}>
        {[0.5, 0.7, 0.5].map((opacity, i) => (
          <View
            key={i}
            style={[
              styles.ghostPoster,
              {
                borderColor: t.borderStrong,
                opacity,
                width: POSTER_WIDTH * 0.52,
                height: POSTER_HEIGHT * 0.52,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.emptyTitle, { color: t.fg }]}>Nothing here yet</Text>
      <Text style={[styles.emptyBody, { color: t.fgMuted }]}>
        Add shows to start tracking your watch history.
      </Text>
      <TouchableOpacity
        style={[styles.emptyBtn, { backgroundColor: t.fg }]}
        onPress={() => router.push("/(tabs)/search")}
        activeOpacity={0.8}
      >
        <Text style={[styles.emptyBtnText, { color: t.bg }]}>
          Browse Search →
        </Text>
      </TouchableOpacity>
    </View>
  )
}

export function PosterGrid({
  shows,
  isLoading,
  status,
  onEndReached,
  isFetchingNextPage,
}: Props) {
  const t = useAppTheme()
  const router = useRouter()

  if (isLoading) {
    return (
      <View style={styles.grid}>
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </View>
    )
  }

  if (!shows || shows.length === 0) {
    return <EmptyState status={status} t={t} />
  }

  return (
    <FlatList
      data={shows}
      keyExtractor={(item) => String(item.id)}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.listContent}
      style={styles.list}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator style={styles.footerLoader} color={t.fgMuted} />
        ) : null
      }
      renderItem={({ item: show }) => {
        const posterUri = show.posterPath
          ? `${TMDB_W342}${show.posterPath}`
          : null
        const progress =
          show.watchedEpisodes != null &&
          show.totalEpisodes != null &&
          show.totalEpisodes > 0
            ? show.watchedEpisodes / show.totalEpisodes
            : null
        const hasProgress = (show.watchedEpisodes ?? 0) > 0

        return (
          <TouchableOpacity
            style={[styles.cell, { width: POSTER_WIDTH }]}
            onPress={() => router.push(`/shows/${show.id}`)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.posterWrap,
                { width: POSTER_WIDTH, height: POSTER_HEIGHT },
              ]}
            >
              {posterUri ? (
                <Image source={{ uri: posterUri }} style={styles.poster} />
              ) : (
                <View
                  style={[styles.poster, { backgroundColor: t.surfaceAlt }]}
                />
              )}
              {hasProgress && progress != null && (
                <View style={styles.progressOverlay}>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${progress * 100}%` as any },
                      ]}
                    />
                  </View>
                </View>
              )}
              {!hasProgress && show.totalEpisodes != null && (
                <View style={styles.epsBadge}>
                  <Text style={styles.epsBadgeText}>
                    {show.totalEpisodes} eps
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.title, { color: t.fg }]} numberOfLines={1}>
              {show.name}
            </Text>
            <View style={styles.meta}>
              <Text style={[styles.metaText, { color: t.fgMuted }]}>
                {show.firstAirDate?.slice(0, 4) ?? ""}
              </Text>
              {hasProgress &&
                show.watchedEpisodes != null &&
                show.totalEpisodes != null && (
                  <Text style={[styles.metaText, { color: t.fgMuted }]}>
                    {show.watchedEpisodes}/{show.totalEpisodes}
                  </Text>
                )}
            </View>
          </TouchableOpacity>
        )
      }}
    />
  )
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 22,
    gap: 18,
    paddingTop: 18,
  },
  listContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 32,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 18,
  },
  cell: {
    flexShrink: 0,
  },
  posterWrap: {
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  poster: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  progressOverlay: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
  },
  progressTrack: {
    height: 2.5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 999,
  },
  epsBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  epsBadgeText: {
    fontFamily: MONO,
    fontSize: 10,
    color: "#fff",
  },
  title: {
    fontFamily: SANS_600,
    fontSize: 14,
    letterSpacing: -0.1,
    marginTop: 10,
    lineHeight: 18,
  },
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  metaText: {
    fontFamily: MONO,
    fontSize: 11,
  },
  footerLoader: {
    marginVertical: 20,
  },
  // Skeleton
  posterSkeleton: {
    borderRadius: 10,
  },
  skelLine: {
    height: 13,
    borderRadius: 4,
  },
  skelLineSmall: {
    height: 11,
    borderRadius: 4,
    marginTop: 5,
  },
  // Empty state
  emptyCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    paddingTop: 56,
  },
  ghostPosters: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },
  ghostPoster: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  emptyTitle: {
    fontFamily: SERIF_ITALIC,
    fontSize: 32,
    letterSpacing: -0.4,
    lineHeight: 36,
    textAlign: "center",
  },
  emptyBody: {
    fontFamily: SANS,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 280,
  },
  emptyBtn: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  emptyBtnText: {
    fontFamily: SANS_700,
    fontSize: 13.5,
    letterSpacing: -0.1,
  },
})
