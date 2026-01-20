import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ShowWithProgress } from "@shared/schema"
import { Link } from "wouter"
import { Star, Calendar, Check } from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

interface ShowCardProps {
  show: ShowWithProgress
  href?: string
}

export function ShowCard({ show, href }: ShowCardProps) {
  const { toast } = useToast()
  const posterUrl = show.posterPath
    ? `https://image.tmdb.org/t/p/w500${show.posterPath}`
    : "/placeholder-poster.png"

  const progress = show.progress || 0
  const year = show.firstAirDate
    ? new Date(show.firstAirDate).getFullYear()
    : null
  const isCompleted = show.userShow?.status === "completed"
  const isWatching = show.userShow?.status === "watching"
  const isCaughtUp = show.userShow?.status === "caught_up"

  const markEpisodeMutation = useMutation({
    mutationFn: async () => {
      if (!show.nextEpisode) return

      return apiRequest("POST", `/api/shows/${show.id}/progress`, {
        seasonNumber: show.nextEpisode.seasonNumber,
        episodeNumber: show.nextEpisode.episodeNumber,
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
        description: `S${show.nextEpisode?.seasonNumber}E${show.nextEpisode?.episodeNumber} - ${show.nextEpisode?.name}`,
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

  const displayStatusBadge =
    show.userShow?.status && (!isCaughtUp || !show.nextEpisode)

  const content = (
    <Card
      className="overflow-hidden hover-elevate transition-all duration-200 group cursor-pointer md:flex-col flex"
      data-testid={`card-show-${show.id}`}
    >
      <div className="relative w-32 shrink-0 md:w-full md:aspect-[2/3] aspect-[2/3] overflow-hidden bg-muted">
        <img
          src={posterUrl}
          alt={show.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-white text-xs line-clamp-3">{show.overview}</p>
          </div>
        </div>
        {show.voteAverage && parseFloat(show.voteAverage) > 0 && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-black/70 text-white border-0 backdrop-blur-sm">
              <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
              {parseFloat(show.voteAverage).toFixed(1)}
            </Badge>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3 flex-1">
        <div>
          <h3
            className="font-heading font-semibold text-base line-clamp-1"
            data-testid={`text-show-title-${show.id}`}
          >
            {show.name}
          </h3>
          {year && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{year}</span>
              {show.numberOfSeasons && (
                <>
                  <span className="mx-1">•</span>
                  <span>
                    {show.numberOfSeasons} Season
                    {show.numberOfSeasons !== 1 ? "s" : ""}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {isWatching && show.nextEpisode && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-accent">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  Next: S{show.nextEpisode.seasonNumber}E
                  {show.nextEpisode.episodeNumber}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {show.nextEpisode.name}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleQuickWatch}
                disabled={markEpisodeMutation.isPending}
                className="shrink-0"
                data-testid={`button-quick-watch-${show.id}`}
              >
                <Check className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {isWatching && !show.nextEpisode && progress > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-accent">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            {show.watchedEpisodes !== undefined &&
              show.totalEpisodes !== undefined && (
                <p className="text-xs text-muted-foreground">
                  {show.watchedEpisodes} / {show.totalEpisodes} episodes
                </p>
              )}
          </div>
        )}

        {isCaughtUp && (show as any).nextEpisode && (
          <div className="space-y-2">
            <Badge
              variant="outline"
              className="text-xs bg-teal-600/10 border-teal-600/20 text-teal-700 dark:text-teal-400"
            >
              S{(show as any).nextEpisode.season}E
              {(show as any).nextEpisode.episode} in{" "}
              {(show as any).nextEpisode.daysUntil}{" "}
              {(show as any).nextEpisode.daysUntil === 1 ? "day" : "days"}
            </Badge>
          </div>
        )}

        {!isCompleted && !isWatching && !isCaughtUp && progress > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-accent">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            {show.watchedEpisodes !== undefined &&
              show.totalEpisodes !== undefined && (
                <p className="text-xs text-muted-foreground">
                  {show.watchedEpisodes} / {show.totalEpisodes} episodes
                </p>
              )}
          </div>
        )}

        {show.userShow && displayStatusBadge && (
          <Badge
            variant={
              show.userShow.status === "watching"
                ? "default"
                : show.userShow.status === "caught_up"
                  ? "default"
                  : show.userShow.status === "completed"
                    ? "secondary"
                    : "outline"
            }
            className={`text-xs ${show.userShow.status === "caught_up" ? "bg-teal-600 hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-800" : ""}`}
            data-testid={`badge-status-${show.id}`}
          >
            {show.userShow.status === "want_to_watch" && "Want to Watch"}
            {show.userShow.status === "watching" && "Watching"}
            {show.userShow.status === "caught_up" && "Caught Up"}
            {show.userShow.status === "completed" && "Completed"}
          </Badge>
        )}
      </div>
    </Card>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
