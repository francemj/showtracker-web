import React, { useEffect, useMemo, useState } from "react"
import {
  Animated,
  View,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  Alert,
} from "react-native"
import { Text, Menu, ActivityIndicator } from "react-native-paper"
import { LinearGradient } from "expo-linear-gradient"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { apiRequest } from "@showtracker/api-client"
import type {
  ShowWithProgress,
  TMDBSeason,
  EpisodeProgress,
} from "@showtracker/shared"
import {
  isEpisodeAired,
  formatAirDate,
  hasUnwatchedEpisodesBefore,
  buildEpisodesToMark,
} from "@showtracker/shared"
import {
  useAppTheme,
  STATUS_COLORS,
  StatusKey,
  STATUS_LABELS,
  SERIF,
  SANS,
  SANS_600,
  SANS_700,
  MONO,
} from "../../lib/theme"
import { CONTENT_MAX_WIDTH, SCREEN_PADDING } from "../../lib/layout"
import {
  STATUS_INVALIDATE_DELAY_MS,
  invalidateStatusRelatedQueries,
} from "../../lib/statusValidation"

const TMDB_W780 = "https://image.tmdb.org/t/p/w780"
const BACKDROP_HEIGHT = 460
const SHOW_DETAIL_VALIDATE_STATUS_THROTTLE_MS = 10 * 60 * 1000

function upsertEpisodeProgress(
  progress: EpisodeProgress[] | undefined,
  seasonNumber: number,
  episodeNumber: number,
  watched: boolean
): EpisodeProgress[] {
  const list = progress ?? []
  const idx = list.findIndex(
    (p) => p.season === seasonNumber && p.episode === episodeNumber
  )
  if (idx === -1) {
    return [...list, { season: seasonNumber, episode: episodeNumber, watched }]
  }
  const next = [...list]
  next[idx] = { ...next[idx], watched }
  return next
}

function upsertManyEpisodeProgress(
  progress: EpisodeProgress[] | undefined,
  entries: Array<{ season: number; episode: number; watched: boolean }>
): EpisodeProgress[] {
  let next = progress ?? []
  for (const entry of entries) {
    next = upsertEpisodeProgress(
      next,
      entry.season,
      entry.episode,
      entry.watched
    )
  }
  return next
}

