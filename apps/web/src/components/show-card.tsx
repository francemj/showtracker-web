import { ShowWithProgress } from "@shared/schema"
import { Link } from "wouter"
import { Star, Check } from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { StatusBadge } from "@/components/status-badge"
import { statusPalette, type StatusKey } from "@/lib/status"
import { useTheme } from "@/components/theme-provider"

interface ShowCardProps {
  show: ShowWithProgress
  href?: string
}

export function ShowCard({ show, href }: ShowCardProps) {
  const { toast } = useToast()
  const { theme } = useTheme()
  const posterUrl = show.posterPath
    ? `https://image.tmdb.org/t/p/w500${show.posterPath}`
    : "/placeholder-poster.png"

  const progress = show.progress || 0
  const year = show.firstAirDate
    ? new Date(show.firstAirDate).getFullYear()
    : null
  const isWatching = show.userShow?.status === "watching"
  const isCaughtUp = show.userShow?.status === "caught_up"
  const userStatus = show.userShow?.status as StatusKey | undefined

  const watchingPalette = statusPalette("watching", theme)

  const displayStatusBadge = userStatus && (!isCaughtUp || !show.nextEpisode)

  const markEpisodeMutation = useMutation({
    mutationFn: async () => {
      if (!show.nextEpisode) return
      return apiRequest("POST", `/api/shows/${show.id}/progress`, {
        season: show.nextEpisode.season,
        episode: show.nextEpisode.episode,
        watched: true,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/shows", show.id, "progress"],
      })
      queryClient.invalidateQueries({ queryKey: ["/api/shows", show.id] })
      queryClient.invalidateQueries({ queryKey: ["/api/shows/watching"] })
      queryClient.invalidateQueries({ queryKey: ["/api/shows/caught-up"] })
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] })
      toast({
        title: "Episode marked as watched",
        description: `S${show.nextEpisode?.season}E${show.nextEpisode?.episode}`,
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark episode as watched",
        variant: "destructive",
      })
    },
  })

  const handleQuickWatch = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    markEpisodeMutation.mutate()
  }

  const content = (
    <div className="group cursor-pointer" data-testid={`card-show-${show.id}`}>
      {/* Poster */}
      <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden bg-muted">
        <img
          src={posterUrl}
          alt={show.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Rating badge */}
        {show.voteAverage && parseFloat(show.voteAverage) > 0 && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-1 bg-black/60 text-white text-[11px] font-mono font-medium px-1.5 py-0.5 rounded-md">
              <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
              {parseFloat(show.voteAverage).toFixed(1)}
            </span>
          </div>
        )}

        {/* Caught-up: next episode air date badge */}
        {isCaughtUp && show.nextEpisode && (
          <div className="absolute top-2 left-2">
            <span className="inline-block bg-black/65 text-white text-[10px] font-mono font-semibold px-2 py-1 rounded-md">
              S{show.nextEpisode.season}E{show.nextEpisode.episode}{" "}
              {show.nextEpisode.daysUntil != null &&
              show.nextEpisode.daysUntil <= 0
                ? "today"
                : show.nextEpisode.daysUntil != null
                  ? `in ${show.nextEpisode.daysUntil}d`
                  : ""}
            </span>
          </div>
        )}

        {/* Progress bar on poster bottom */}
        {isWatching && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0">
            <div
              className="relative h-[2.5px] w-full"
              style={{ background: "rgba(255,255,255,0.28)" }}
            >
              <div
                className="absolute inset-y-0 left-0"
                style={{
                  width: `${progress}%`,
                  background: watchingPalette.solid,
                }}
              />
            </div>
          </div>
        )}

        {/* Quick-watch button */}
        {isWatching && show.nextEpisode && (
          <button
            className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md"
            onClick={handleQuickWatch}
            disabled={markEpisodeMutation.isPending}
            data-testid={`button-quick-watch-${show.id}`}
          >
            <Check className="w-4 h-4" strokeWidth={3} />
          </button>
        )}
      </div>

      {/* Below poster */}
      <div className="mt-2.5">
        <h3
          className="font-sans font-semibold text-[14px] leading-snug truncate text-foreground"
          data-testid={`text-show-title-${show.id}`}
        >
          {show.name}
        </h3>
        <div className="flex items-center justify-between mt-1">
          <span className="font-mono text-[11.5px] text-muted-foreground font-medium">
            {year}
            {show.watchedEpisodes !== undefined &&
            show.totalEpisodes !== undefined &&
            isWatching
              ? ` · ${show.watchedEpisodes}/${show.totalEpisodes}`
              : show.numberOfSeasons
                ? ` · ${show.numberOfSeasons}s`
                : ""}
          </span>
          {displayStatusBadge && userStatus && (
            <StatusBadge
              status={userStatus}
              data-testid={`badge-status-${show.id}`}
            />
          )}
        </div>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block w-full">
        {content}
      </Link>
    )
  }

  return content
}
