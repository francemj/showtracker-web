import React, { useState } from "react"
import {
  ScrollView,
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
} from "react-native"
import {
  Text,
  Button,
  useTheme,
  Divider,
  Menu,
  ActivityIndicator,
  ProgressBar,
  Chip,
} from "react-native-paper"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@showtracker/api-client"
import type { ShowWithProgress, TMDBSeason } from "@showtracker/shared"
import { EpisodeRow } from "../../components/EpisodeRow"
import { StatusBadge } from "../../components/StatusBadge"

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"

type ProgressEntry = {
  seasonNumber: number
  episodeNumber: number
  watched: boolean
}

const STATUSES = [
  { value: "want_to_watch", label: "Want to Watch" },
  { value: "watching", label: "Watching" },
  { value: "caught_up", label: "Caught Up" },
  { value: "completed", label: "Completed" },
  { value: "stopped", label: "Stopped" },
]

export default function ShowDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const theme = useTheme()
  const qc = useQueryClient()
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set())
  const [statusMenuVisible, setStatusMenuVisible] = useState(false)

  const { data: show, isLoading } = useQuery<ShowWithProgress>({
    queryKey: ["/api/shows", id],
    enabled: !!id,
  })

  const { data: seasons } = useQuery<TMDBSeason[]>({
    queryKey: ["/api/shows", id, "seasons"],
    enabled: !!id,
  })

  const { data: progress } = useQuery<ProgressEntry[]>({
    queryKey: ["/api/shows", id, "progress"],
    enabled: !!id,
  })

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
        seasonNumber,
        episodeNumber,
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
      apiRequest("POST", "/api/user/shows", {
        showId: Number(id),
        status,
      }),
    onSuccess: invalidateShow,
  })

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  if (!show) {
    return (
      <View style={styles.center}>
        <Text>Show not found.</Text>
        <Button onPress={() => router.back()}>Go back</Button>
      </View>
    )
  }

  const backdropUri = show.backdropPath
    ? `${TMDB_IMAGE_BASE}${show.backdropPath}`
    : show.posterPath
      ? `${TMDB_IMAGE_BASE}${show.posterPath}`
      : null

  const isInCollection = !!show.userShow
  const currentStatus = show.userShow?.status

  const watchedSet = new Set(
    (progress ?? [])
      .filter((p) => p.watched)
      .map((p) => `${p.seasonNumber}x${p.episodeNumber}`)
  )

  const toggleSeason = (seasonNumber: number) => {
    setExpandedSeasons((prev) => {
      const next = new Set(prev)
      if (next.has(seasonNumber)) next.delete(seasonNumber)
      else next.add(seasonNumber)
      return next
    })
  }

  const isSeasonFullyWatched = (season: TMDBSeason) => {
    if (!season.episodes) return false
    return season.episodes.every((ep) =>
      watchedSet.has(`${ep.season_number}x${ep.episode_number}`)
    )
  }

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }}>
      {backdropUri && (
        <Image source={{ uri: backdropUri }} style={styles.backdrop} />
      )}

      <View style={styles.header}>
        <Button
          icon="arrow-left"
          onPress={() => router.back()}
          style={styles.backButton}
          compact
        >
          Back
        </Button>
        <Text variant="headlineSmall" style={styles.title}>
          {show.name}
        </Text>
        {show.firstAirDate && (
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {show.firstAirDate.slice(0, 4)}
            {show.status && ` · ${show.status}`}
          </Text>
        )}
        {show.genres && show.genres.length > 0 && (
          <View style={styles.genres}>
            {show.genres.map((g) => (
              <Chip key={g} compact style={styles.genreChip}>
                {g}
              </Chip>
            ))}
          </View>
        )}
        {show.overview && (
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}
          >
            {show.overview}
          </Text>
        )}
      </View>

      <Divider />

      <View style={styles.actions}>
        {isInCollection ? (
          <View style={styles.actionRow}>
            <View style={styles.statusRow}>
              {currentStatus && <StatusBadge status={currentStatus} />}
              <Menu
                visible={statusMenuVisible}
                onDismiss={() => setStatusMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    compact
                    onPress={() => setStatusMenuVisible(true)}
                  >
                    Change Status
                  </Button>
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
              </Menu>
            </View>
            <Button
              mode="outlined"
              textColor={theme.colors.error}
              onPress={() => removeShow.mutate()}
              loading={removeShow.isPending}
            >
              Remove
            </Button>
          </View>
        ) : (
          <Button
            mode="contained"
            onPress={() => addShow.mutate("want_to_watch")}
            loading={addShow.isPending}
          >
            Add to Collection
          </Button>
        )}

        {show.watchedEpisodes != null && show.totalEpisodes != null && (
          <View style={styles.progressSection}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {show.watchedEpisodes} / {show.totalEpisodes} episodes watched
            </Text>
            <ProgressBar
              progress={
                show.totalEpisodes > 0
                  ? show.watchedEpisodes / show.totalEpisodes
                  : 0
              }
              color={theme.colors.primary}
              style={styles.progressBar}
            />
          </View>
        )}
      </View>

      <Divider />

      {seasons && seasons.length > 0 && (
        <View style={styles.seasons}>
          <Text variant="titleMedium" style={styles.seasonsTitle}>
            Seasons
          </Text>
          {seasons
            .filter((s) => s.season_number > 0)
            .map((season) => {
              const isExpanded = expandedSeasons.has(season.season_number)
              const fullyWatched = isSeasonFullyWatched(season)

              return (
                <View key={season.season_number} style={styles.seasonBlock}>
                  <TouchableOpacity
                    style={[
                      styles.seasonHeader,
                      { backgroundColor: theme.colors.surfaceVariant },
                    ]}
                    onPress={() => toggleSeason(season.season_number)}
                  >
                    <Text variant="titleSmall" style={styles.seasonTitle}>
                      {season.name ?? `Season ${season.season_number}`}
                      {season.episode_count
                        ? ` (${season.episode_count} eps)`
                        : ""}
                    </Text>
                    <View style={styles.seasonActions}>
                      <Button
                        mode={fullyWatched ? "contained-tonal" : "outlined"}
                        compact
                        onPress={() =>
                          markAllSeason.mutate({
                            seasonNumber: season.season_number,
                            watched: !fullyWatched,
                          })
                        }
                        loading={markAllSeason.isPending}
                      >
                        {fullyWatched ? "Unmark All" : "Mark All"}
                      </Button>
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        {isExpanded ? "▲" : "▼"}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {isExpanded && season.episodes && (
                    <View style={styles.episodeList}>
                      {season.episodes.map((ep) => {
                        const watched = watchedSet.has(
                          `${ep.season_number}x${ep.episode_number}`
                        )
                        return (
                          <EpisodeRow
                            key={`${ep.season_number}x${ep.episode_number}`}
                            episodeNumber={ep.episode_number}
                            name={ep.name}
                            airDate={ep.air_date}
                            watched={watched}
                            onToggle={() =>
                              toggleEpisode.mutate({
                                seasonNumber: ep.season_number,
                                episodeNumber: ep.episode_number,
                                watched: !watched,
                              })
                            }
                            disabled={toggleEpisode.isPending}
                          />
                        )
                      })}
                    </View>
                  )}
                </View>
              )
            })}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  backdrop: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  header: {
    padding: 16,
    gap: 6,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  title: {
    fontWeight: "bold",
  },
  genres: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  genreChip: {},
  actions: {
    padding: 16,
    gap: 12,
  },
  actionRow: {
    gap: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  progressSection: {
    gap: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  seasons: {
    padding: 16,
    gap: 12,
  },
  seasonsTitle: {
    fontWeight: "600",
  },
  seasonBlock: {
    borderRadius: 8,
    overflow: "hidden",
  },
  seasonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    gap: 8,
  },
  seasonTitle: {
    flex: 1,
    fontWeight: "500",
  },
  seasonActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  episodeList: {
    backgroundColor: "transparent",
  },
})