export default function ShowDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const t = useAppTheme()
  const insets = useSafeAreaInsets()
  const qc = useQueryClient()
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const [statusMenuVisible, setStatusMenuVisible] = useState(false)
  const [moreMenuVisible, setMoreMenuVisible] = useState(false)

  // The backdrop is deliberately full-bleed under the status bar, but once you
  // scroll past it the body text runs under the clock and battery with nothing
  // behind it. Fade a bar of the page background in as the hero leaves.
  const [scrollY] = useState(() => new Animated.Value(0))
  const statusBarOpacity = useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [BACKDROP_HEIGHT - 220, BACKDROP_HEIGHT - 140],
        outputRange: [0, 1],
        extrapolate: "clamp",
      }),
    [scrollY]
  )

  const { data: show, isLoading } = useQuery<ShowWithProgress>({
    queryKey: ["/api/shows", id],
    enabled: !!id,
  })

  const { data: seasons } = useQuery<TMDBSeason[]>({
    queryKey: ["/api/shows", id, "seasons"],
    enabled: !!id,
  })

  const { data: progress } = useQuery<EpisodeProgress[]>({
    queryKey: ["/api/shows", id, "progress"],
    enabled: !!id,
  })

  const activeSeason =
    selectedSeason ??
    seasons?.filter((s) => s.season_number > 0).at(-1)?.season_number ??
    1

  const invalidateShow = () => {
    qc.invalidateQueries({ queryKey: ["/api/shows", id] })
    qc.invalidateQueries({ queryKey: ["/api/shows", id, "progress"] })
    // Library query keys bake their paging and search into the key string
    // ("/api/shows/watching?page=1&limit=6"), so invalidating the bare
    // endpoint matched nothing and Home kept showing the pre-toggle count
    // until a manual pull-to-refresh.
    invalidateStatusRelatedQueries()
  }

  useEffect(() => {
    if (!id) return
    const parsedShowId = parseInt(id, 10)
    if (Number.isNaN(parsedShowId)) return
    const storageKey = `statusValidationShow:${parsedShowId}`

    let cancelled = false
    ;(async () => {
      const raw = await AsyncStorage.getItem(storageKey)
      const last = raw ? parseInt(raw, 10) : 0
      if (last && Date.now() - last < SHOW_DETAIL_VALIDATE_STATUS_THROTTLE_MS)
        return

      try {
        const res = await apiRequest(
          "POST",
          "/api/user/shows/validate-status",
          { showId: parsedShowId }
        )
        if (cancelled || !res.ok) return
        await AsyncStorage.setItem(storageKey, String(Date.now()))
        setTimeout(() => {
          invalidateStatusRelatedQueries()
          qc.invalidateQueries({ queryKey: ["/api/shows", id] })
          qc.invalidateQueries({ queryKey: ["/api/shows", id, "seasons"] })
          qc.invalidateQueries({ queryKey: ["/api/shows", id, "progress"] })
        }, STATUS_INVALIDATE_DELAY_MS)
      } catch {
        // Best-effort background refresh; ignore failures
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id, qc])

  const progressQueryKey = ["/api/shows", id, "progress"]

  const toggleEpisode = useMutation<
    Response,
    Error,
    { seasonNumber: number; episodeNumber: number; watched: boolean },
    { prev?: EpisodeProgress[] }
  >({
    mutationFn: ({ seasonNumber, episodeNumber, watched }) =>
      apiRequest("POST", `/api/shows/${id}/progress`, {
        season: seasonNumber,
        episode: episodeNumber,
        watched,
      }),
    onMutate: async ({ seasonNumber, episodeNumber, watched }) => {
      await qc.cancelQueries({ queryKey: progressQueryKey })
      const prev = qc.getQueryData<EpisodeProgress[]>(progressQueryKey)
      qc.setQueryData<EpisodeProgress[]>(progressQueryKey, (old) =>
        upsertEpisodeProgress(old, seasonNumber, episodeNumber, watched)
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(progressQueryKey, ctx.prev)
      Alert.alert("Error", "This episode hasn't aired yet.")
    },
    onSettled: invalidateShow,
  })

  const markAllSeason = useMutation<
    Response,
    Error,
    { seasonNumber: number; watched: boolean; episodeNumbers: number[] },
    { prev?: EpisodeProgress[] }
  >({
    mutationFn: ({ seasonNumber, watched }) =>
      apiRequest("POST", `/api/shows/${id}/season/${seasonNumber}/mark-all`, {
        watched,
      }),
    onMutate: async ({ seasonNumber, watched, episodeNumbers }) => {
      await qc.cancelQueries({ queryKey: progressQueryKey })
      const prev = qc.getQueryData<EpisodeProgress[]>(progressQueryKey)
      qc.setQueryData<EpisodeProgress[]>(progressQueryKey, (old) =>
        upsertManyEpisodeProgress(
          old,
          episodeNumbers.map((episode) => ({
            season: seasonNumber,
            episode,
            watched,
          }))
        )
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(progressQueryKey, ctx.prev)
      Alert.alert("Error", "Failed to update season. Please try again.")
    },
    onSettled: invalidateShow,
  })

  const markPrevious = useMutation<
    Response,
    Error,
    { episodes: Array<{ season: number; episode: number; watched: boolean }> },
    { prev?: EpisodeProgress[] }
  >({
    mutationFn: ({ episodes }) =>
      apiRequest("POST", `/api/shows/${id}/progress/bulk`, { episodes }),
    onMutate: async ({ episodes }) => {
      await qc.cancelQueries({ queryKey: progressQueryKey })
      const prev = qc.getQueryData<EpisodeProgress[]>(progressQueryKey)
      qc.setQueryData<EpisodeProgress[]>(progressQueryKey, (old) =>
        upsertManyEpisodeProgress(old, episodes)
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(progressQueryKey, ctx.prev)
      Alert.alert("Error", "Failed to mark episodes. Please try again.")
    },
    onSettled: invalidateShow,
  })

  function handleEpisodeTap(
    seasonNumber: number,
    episodeNumber: number,
    nextWatched: boolean
  ) {
    if (
      nextWatched &&
      hasUnwatchedEpisodesBefore(seasons, progress, seasonNumber, episodeNumber)
    ) {
      Alert.alert(
        "Mark Previous Episodes?",
        `Would you like to mark all previous episodes as watched? This will mark all episodes before S${seasonNumber}E${episodeNumber} as watched.`,
        [
          {
            text: "Just This Episode",
            onPress: () =>
              toggleEpisode.mutate({
                seasonNumber,
                episodeNumber,
                watched: true,
              }),
          },
          {
            text: "Mark All Previous",
            onPress: () =>
              markPrevious.mutate({
                episodes: buildEpisodesToMark(
                  seasons,
                  progress,
                  seasonNumber,
                  episodeNumber
                ),
              }),
          },
          { text: "Cancel", style: "cancel" },
        ]
      )
      return
    }
    toggleEpisode.mutate({ seasonNumber, episodeNumber, watched: nextWatched })
  }

  const addShow = useMutation({
    mutationFn: (status: string) =>
      apiRequest("POST", "/api/user/shows", { showId: Number(id), status }),
    onSuccess: () => {
      invalidateShow()
      qc.invalidateQueries({ queryKey: ["/api/user/shows"] })
    },
    onError: (error: Error) =>
      Alert.alert("Couldn't add this show", error.message),
  })

  // Stopping is the only manual status change in the product. It soft-deletes
  // to `stopped` and keeps every watched episode, so the menu says what it
  // does rather than "Remove from collection".
  const stopTracking = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/user/shows/${id}`),
    onSuccess: () => {
      invalidateShow()
      qc.invalidateQueries({ queryKey: ["/api/user/shows"] })
    },
    onError: (error: Error) =>
      Alert.alert("Couldn't stop tracking", error.message),
  })

  // The server recomputes where a resumed show belongs; naming a destination
  // from the client only gets overwritten by the next validation sweep.
  const resumeTracking = useMutation({
    mutationFn: () => apiRequest("POST", `/api/user/shows/${id}/resume`),
    onSuccess: async (res) => {
      const { status } = (await res.json()) as { status: StatusKey }
      invalidateShow()
      qc.invalidateQueries({ queryKey: ["/api/user/shows"] })
      Alert.alert("Tracking resumed", `Moved back to ${STATUS_LABELS[status]}.`)
    },
    onError: (error: Error) =>
      Alert.alert("Couldn't resume tracking", error.message),
  })

  function confirmStopTracking() {
    Alert.alert(
      "Stop tracking?",
      "This moves the show to your Stopped list. Your watch progress is kept, and you can resume any time.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Stop Tracking",
          style: "destructive",
          onPress: () => stopTracking.mutate(),
        },
      ]
    )
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    )
  }

  if (!show) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <Text style={{ color: t.fg, fontFamily: SERIF, fontSize: 20 }}>
          Show not found.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backFallback}
        >
          <Text style={{ color: t.accent, fontFamily: SANS_600 }}>
            ← Go back
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  const backdropUri = show.backdropPath
    ? `${TMDB_W780}${show.backdropPath}`
    : show.posterPath
      ? `${TMDB_W780}${show.posterPath}`
      : null

  const isInCollection = !!show.userShow
  const currentStatus = show.userShow?.status as StatusKey | undefined
  const sp = currentStatus
    ? STATUS_COLORS[currentStatus]
    : STATUS_COLORS.want_to_watch

  const watchedSet = new Set(
    (progress ?? [])
      .filter((p) => p.watched)
      .map((p) => `${p.season}x${p.episode}`)
  )

  const regularSeasons = seasons?.filter((s) => s.season_number > 0) ?? []
  const activeSeasonData = regularSeasons.find(
    (s) => s.season_number === activeSeason
  )

  const progressPct =
    show.watchedEpisodes != null &&
    show.totalEpisodes != null &&
    show.totalEpisodes > 0
      ? show.watchedEpisodes / show.totalEpisodes
      : 0

  const nextEp = show.nextEpisode

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.statusBarScrim,
          {
            height: insets.top,
            backgroundColor: t.bg,
            opacity: statusBarOpacity,
          },
        ]}
      />
      <Animated.ScrollView
        style={{ backgroundColor: t.bg }}
        contentContainerStyle={{ paddingBottom: 48 }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* Cinematic backdrop */}
        <View style={styles.backdropContainer}>
          {backdropUri ? (
            <ImageBackground
              source={{ uri: backdropUri }}
              style={styles.backdrop}
              resizeMode="cover"
            >
              <LinearGradient
                colors={[
                  "rgba(0,0,0,0.45)",
                  "transparent",
                  "rgba(0,0,0,0.55)",
                  "rgba(0,0,0,0.55)",
                  t.bg,
                ]}
                locations={[0, 0.35, 0.72, 0.94, 1]}
                style={StyleSheet.absoluteFill}
              />
              <BackdropChrome
                onBack={() => router.back()}
                onMore={() => setMoreMenuVisible(true)}
                moreMenuVisible={moreMenuVisible}
                onDismissMore={() => setMoreMenuVisible(false)}
                insets={insets}
                isInCollection={isInCollection}
                isStopped={currentStatus === "stopped"}
                onStop={() => {
                  setMoreMenuVisible(false)
                  confirmStopTracking()
                }}
                onResume={() => {
                  setMoreMenuVisible(false)
                  resumeTracking.mutate()
                }}
              />
            </ImageBackground>
          ) : (
            <View style={[styles.backdrop, { backgroundColor: t.surfaceAlt }]}>
              <BackdropChrome
                onBack={() => router.back()}
                onMore={() => setMoreMenuVisible(true)}
                moreMenuVisible={moreMenuVisible}
                onDismissMore={() => setMoreMenuVisible(false)}
                insets={insets}
                isInCollection={isInCollection}
                isStopped={currentStatus === "stopped"}
                onStop={() => {
                  setMoreMenuVisible(false)
                  confirmStopTracking()
                }}
                onResume={() => {
                  setMoreMenuVisible(false)
                  resumeTracking.mutate()
                }}
              />
            </View>
          )}
        </View>

        {/* Pulled-up info block */}
        <View style={[styles.infoBlock, { marginTop: -140 }]}>
          <View style={styles.chips}>
            {currentStatus && (
              <View
                style={[styles.statusChip, { backgroundColor: sp.light.solid }]}
              >
                <Text style={styles.statusChipText}>
                  {STATUS_LABELS[currentStatus].toUpperCase()}
                </Text>
              </View>
            )}
            {show.firstAirDate && (
              <View style={[styles.darkChip]}>
                <Text style={styles.darkChipText}>
                  {show.firstAirDate.slice(0, 4)}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.showTitle}>{show.name}</Text>
          <Text style={styles.showMeta}>
            {show.genres?.join(" · ")}
            {regularSeasons.length > 0
              ? ` · ${regularSeasons.length} season${regularSeasons.length !== 1 ? "s" : ""}`
              : ""}
          </Text>
        </View>

        {/* Overview */}
        {show.overview && (
          <View style={styles.overviewBlock}>
            <Text style={[styles.overview, { color: t.fgMuted }]}>
              {show.overview}
            </Text>
          </View>
        )}

        {/* Add to collection (if not in) */}
        {!isInCollection && (
          <View style={styles.actionBlock}>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: t.accent }]}
              onPress={() => addShow.mutate("want_to_watch")}
              activeOpacity={0.8}
            >
              {addShow.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.addBtnText}>Add to Collection</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Stopped: resume is the way back, not a stray episode tap */}
        {isInCollection && currentStatus === "stopped" && (
          <View style={styles.actionBlock}>
            <Text
              style={{
                color: t.fgMuted,
                fontFamily: SANS,
                fontSize: 13.5,
                marginBottom: 12,
              }}
            >
              You've stopped tracking this show. Your progress is saved.
            </Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: t.accent }]}
              onPress={() => resumeTracking.mutate()}
              disabled={resumeTracking.isPending}
              activeOpacity={0.8}
            >
              {resumeTracking.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.addBtnText}>Resume tracking</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Progress */}
        {isInCollection &&
          show.watchedEpisodes != null &&
          show.totalEpisodes != null && (
            <View style={styles.progressBlock}>
              <View style={styles.progressHeader}>
                <Text style={[styles.sectionTitle, { color: t.fg }]}>
                  Progress
                </Text>
                <Text style={[styles.progressCount, { color: t.fg }]}>
                  {show.watchedEpisodes}/{show.totalEpisodes} ·{" "}
                  {Math.round(progressPct * 100)}%
                </Text>
              </View>
              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: t.surfaceAlt },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progressPct * 100}%` as any,
                      backgroundColor: sp.light.solid,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressActions}>
                <TouchableOpacity
                  style={[styles.nextBtn, { backgroundColor: sp.light.solid }]}
                  onPress={() => {
                    if (nextEp) {
                      toggleEpisode.mutate({
                        seasonNumber: nextEp.season,
                        episodeNumber: nextEp.episode,
                        watched: true,
                      })
                    }
                  }}
                  disabled={!nextEp || toggleEpisode.isPending}
                  activeOpacity={0.8}
                >
                  <Text style={styles.nextBtnText}>
                    {nextEp
                      ? `Next: S${nextEp.season} E${nextEp.episode}`
                      : "Up to date"}
                  </Text>
                </TouchableOpacity>
                <Menu
                  visible={statusMenuVisible}
                  onDismiss={() => setStatusMenuVisible(false)}
                  anchor={
                    <TouchableOpacity
                      style={[styles.moreBtn, { borderColor: t.border }]}
                      onPress={() => setStatusMenuVisible(true)}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="More options"
                    >
                      <Text style={[styles.moreBtnText, { color: t.fg }]}>
                        ···
                      </Text>
                    </TouchableOpacity>
                  }
                >
                  <CollectionMenuItems
                    isStopped={currentStatus === "stopped"}
                    onStop={() => {
                      setStatusMenuVisible(false)
                      confirmStopTracking()
                    }}
                    onResume={() => {
                      setStatusMenuVisible(false)
                      resumeTracking.mutate()
                    }}
                  />
                </Menu>
              </View>
            </View>
          )}

        {/* Episodes */}
        {regularSeasons.length > 0 && (
          <View style={styles.episodesBlock}>
            <Text style={[styles.sectionTitle, { color: t.fg }]}>Episodes</Text>

            {/* Season pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.seasonPills}
            >
              {regularSeasons.map((s) => {
                const isActive = s.season_number === activeSeason
                return (
                  <TouchableOpacity
                    key={s.season_number}
                    style={[
                      styles.seasonPill,
                      {
                        backgroundColor: isActive ? t.fg : "transparent",
                        borderColor: isActive ? t.fg : t.border,
                      },
                    ]}
                    onPress={() => setSelectedSeason(s.season_number)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.seasonPillText,
                        { color: isActive ? t.bg : t.fgMuted },
                      ]}
                    >
                      Season {s.season_number}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>

            {/* Mark all row */}
            {activeSeasonData && (
              <View
                style={[styles.markAllRow, { borderBottomColor: t.border }]}
              >
                <Text style={[styles.markAllSeasonName, { color: t.fg }]}>
                  {activeSeasonData.name ?? `Season ${activeSeason}`}
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  // The label alone is a ~50x17pt target, well under the 44pt
                  // minimum — taps aimed at it land beside it and do nothing.
                  hitSlop={{ top: 14, bottom: 14, left: 16, right: 16 }}
                  accessibilityLabel={`Mark every episode of ${
                    activeSeasonData.name ?? `season ${activeSeason}`
                  } watched`}
                  onPress={() => {
                    const isFullyWatched = activeSeasonData.episodes?.every(
                      (ep) =>
                        watchedSet.has(
                          `${ep.season_number}x${ep.episode_number}`
                        )
                    )
                    markAllSeason.mutate({
                      seasonNumber: activeSeason,
                      watched: !isFullyWatched,
                      episodeNumbers:
                        activeSeasonData.episodes?.map(
                          (ep) => ep.episode_number
                        ) ?? [],
                    })
                  }}
                  disabled={markAllSeason.isPending}
                >
                  <Text style={[styles.markAllText, { color: t.accent }]}>
                    {markAllSeason.isPending ? "…" : "Mark All"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Episode rows */}
            {activeSeasonData?.episodes?.map((ep) => {
              const watched = watchedSet.has(
                `${ep.season_number}x${ep.episode_number}`
              )
              const hasAired = isEpisodeAired(ep.air_date)
              const isCurrentSp = currentStatus
                ? STATUS_COLORS[currentStatus]
                : STATUS_COLORS.watching
              return (
                <TouchableOpacity
                  key={`${ep.season_number}x${ep.episode_number}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: watched, disabled: !hasAired }}
                  accessibilityLabel={`S${ep.season_number} E${ep.episode_number}${
                    ep.name ? `, ${ep.name}` : ""
                  }${hasAired ? "" : ", not aired yet"}`}
                  style={[
                    styles.episodeRow,
                    { borderBottomColor: t.border },
                    !watched && !hasAired && { opacity: 0.4 },
                  ]}
                  onPress={() =>
                    handleEpisodeTap(
                      ep.season_number,
                      ep.episode_number,
                      !watched
                    )
                  }
                  disabled={
                    (!watched && !hasAired) ||
                    toggleEpisode.isPending ||
                    markPrevious.isPending
                  }
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.episodeToggle,
                      // Dim the row's content, not the row: the "Upcoming" tag
                      // is the non-colour cue and has to stay readable.
                      !watched && !hasAired && styles.dimmed,
                      {
                        backgroundColor: watched
                          ? isCurrentSp.light.solid
                          : "transparent",
                        borderColor: watched
                          ? isCurrentSp.light.solid
                          : t.borderStrong,
                      },
                    ]}
                  >
                    {watched ? (
                      <Text style={styles.episodeCheck}>✓</Text>
                    ) : (
                      <Text style={[styles.episodeNum, { color: t.fgMuted }]}>
                        {ep.episode_number}
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.episodeInfo,
                      !watched && !hasAired && styles.dimmed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.episodeName,
                        { color: watched ? t.fgMuted : t.fg },
                      ]}
                      numberOfLines={1}
                    >
                      {ep.name}
                    </Text>
                    <Text style={[styles.episodeMeta, { color: t.fgFaint }]}>
                      S{ep.season_number} · E{ep.episode_number}
                      {ep.air_date
                        ? `  ·  ${formatAirDate(ep.air_date, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}`
                        : ""}
                    </Text>
                  </View>
                  {!hasAired && (
                    <View
                      style={[
                        styles.upcomingTag,
                        { borderColor: t.borderStrong },
                      ]}
                    >
                      <Text
                        style={[styles.upcomingTagText, { color: t.fgMuted }]}
                      >
                        Upcoming
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </Animated.ScrollView>
    </>
  )
}

function CollectionMenuItems({
  isStopped,
  onStop,
  onResume,
}: {
  isStopped: boolean
  onStop: () => void
  onResume: () => void
}) {
  if (isStopped) {
    return <Menu.Item title="Resume tracking" onPress={onResume} />
  }
  return (
    <Menu.Item
      title="Stop tracking"
      titleStyle={{ color: "#c03030" }}
      onPress={onStop}
    />
  )
}

function BackdropChrome({
  onBack,
  onMore,
  moreMenuVisible,
  onDismissMore,
  insets,
  isInCollection,
  isStopped,
  onStop,
  onResume,
}: {
  onBack: () => void
  onMore: () => void
  moreMenuVisible: boolean
  onDismissMore: () => void
  insets: { top: number }
  isInCollection: boolean
  isStopped: boolean
  onStop: () => void
  onResume: () => void
}) {
  return (
    <View style={[styles.backdropNav, { paddingTop: insets.top + 12 }]}>
      <TouchableOpacity
        style={styles.glassBtn}
        onPress={onBack}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Text style={styles.glassBtnText}>‹</Text>
      </TouchableOpacity>
      <Menu
        visible={moreMenuVisible}
        onDismiss={onDismissMore}
        anchor={
          <TouchableOpacity
            style={styles.glassBtn}
            onPress={onMore}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="More options"
          >
            <Text style={styles.glassBtnText}>⋮</Text>
          </TouchableOpacity>
        }
      >
        {isInCollection && (
          <CollectionMenuItems
            isStopped={isStopped}
            onStop={onStop}
            onResume={onResume}
          />
        )}
      </Menu>
    </View>
  )
}

// Every body block shares one centred column. Without it, an iPad renders the
// overview at ~140 characters a line and pins the episode rows to the far left
// of a 1032pt screen.
const contentColumn = {
  paddingHorizontal: SCREEN_PADDING,
  width: "100%" as const,
  maxWidth: CONTENT_MAX_WIDTH + SCREEN_PADDING * 2,
  alignSelf: "center" as const,
}

const styles = StyleSheet.create({
  statusBarScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  dimmed: {
    opacity: 0.4,
  },
  upcomingTag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  upcomingTagText: {
    fontFamily: SANS_600,
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  backFallback: {
    marginTop: 8,
  },
  backdropContainer: {
    height: 460,
  },
  backdrop: {
    width: "100%",
    height: 460,
    justifyContent: "space-between",
  },
  backdropNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  glassBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  glassBtnText: {
    color: "#fff",
    fontSize: 20,
    fontFamily: SANS_600,
    lineHeight: 24,
  },
  infoBlock: {
    ...contentColumn,
    position: "relative",
  },
  chips: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statusChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusChipText: {
    fontFamily: SANS_700,
    fontSize: 10.5,
    color: "#fff",
    letterSpacing: 0.5,
  },
  darkChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  darkChipText: {
    fontFamily: MONO,
    fontSize: 10.5,
    color: "#fff",
  },
  showTitle: {
    fontFamily: SERIF,
    fontSize: 44,
    color: "#fff",
    letterSpacing: -0.8,
    lineHeight: 48,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  showMeta: {
    fontFamily: SANS,
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  overviewBlock: {
    ...contentColumn,
    marginTop: 24,
  },
  overview: {
    fontFamily: SANS,
    fontSize: 14,
    lineHeight: 22,
  },
  actionBlock: {
    ...contentColumn,
    marginTop: 20,
  },
  addBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  addBtnText: {
    fontFamily: SANS_700,
    fontSize: 14,
    color: "#fff",
  },
  progressBlock: {
    ...contentColumn,
    marginTop: 20,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: SERIF,
    fontSize: 24,
    letterSpacing: -0.3,
  },
  progressCount: {
    fontFamily: MONO,
    fontSize: 13,
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  nextBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  nextBtnText: {
    fontFamily: SANS_700,
    fontSize: 13.5,
    color: "#fff",
    letterSpacing: -0.1,
  },
  moreBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  moreBtnText: {
    fontFamily: SANS_600,
    fontSize: 14,
    letterSpacing: 2,
  },
  episodesBlock: {
    ...contentColumn,
    marginTop: 24,
  },
  seasonPills: {
    gap: 8,
    paddingTop: 12,
    paddingBottom: 14,
  },
  seasonPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  seasonPillText: {
    fontFamily: SANS_600,
    fontSize: 12,
  },
  markAllRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    marginBottom: 4,
    borderBottomWidth: 1,
  },
  markAllSeasonName: {
    fontFamily: SANS_600,
    fontSize: 14,
  },
  markAllText: {
    fontFamily: SANS_600,
    fontSize: 13,
  },
  episodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  episodeToggle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  episodeCheck: {
    color: "#fff",
    fontSize: 13,
    fontFamily: SANS_700,
  },
  episodeNum: {
    fontFamily: MONO,
    fontSize: 11,
  },
  episodeInfo: {
    flex: 1,
    minWidth: 0,
  },
  episodeName: {
    fontFamily: SANS,
    fontSize: 14.5,
    letterSpacing: -0.1,
  },
  episodeMeta: {
    fontFamily: MONO,
    fontSize: 11.5,
    marginTop: 2,
  },
})
