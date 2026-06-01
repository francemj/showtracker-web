import React, { useState } from "react"
import {
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
} from "react-native"
import { Text, Menu, ActivityIndicator } from "react-native-paper"
import { LinearGradient } from "expo-linear-gradient"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiRequest } from "@showtracker/api-client"
import type { ShowWithProgress, TMDBSeason, EpisodeProgress } from "@showtracker/shared"
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

const TMDB_W780 = "https://image.tmdb.org/t/p/w780"


const STATUSES: { value: StatusKey; label: string }[] = [
  { value: "want_to_watch", label: "Want to Watch" },
  { value: "watching", label: "Watching" },
  { value: "caught_up", label: "Caught Up" },
  { value: "completed", label: "Completed" },
  { value: "stopped", label: "Stopped" },
]

export default function ShowDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const t = useAppTheme()
  const insets = useSafeAreaInsets()
  const qc = useQueryClient()
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const [statusMenuVisible, setStatusMenuVisible] = useState(false)
  const [moreMenuVisible, setMoreMenuVisible] = useState(false)

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
    qc.invalidateQueries({ queryKey: ["/api/stats"] })
  }

  const toggleEpisode = useMutation({
    mutationFn: ({
      seasonNumber,
      episodeNumber,
      watched,
    }: {
      seasonNumber: number
      episodeNumber: number
      watched: boolean
    }) =>
      apiRequest("POST", `/api/shows/${id}/progress`, {
        season: seasonNumber,
        episode: episodeNumber,
        watched,
      }),
    onSuccess: invalidateShow,
  })

  const markAllSeason = useMutation({
    mutationFn: ({
      seasonNumber,
      watched,
    }: {
      seasonNumber: number
      watched: boolean
    }) =>
      apiRequest("POST", `/api/shows/${id}/season/${seasonNumber}/mark-all`, {
        watched,
      }),
    onSuccess: invalidateShow,
  })

  const addShow = useMutation({
    mutationFn: (status: string) =>
      apiRequest("POST", "/api/user/shows", { showId: Number(id), status }),
    onSuccess: () => {
      invalidateShow()
      qc.invalidateQueries({ queryKey: ["/api/user/shows"] })
    },
  })

  const removeShow = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/user/shows/${id}`),
    onSuccess: () => {
      invalidateShow()
      qc.invalidateQueries({ queryKey: ["/api/user/shows"] })
      router.back()
    },
  })

  const updateStatus = useMutation({
    mutationFn: (status: string) =>
      apiRequest("POST", "/api/user/shows", { showId: Number(id), status }),
    onSuccess: invalidateShow,
  })

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
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={{ paddingBottom: 48 }}
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
              colors={["rgba(0,0,0,0.4)", "transparent", "transparent", t.bg]}
              locations={[0, 0.3, 0.5, 1]}
              style={StyleSheet.absoluteFill}
            />
            <BackdropChrome
              onBack={() => router.back()}
              onMore={() => setMoreMenuVisible(true)}
              moreMenuVisible={moreMenuVisible}
              onDismissMore={() => setMoreMenuVisible(false)}
              insets={insets}
              isInCollection={isInCollection}
              onRemove={() => {
                removeShow.mutate()
                setMoreMenuVisible(false)
              }}
              onStatusChange={(s) => {
                updateStatus.mutate(s)
                setMoreMenuVisible(false)
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
              onRemove={() => {
                removeShow.mutate()
                setMoreMenuVisible(false)
              }}
              onStatusChange={(s) => {
                updateStatus.mutate(s)
                setMoreMenuVisible(false)
              }}
            />
          </View>
        )}
      </View>

      {/* Pulled-up info block */}
      <View style={[styles.infoBlock, { marginTop: -100 }]}>
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
              style={[styles.progressTrack, { backgroundColor: t.surfaceAlt }]}
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
                  >
                    <Text style={[styles.moreBtnText, { color: t.fg }]}>
                      ···
                    </Text>
                  </TouchableOpacity>
                }
              >
                {STATUSES.map((s) => (
                  <Menu.Item
                    key={s.value}
                    title={s.label}
                    onPress={() => {
                      updateStatus.mutate(s.value)
                      setStatusMenuVisible(false)
                    }}
                  />
                ))}
                <Menu.Item
                  title="Remove from collection"
                  titleStyle={{ color: "#c03030" }}
                  onPress={() => {
                    removeShow.mutate()
                    setStatusMenuVisible(false)
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
            <View style={[styles.markAllRow, { borderBottomColor: t.border }]}>
              <Text style={[styles.markAllSeasonName, { color: t.fg }]}>
                {activeSeasonData.name ?? `Season ${activeSeason}`}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  const isFullyWatched = activeSeasonData.episodes?.every(
                    (ep) =>
                      watchedSet.has(`${ep.season_number}x${ep.episode_number}`)
                  )
                  markAllSeason.mutate({
                    seasonNumber: activeSeason,
                    watched: !isFullyWatched,
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
            const isCurrentSp = currentStatus
              ? STATUS_COLORS[currentStatus]
              : STATUS_COLORS.watching
            return (
              <TouchableOpacity
                key={`${ep.season_number}x${ep.episode_number}`}
                style={[styles.episodeRow, { borderBottomColor: t.border }]}
                onPress={() =>
                  toggleEpisode.mutate({
                    seasonNumber: ep.season_number,
                    episodeNumber: ep.episode_number,
                    watched: !watched,
                  })
                }
                disabled={toggleEpisode.isPending}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.episodeToggle,
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
                <View style={styles.episodeInfo}>
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
                    {ep.air_date ? `  ·  ${ep.air_date}` : ""}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      )}
    </ScrollView>
  )
}

function BackdropChrome({
  onBack,
  onMore,
  moreMenuVisible,
  onDismissMore,
  insets,
  isInCollection,
  onRemove,
  onStatusChange,
}: {
  onBack: () => void
  onMore: () => void
  moreMenuVisible: boolean
  onDismissMore: () => void
  insets: { top: number }
  isInCollection: boolean
  onRemove: () => void
  onStatusChange: (s: string) => void
}) {
  return (
    <View style={[styles.backdropNav, { paddingTop: insets.top + 12 }]}>
      <TouchableOpacity
        style={styles.glassBtn}
        onPress={onBack}
        activeOpacity={0.8}
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
          >
            <Text style={styles.glassBtnText}>⋮</Text>
          </TouchableOpacity>
        }
      >
        {isInCollection &&
          STATUSES.map((s) => (
            <Menu.Item
              key={s.value}
              title={s.label}
              onPress={() => onStatusChange(s.value)}
            />
          ))}
        {isInCollection && (
          <Menu.Item
            title="Remove from collection"
            titleStyle={{ color: "#c03030" }}
            onPress={onRemove}
          />
        )}
      </Menu>
    </View>
  )
}

const styles = StyleSheet.create({
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
    paddingHorizontal: 22,
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
    paddingHorizontal: 22,
    marginTop: 24,
  },
  overview: {
    fontFamily: SANS,
    fontSize: 14,
    lineHeight: 22,
  },
  actionBlock: {
    paddingHorizontal: 22,
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
    paddingHorizontal: 22,
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
    paddingHorizontal: 22,
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
