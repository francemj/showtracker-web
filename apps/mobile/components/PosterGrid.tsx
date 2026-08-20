import React from "react"
import {
  FlatList,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Text,
  ActivityIndicator,
  RefreshControl,
} from "react-native"
import { useRouter } from "expo-router"
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs"
import type { ShowWithProgress } from "@showtracker/shared"
import {
  useAppTheme,
  StatusKey,
  SERIF_ITALIC,
  SANS,
  SANS_600,
  SANS_700,
  MONO,
  MONO_500,
} from "../lib/theme"
import { useGridMetrics } from "../lib/layout"

const TMDB_W342 = "https://image.tmdb.org/t/p/w342"

type Props = {
  shows: ShowWithProgress[] | undefined
  isLoading: boolean
  status: StatusKey
  isError?: boolean
  error?: Error | null
  onRetry?: () => void
  filter?: string
  onClearFilter?: () => void
  onEndReached?: () => void
  isFetchingNextPage?: boolean
  onRefresh?: () => void
  refreshing?: boolean
}

// Each tab is empty for a different reason, and only two of them are fixed by
// adding more shows. Telling someone with 28 shows to "add shows to start
// tracking" because their Stopped tab is empty is worse than saying nothing.
const EMPTY_COPY: Record<
  StatusKey,
  { title: string; body: string; browse: boolean }
> = {
  watching: {
    title: "Nothing in progress",
    body: "Shows you've started but haven't finished appear here.",
    browse: true,
  },
  want_to_watch: {
    title: "Nothing on the list",
    body: "Shows you want to get to appear here.",
    browse: true,
  },
  caught_up: {
    title: "Nothing to catch up on",
    body: "Shows where you've watched every episode that's aired appear here.",
    browse: false,
  },
  completed: {
    title: "Nothing completed yet",
    body: "Shows you've watched all the way through appear here.",
    browse: false,
  },
  stopped: {
    title: "Nothing stopped",
    body: "Shows you've stopped tracking appear here. Your progress is kept if you resume.",
    browse: false,
  },
}

