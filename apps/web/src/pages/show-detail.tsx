import { useEffect, useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useParams, useLocation } from "wouter"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AddToCollectionButton } from "@/components/add-to-collection-button"
import { StatusBadge } from "@/components/status-badge"
import { statusPalette, STATUS_LABEL, type StatusKey } from "@/lib/status"
import { useTheme } from "@/components/theme-provider"
import { Star, Check, ChevronLeft } from "lucide-react"
import {
  ShowWithProgress,
  TMDBSeason,
  isEpisodeAired,
  isEpisodeWatched as isEpisodeWatchedShared,
  hasUnwatchedEpisodesBefore as hasUnwatchedEpisodesBeforeShared,
  buildEpisodesToMark,
  buildEpisodesToUnmark,
  findLastAiredEpisode,
} from "@shared/schema"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import {
  STATUS_INVALIDATE_DELAY_MS,
  invalidateStatusRelatedQueries,
} from "@/components/status-validation-trigger"

const SHOW_DETAIL_VALIDATE_STATUS_THROTTLE_MS = 10 * 60 * 1000
// Past this many seasons the pill row wraps into stacked rows, so switch to a select.
const SEASON_PILL_LIMIT = 8

export default function ShowDetail() {
  const { id } = useParams<{ id: string }>()
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const { theme } = useTheme()
  const [pendingEpisode, setPendingEpisode] = useState<{
    seasonNumber: number
    episodeNumber: number
  } | null>(null)
  const [pendingUnwatchEpisode, setPendingUnwatchEpisode] = useState<{
    seasonNumber: number
    episodeNumber: number
  } | null>(null)
  const [removeShowDialogOpen, setRemoveShowDialogOpen] = useState(false)
  const [activeSeason, setActiveSeason] = useState<number | null>(null)

  useEffect(() => {
    if (!id || typeof sessionStorage === "undefined") return
    const parsedShowId = parseInt(id, 10)
    if (Number.isNaN(parsedShowId)) return
    const storageKey = `statusValidationShow:${parsedShowId}`
    const raw = sessionStorage.getItem(storageKey)
    const last = raw ? parseInt(raw, 10) : 0
    if (last && Date.now() - last < SHOW_DETAIL_VALIDATE_STATUS_THROTTLE_MS)
      return
    apiRequest("POST", "/api/user/shows/validate-status", {
      showId: parsedShowId,
    })
      .then((res) => {
        if (!res.ok) return
        sessionStorage.setItem(storageKey, String(Date.now()))
        setTimeout(() => {
          invalidateStatusRelatedQueries()
          queryClient.invalidateQueries({ queryKey: ["/api/shows", id] })
          queryClient.invalidateQueries({
            queryKey: ["/api/shows", id, "seasons"],
          })
          queryClient.invalidateQueries({
            queryKey: ["/api/shows", id, "progress"],
          })
        }, STATUS_INVALIDATE_DELAY_MS)
      })
      .catch(() => {})
  }, [id])

  const { data: show, isLoading: showLoading } = useQuery<ShowWithProgress>({
    queryKey: ["/api/shows", id],
    enabled: !!id,
  })

  useEffect(() => {
    if (show?.name) document.title = `${show.name} · Showtracker`
  }, [show?.name])

  const { data: seasons, isLoading: seasonsLoading } = useQuery<TMDBSeason[]>({
    queryKey: ["/api/shows", id, "seasons"],
    enabled: !!id,
  })

  const { data: watchProgress } = useQuery<
    Array<{ season: number; episode: number; watched: boolean }>
  >({
    queryKey: ["/api/shows", id, "progress"],
    enabled: !!id,
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/shows", id, "progress"] })
    queryClient.invalidateQueries({ queryKey: ["/api/shows", id] })
    queryClient.invalidateQueries({ queryKey: ["/api/stats"] })
    queryClient.invalidateQueries({ queryKey: ["/api/shows/watching"] })
    queryClient.invalidateQueries({ queryKey: ["/api/shows/caught-up"] })
    queryClient.invalidateQueries({ queryKey: ["/api/shows/completed"] })
    queryClient.invalidateQueries({ queryKey: ["/api/shows/want-to-watch"] })
    queryClient.invalidateQueries({ queryKey: ["/api/shows/stopped"] })
  }

  const toggleEpisodeMutation = useMutation({
    mutationFn: async ({
      seasonNumber,
      episodeNumber,
      watched,
    }: {
      seasonNumber: number
      episodeNumber: number
      watched: boolean
    }) => {
      return apiRequest("POST", `/api/shows/${id}/progress`, {
        season: seasonNumber,
        episode: episodeNumber,
        watched,
      })
    },
    onSuccess: invalidateAll,
    onError: (error: Error) =>
      toast({
        title: "Couldn't update episode",
        description: error.message,
        variant: "destructive",
      }),
  })

  const addShowMutation = useMutation({
    mutationFn: async ({
      showId,
      initialStatus,
    }: {
      showId: number
      initialStatus?: string
    }) => {
      return apiRequest("POST", "/api/user/shows", { showId, initialStatus })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/shows"] })
      queryClient.invalidateQueries({ queryKey: ["/api/shows", id] })
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] })
      queryClient.invalidateQueries({ queryKey: ["/api/shows/watching"] })
      queryClient.invalidateQueries({ queryKey: ["/api/shows/caught-up"] })
      queryClient.invalidateQueries({ queryKey: ["/api/shows/completed"] })
      queryClient.invalidateQueries({ queryKey: ["/api/shows/want-to-watch"] })
      queryClient.invalidateQueries({ queryKey: ["/api/shows/stopped"] })
      const statusLabel =
        variables.initialStatus === "completed"
          ? "Completed"
          : variables.initialStatus === "caught_up"
            ? "Caught Up"
            : "Want to Watch"
      toast({ title: "Show Added", description: `Added as "${statusLabel}".` })
    },
    onError: () =>
      toast({
        title: "Error",
        description: "Failed to add show.",
        variant: "destructive",
      }),
  })

  const removeShowMutation = useMutation({
    mutationFn: async () => apiRequest("DELETE", `/api/user/shows/${id}`),
    onSuccess: () => {
      setRemoveShowDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ["/api/user/shows"] })
      queryClient.invalidateQueries({ queryKey: ["/api/shows", id] })
      queryClient.invalidateQueries({
        queryKey: ["/api/shows", id, "progress"],
      })
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] })
      queryClient.invalidateQueries({ queryKey: ["/api/shows/watching"] })
      queryClient.invalidateQueries({ queryKey: ["/api/shows/caught-up"] })
      queryClient.invalidateQueries({ queryKey: ["/api/shows/completed"] })
      queryClient.invalidateQueries({ queryKey: ["/api/shows/want-to-watch"] })
      queryClient.invalidateQueries({ queryKey: ["/api/shows/stopped"] })
      toast({ title: "Marked as stopped" })
    },
    onError: () =>
      toast({
        title: "Error",
        description: "Failed to mark show as stopped.",
        variant: "destructive",
      }),
  })

  // Resume tracking a stopped show. Writes the status the progress already
  // implies, so the next background validation sweep agrees and leaves it put.
  const resumeShowMutation = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/user/shows/${id}/resume`),
    onSuccess: async (res) => {
      const { status } = (await res.json()) as { status: StatusKey }
      invalidateAll()
      toast({
        title: "Tracking resumed",
        description: `Moved back to ${STATUS_LABEL[status]}.`,
      })
    },
    onError: (error: Error) =>
      toast({
        title: "Couldn't resume tracking",
        description: error.message,
        variant: "destructive",
      }),
  })

  const markSeasonWatchedMutation = useMutation({
    mutationFn: async ({
      seasonNumber,
      watched,
    }: {
      seasonNumber: number
      watched: boolean
    }) => {
      return apiRequest(
        "POST",
        `/api/shows/${id}/season/${seasonNumber}/mark-all`,
        { watched }
      )
    },
    onSuccess: () => {
      invalidateAll()
      toast({ title: "Season updated" })
    },
    onError: (error: Error) =>
      toast({
        title: "Couldn't update season",
        description: error.message,
        variant: "destructive",
      }),
  })

  const isEpisodeWatched = (seasonNumber: number, episodeNumber: number) =>
    isEpisodeWatchedShared(watchProgress, seasonNumber, episodeNumber)

  const hasEpisodeAired = (airDate: string | null) => isEpisodeAired(airDate)

  const getSeasonProgress = (seasonNumber: number) => {
    const season = seasons?.find((s) => s.season_number === seasonNumber)
    if (!season || !season.episodes)
      return { watched: 0, total: 0, percentage: 0 }
    const airedEpisodes = season.episodes.filter((ep) =>
      hasEpisodeAired(ep.air_date)
    )
    const watched = airedEpisodes.filter((ep) =>
      isEpisodeWatched(seasonNumber, ep.episode_number)
    ).length
    const total = airedEpisodes.length
    return {
      watched,
      total,
      percentage: total > 0 ? (watched / total) * 100 : 0,
    }
  }

  const markPreviousEpisodes = async (
    targetSeason: number,
    targetEpisode: number
  ) => {
    const episodesToMark = buildEpisodesToMark(
      seasons,
      watchProgress,
      targetSeason,
      targetEpisode
    )
    if (episodesToMark.length === 0) return
    await apiRequest("POST", `/api/shows/${id}/progress/bulk`, {
      episodes: episodesToMark,
    })
    invalidateAll()
    toast({
      title: "Episodes Marked",
      description: `Marked ${episodesToMark.length} episode${episodesToMark.length !== 1 ? "s" : ""} as watched`,
    })
  }

  const markSucceedingEpisodesUnwatched = async (
    targetSeason: number,
    targetEpisode: number
  ) => {
    const episodesToUnmark = buildEpisodesToUnmark(
      seasons,
      watchProgress,
      targetSeason,
      targetEpisode
    )
    if (episodesToUnmark.length === 0) return
    await apiRequest("POST", `/api/shows/${id}/progress/bulk`, {
      episodes: episodesToUnmark,
    })
    invalidateAll()
    toast({
      title: "Episodes Unmarked",
      description: `Unmarked ${episodesToUnmark.length} episode${episodesToUnmark.length !== 1 ? "s" : ""} as unwatched`,
    })
  }

  const hasUnwatchedEpisodesBefore = (
    targetSeason: number,
    targetEpisode: number
  ): boolean =>
    hasUnwatchedEpisodesBeforeShared(
      seasons,
      watchProgress,
      targetSeason,
      targetEpisode
    )

  const hasWatchedEpisodesAfter = (
    targetSeason: number,
    targetEpisode: number
  ): boolean => {
    if (!seasons) return false
    for (const season of seasons) {
      if (season.season_number < targetSeason) continue
      if (season.episodes) {
        for (const episode of season.episodes) {
          if (!hasEpisodeAired(episode.air_date)) continue
          if (season.season_number > targetSeason) {
            if (isEpisodeWatched(season.season_number, episode.episode_number))
              return true
          } else if (
            season.season_number === targetSeason &&
            episode.episode_number > targetEpisode
          ) {
            if (isEpisodeWatched(season.season_number, episode.episode_number))
              return true
          }
        }
      }
    }
    return false
  }

  const handleEpisodeToggle = (
    seasonNumber: number,
    episodeNumber: number,
    checked: boolean
  ) => {
    const isAlreadyWatched = isEpisodeWatched(seasonNumber, episodeNumber)
    if (checked && !isAlreadyWatched) {
      if (hasUnwatchedEpisodesBefore(seasonNumber, episodeNumber)) {
        setPendingEpisode({ seasonNumber, episodeNumber })
      } else {
        toggleEpisodeMutation.mutate({
          seasonNumber,
          episodeNumber,
          watched: checked,
        })
      }
    } else if (!checked && isAlreadyWatched) {
      if (hasWatchedEpisodesAfter(seasonNumber, episodeNumber)) {
        setPendingUnwatchEpisode({ seasonNumber, episodeNumber })
      } else {
        toggleEpisodeMutation.mutate({
          seasonNumber,
          episodeNumber,
          watched: checked,
        })
      }
    } else {
      toggleEpisodeMutation.mutate({
        seasonNumber,
        episodeNumber,
        watched: checked,
      })
    }
  }

  const handleConfirmMarkAll = async () => {
    if (!pendingEpisode) return
    await markPreviousEpisodes(
      pendingEpisode.seasonNumber,
      pendingEpisode.episodeNumber
    )
    setPendingEpisode(null)
  }

  const handleMarkJustOne = () => {
    if (!pendingEpisode) return
    toggleEpisodeMutation.mutate({
      seasonNumber: pendingEpisode.seasonNumber,
      episodeNumber: pendingEpisode.episodeNumber,
      watched: true,
    })
    setPendingEpisode(null)
  }

  const handleConfirmUnmarkAll = async () => {
    if (!pendingUnwatchEpisode) return
    await markSucceedingEpisodesUnwatched(
      pendingUnwatchEpisode.seasonNumber,
      pendingUnwatchEpisode.episodeNumber
    )
    setPendingUnwatchEpisode(null)
  }

  const handleUnmarkJustOne = () => {
    if (!pendingUnwatchEpisode) return
    toggleEpisodeMutation.mutate({
      seasonNumber: pendingUnwatchEpisode.seasonNumber,
      episodeNumber: pendingUnwatchEpisode.episodeNumber,
      watched: false,
    })
    setPendingUnwatchEpisode(null)
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (showLoading) {
    return (
      <div>
        <Skeleton className="w-full h-[540px] -mx-8 -mt-8 rounded-none" />
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  if (!show) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Show Not Found</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  const backdropUrl = show.backdropPath
    ? `https://image.tmdb.org/t/p/w1280${show.backdropPath}`
    : show.posterPath
      ? `https://image.tmdb.org/t/p/w500${show.posterPath}`
      : null

  const userStatus = show.userShow?.status as StatusKey | undefined
  const sp = userStatus
    ? statusPalette(userStatus, theme)
    : statusPalette("watching", theme)
  const progress = show.progress || 0
  const realSeasons = seasons?.filter((s) => s.season_number > 0) ?? []
  const effectiveActiveSeason =
    activeSeason ?? realSeasons[0]?.season_number ?? 1
  const activeSeasonData = realSeasons.find(
    (s) => s.season_number === effectiveActiveSeason
  )
  const activeSeasonProgress = getSeasonProgress(effectiveActiveSeason)

  return (
    <div>
      {/* Backdrop */}
      <div className="relative h-[540px] overflow-hidden -mx-8 -mt-8">
        {backdropUrl ? (
          <img
            src={backdropUrl}
            alt={show.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-muted" />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              // Reaches the page background well before the bottom, so the
              // pulled-up title always sits on a known ground rather than on
              // whatever the backdrop image happens to be there.
              "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 30%, transparent 40%, hsl(var(--background) / 0.88) 72%, hsl(var(--background)) 88%)",
          }}
        />

        {/* Back button */}
        <div className="absolute top-6 left-8">
          <button
            onClick={() =>
              window.history.length > 1
                ? window.history.back()
                : setLocation("/watching")
            }
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-white text-[12.5px] font-semibold border border-white/22"
            style={{
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(12px)",
            }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back
          </button>
        </div>
      </div>

      {/* Pulled-up content — overlaps backdrop bottom */}
      <div className="relative -mt-44 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 px-0">
        {/* Left: show info */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {userStatus && <StatusBadge status={userStatus} />}
            {show.firstAirDate && (
              <span className="inline-flex items-center gap-1 bg-black/60 text-white text-[11px] font-mono font-medium px-2 py-1 rounded-md">
                {new Date(show.firstAirDate).getFullYear()}
              </span>
            )}
            {show.numberOfSeasons && (
              <span className="inline-flex items-center gap-1 bg-black/60 text-white text-[11px] font-mono font-medium px-2 py-1 rounded-md">
                {show.numberOfSeasons}s
              </span>
            )}
            {show.voteAverage && parseFloat(show.voteAverage) > 0 && (
              <span className="inline-flex items-center gap-1 bg-black/60 text-white text-[11px] font-mono font-medium px-2 py-1 rounded-md">
                <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                {parseFloat(show.voteAverage).toFixed(1)}
              </span>
            )}
          </div>
          <h1
            className="font-serif font-normal text-[40px] sm:text-[56px] lg:text-[72px] text-foreground leading-none tracking-[-0.025em] mb-2"
            data-testid="text-show-title"
          >
            {show.name}
          </h1>
          {show.genres && show.genres.length > 0 && (
            <p className="text-muted-foreground text-[14px] mb-6">
              {show.genres.join(" · ")}
            </p>
          )}
          {show.overview && (
            <p className="text-muted-foreground text-[15px] leading-relaxed max-w-2xl mt-8">
              {show.overview}
            </p>
          )}

          {/* Collection actions */}
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <AddToCollectionButton
              showId={show.id}
              status={show.status}
              onAdd={(showId, s) =>
                addShowMutation.mutate({ showId, initialStatus: s })
              }
              onMarkAll={() => {
                const last = findLastAiredEpisode(seasons)
                if (last) markPreviousEpisodes(last.season, last.episode)
              }}
              isPending={addShowMutation.isPending}
              userShow={show.userShow}
              size="lg"
              dataTestId="button-add-to-collection"
            />
            {show.userShow && show.userShow.status !== "stopped" && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                disabled={removeShowMutation.isPending}
                onClick={() => setRemoveShowDialogOpen(true)}
                data-testid="button-mark-as-stopped"
              >
                Mark as Stopped
              </Button>
            )}
            {show.userShow?.status === "stopped" && (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  disabled={resumeShowMutation.isPending}
                  onClick={() => resumeShowMutation.mutate()}
                  data-testid="button-resume-tracking"
                >
                  {resumeShowMutation.isPending
                    ? "Resuming…"
                    : "Resume tracking"}
                </Button>
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="text-stopped-message"
                >
                  You've stopped tracking this show. Your progress is saved.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Progress card */}
        {show.userShow && (
          <div className="bg-card border border-border rounded-[14px] p-5 self-start mt-12">
            <div className="font-mono text-[10.5px] text-muted-foreground uppercase tracking-[0.14em] font-semibold mb-3">
              Your progress
            </div>
            <div className="flex items-baseline justify-between mb-3">
              <div className="font-serif text-[40px] font-normal leading-none tracking-[-0.02em] text-foreground">
                {Math.round(progress)}
                <span className="text-[22px] text-muted-foreground">%</span>
              </div>
              <div className="font-mono text-[13px] text-muted-foreground font-medium">
                {show.watchedEpisodes ?? 0}/{show.totalEpisodes ?? "?"}
              </div>
            </div>
            <div className="relative h-[5px] w-full rounded-full overflow-hidden bg-muted mb-4">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${progress}%`, background: sp.solid }}
              />
            </div>
            {show.nextEpisode && (
              <button
                onClick={() =>
                  handleEpisodeToggle(
                    show.nextEpisode!.season,
                    show.nextEpisode!.episode,
                    true
                  )
                }
                disabled={toggleEpisodeMutation.isPending}
                className="w-full py-3 rounded-[10px] text-white text-[13.5px] font-bold inline-flex items-center justify-center gap-2 mb-3"
                style={{ background: sp.solid }}
              >
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                Mark S{show.nextEpisode.season}·E
                {show.nextEpisode.episode} watched
              </button>
            )}
          </div>
        )}
      </div>

      {/* Episodes section */}
      <div className="mt-12 pb-16">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-serif font-normal text-[36px] leading-none tracking-[-0.02em] text-foreground">
            Episodes
          </h2>
          {/* Season switcher — pills stay readable up to a point, past which a
              long-running show turns them into rows that crowd the heading. */}
          <div className="flex gap-2 flex-wrap justify-end max-w-[70%]">
            {seasonsLoading ? (
              <Skeleton className="h-8 w-48" />
            ) : realSeasons.length > SEASON_PILL_LIMIT ? (
              <select
                value={effectiveActiveSeason}
                onChange={(e) => setActiveSeason(Number(e.target.value))}
                className="px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold border border-border bg-card text-foreground"
                aria-label="Season"
                data-testid="select-season"
              >
                {realSeasons.map((season) => (
                  <option
                    key={season.season_number}
                    value={season.season_number}
                  >
                    Season {season.season_number}
                  </option>
                ))}
              </select>
            ) : (
              realSeasons.map((season) => {
                const isActive = season.season_number === effectiveActiveSeason
                return (
                  <button
                    key={season.season_number}
                    onClick={() => setActiveSeason(season.season_number)}
                    className="px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold border transition-colors"
                    style={{
                      background: isActive
                        ? "hsl(var(--foreground))"
                        : "transparent",
                      color: isActive
                        ? "hsl(var(--background))"
                        : "hsl(var(--muted-foreground))",
                      borderColor: isActive
                        ? "hsl(var(--foreground))"
                        : "hsl(var(--border))",
                    }}
                    data-testid={`button-season-${season.season_number}`}
                  >
                    Season {season.season_number}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Season-level controls */}
        {activeSeasonData && (
          <div className="flex items-center gap-4 mb-4">
            <div className="font-mono text-[12px] text-muted-foreground">
              {activeSeasonProgress.watched}/{activeSeasonProgress.total}{" "}
              watched
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                markSeasonWatchedMutation.mutate({
                  seasonNumber: effectiveActiveSeason,
                  watched: !(
                    activeSeasonProgress.watched ===
                      activeSeasonProgress.total &&
                    activeSeasonProgress.total > 0
                  ),
                })
              }
              disabled={
                markSeasonWatchedMutation.isPending ||
                activeSeasonProgress.total === 0
              }
              data-testid={`button-mark-season-${effectiveActiveSeason}`}
            >
              {activeSeasonProgress.watched === activeSeasonProgress.total &&
              activeSeasonProgress.total > 0
                ? "Mark All Unwatched"
                : "Mark All Watched"}
            </Button>
          </div>
        )}

        {/* Episode 2-col grid */}
        {seasonsLoading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : activeSeasonData?.episodes?.length ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-14">
            {activeSeasonData.episodes.map((episode) => {
              const watched = isEpisodeWatched(
                effectiveActiveSeason,
                episode.episode_number
              )
              const hasAired = hasEpisodeAired(episode.air_date)
              return (
                <div
                  key={episode.id}
                  className={`flex items-center gap-3.5 py-3.5 border-b border-border ${!hasAired ? "opacity-40" : ""}`}
                  data-testid={`episode-${effectiveActiveSeason}-${episode.episode_number}`}
                >
                  <button
                    onClick={() =>
                      hasAired &&
                      handleEpisodeToggle(
                        effectiveActiveSeason,
                        episode.episode_number,
                        !watched
                      )
                    }
                    disabled={!hasAired}
                    className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 transition-colors"
                    style={{
                      background: watched ? sp.solid : "transparent",
                      border: watched
                        ? "none"
                        : `1.5px solid hsl(var(--border))`,
                    }}
                    data-testid={`checkbox-episode-${effectiveActiveSeason}-${episode.episode_number}`}
                  >
                    {watched ? (
                      <Check
                        className="w-3.5 h-3.5 text-white"
                        strokeWidth={3}
                      />
                    ) : (
                      <span className="font-mono text-[11.5px] text-muted-foreground font-semibold">
                        {episode.episode_number}
                      </span>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[15px] font-medium leading-snug truncate ${watched ? "text-muted-foreground" : "text-foreground"}`}
                    >
                      {episode.name}
                      {!hasAired && (
                        <span className="ml-2 align-middle inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-[0.08em] border border-border text-muted-foreground">
                          Upcoming
                        </span>
                      )}
                    </p>
                    <p className="font-mono text-[11.5px] text-muted-foreground mt-0.5">
                      S{effectiveActiveSeason}·E{episode.episode_number}
                      {episode.air_date &&
                        ` · ${new Date(episode.air_date).toLocaleDateString()}`}
                      {episode.runtime && ` · ${episode.runtime}m`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-muted-foreground">
            {activeSeasonData
              ? "No episodes announced for this season yet."
              : "No episode information available."}
          </p>
        )}
      </div>

      {/* Dialogs — all preserved */}
      <AlertDialog
        open={pendingEpisode !== null}
        onOpenChange={(open) => !open && setPendingEpisode(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Previous Episodes?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks every aired episode up to and including S
              {pendingEpisode?.seasonNumber}E{pendingEpisode?.episodeNumber} as
              watched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-mark-cancel">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkJustOne}
              data-testid="button-mark-just-one"
            >
              Just this episode
            </AlertDialogAction>
            <AlertDialogAction
              onClick={handleConfirmMarkAll}
              data-testid="button-mark-all-previous"
            >
              Mark all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingUnwatchEpisode !== null}
        onOpenChange={(open) => !open && setPendingUnwatchEpisode(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unmark Succeeding Episodes?</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to unmark all succeeding episodes? This will unmark
              all episodes from S{pendingUnwatchEpisode?.seasonNumber}E
              {pendingUnwatchEpisode?.episodeNumber} onwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-unmark-cancel">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnmarkJustOne}
              data-testid="button-unmark-just-one"
            >
              Just this episode
            </AlertDialogAction>
            <AlertDialogAction
              onClick={handleConfirmUnmarkAll}
              data-testid="button-unmark-all-succeeding"
            >
              Unmark all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={removeShowDialogOpen}
        onOpenChange={setRemoveShowDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as stopped?</AlertDialogTitle>
            <AlertDialogDescription>
              This moves the show to your Stopped list. Your watch progress is
              kept; mark an episode as watched to start tracking again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeShowMutation.mutate()}
              disabled={removeShowMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-mark-as-stopped"
            >
              Mark as Stopped
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