function SkeletonCard({
  posterWidth,
  posterHeight,
}: {
  posterWidth: number
  posterHeight: number
}) {
  const t = useAppTheme()
  return (
    <View style={[styles.cell, { width: posterWidth }]}>
      <View
        style={[
          styles.posterSkeleton,
          {
            backgroundColor: t.surfaceAlt,
            width: posterWidth,
            height: posterHeight,
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

function PlaceholderState({
  t,
  title,
  body,
  actionLabel,
  onAction,
  posterWidth,
  posterHeight,
}: {
  t: ReturnType<typeof useAppTheme>
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
  posterWidth: number
  posterHeight: number
}) {
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
                width: posterWidth * 0.52,
                height: posterHeight * 0.52,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.emptyTitle, { color: t.fg }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: t.fgMuted }]}>{body}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.emptyBtn, { backgroundColor: t.fg }]}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text style={[styles.emptyBtnText, { color: t.bg }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export function PosterGrid({
  shows,
  isLoading,
  status,
  isError,
  error,
  onRetry,
  filter,
  onClearFilter,
  onEndReached,
  isFetchingNextPage,
  onRefresh,
  refreshing,
}: Props) {
  const t = useAppTheme()
  const router = useRouter()
  const tabBarHeight = useBottomTabBarHeight()
  const { columns, posterWidth, posterHeight } = useGridMetrics()

  if (isLoading) {
    return (
      <View style={styles.grid}>
        {Array.from({ length: columns * 2 }, (_, i) => (
          <SkeletonCard
            key={i}
            posterWidth={posterWidth}
            posterHeight={posterHeight}
          />
        ))}
      </View>
    )
  }

  // The query client retries nothing, so a failed fetch stays failed until
  // someone asks again. Say so, and offer the retry.
  if (isError) {
    return (
      <PlaceholderState
        t={t}
        title="Couldn't load your shows"
        body={error?.message ?? "Something went wrong. Please try again."}
        actionLabel={onRetry ? "Try again" : undefined}
        onAction={onRetry}
        posterWidth={posterWidth}
        posterHeight={posterHeight}
      />
    )
  }

  if (!shows || shows.length === 0) {
    if (filter) {
      return (
        <PlaceholderState
          t={t}
          title="No matches"
          body={`Nothing here matches “${filter}”.`}
          actionLabel={onClearFilter ? "Clear filter" : undefined}
          onAction={onClearFilter}
          posterWidth={posterWidth}
          posterHeight={posterHeight}
        />
      )
    }
    const copy = EMPTY_COPY[status]
    return (
      <PlaceholderState
        t={t}
        title={copy.title}
        body={copy.body}
        actionLabel={copy.browse ? "Browse Search →" : undefined}
        onAction={copy.browse ? () => router.push("/(tabs)/search") : undefined}
        posterWidth={posterWidth}
        posterHeight={posterHeight}
      />
    )
  }

  return (
    <FlatList
      data={shows}
      keyExtractor={(item) => String(item.id)}
      key={`columns-${columns}`}
      numColumns={columns}
      columnWrapperStyle={styles.row}
      contentContainerStyle={[
        styles.listContent,
        { paddingBottom: tabBarHeight + 32 },
      ]}
      style={styles.list}
      // Without this the first tap while the filter keyboard is up only
      // dismisses the keyboard, and the row you aimed at never opens.
      keyboardShouldPersistTaps="handled"
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={t.fg}
            colors={[t.fg]}
          />
        ) : undefined
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator style={styles.footerLoader} color={t.fgMuted} />
        ) : null
      }
      renderItem={({ item: show }) => {
        const posterUri = show.posterPath
          ? `${TMDB_W342}${show.posterPath}`
          : null
        const isCaughtUp = status === "caught_up"
        const progress =
          show.watchedEpisodes != null &&
          show.totalEpisodes != null &&
          show.totalEpisodes > 0
            ? show.watchedEpisodes / show.totalEpisodes
            : null
        const hasProgress = (show.watchedEpisodes ?? 0) > 0

        return (
          <TouchableOpacity
            style={[styles.cell, { width: posterWidth }]}
            onPress={() => router.push(`/shows/${show.id}`)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={
              hasProgress &&
              show.watchedEpisodes != null &&
              show.totalEpisodes != null
                ? `${show.name}, ${show.watchedEpisodes} of ${show.totalEpisodes} episodes watched`
                : show.name
            }
          >
            <View
              style={[
                styles.posterWrap,
                { width: posterWidth, height: posterHeight },
              ]}
            >
              {posterUri ? (
                <Image source={{ uri: posterUri }} style={styles.poster} />
              ) : (
                <View
                  style={[styles.poster, { backgroundColor: t.surfaceAlt }]}
                />
              )}
              {isCaughtUp &&
                show.nextEpisode &&
                show.nextEpisode.daysUntil != null && (
                  <View style={styles.upcomingBadge}>
                    <Text style={styles.upcomingBadgeText}>
                      S{show.nextEpisode.season}E{show.nextEpisode.episode}{" "}
                      {show.nextEpisode.daysUntil === 0
                        ? "today"
                        : `in ${show.nextEpisode.daysUntil}d`}
                    </Text>
                  </View>
                )}
              {!isCaughtUp && hasProgress && progress != null && (
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
              {!isCaughtUp && !hasProgress && show.totalEpisodes != null && (
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
  },
  row: {
    // Not space-between: a partial last row would spread its posters across
    // the full width instead of lining them up under the row above.
    gap: 18,
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
  upcomingBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  upcomingBadgeText: {
    fontFamily: MONO_500,
    fontSize: 9.5,
    color: "#fff",
    letterSpacing: 0.2,
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
