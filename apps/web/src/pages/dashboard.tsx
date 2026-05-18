import { useQuery } from "@tanstack/react-query"
import { Skeleton } from "@/components/ui/skeleton"
import { ShowWithProgress } from "@shared/schema"
import { Link, useLocation } from "wouter"
import { apiRequest } from "@/lib/queryClient"
import { statusPalette } from "@/lib/status"
import { useTheme } from "@/components/theme-provider"
import { Check } from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

const LIMIT = 10

function PosterRow({
  title,
  shows,
  isLoading,
  status,
  href,
  upcoming,
}: {
  title: string
  shows: ShowWithProgress[]
  isLoading: boolean
  status: "watching" | "want_to_watch" | "caught_up" | "completed"
  href: string
  upcoming?: boolean
}) {
  const { theme } = useTheme()
  const sp = statusPalette(status, theme)

  if (isLoading) {
    return (
      <div className="mt-10">
        <div className="flex items-baseline justify-between px-0 pb-4">
          <Skeleton className="h-8 w-36" />
        </div>
        <div className="flex gap-5 overflow-x-auto pb-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton
              key={i}
              className="w-[184px] shrink-0 aspect-[2/3] rounded-lg"
            />
          ))}
        </div>
      </div>
    )
  }

  if (!shows.length) return null

  return (
    <div className="mt-10">
      <div className="flex items-baseline justify-between pb-4">
        <h2 className="font-serif font-normal text-[32px] leading-none tracking-[-0.02em] text-foreground">
          {title}
        </h2>
        <Link href={href}>
          <span className="text-[13px] font-semibold" style={{ color: sp.fg }}>
            See all →
          </span>
        </Link>
      </div>
      <div className="flex gap-5 overflow-x-auto pb-2 -mx-1 px-1">
        {shows.map((show) => {
          const posterUrl = show.posterPath
            ? `https://image.tmdb.org/t/p/w500${show.posterPath}`
            : "/placeholder-poster.png"
          const progress = show.progress || 0
          return (
            <Link
              key={show.id}
              href={`/show/${show.id}`}
              className="shrink-0 w-[184px]"
            >
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted">
                <img
                  src={posterUrl}
                  alt={show.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {upcoming && show.nextEpisode && (
                  <div className="absolute top-2 left-2">
                    <span className="bg-black/70 text-white text-[10px] font-mono font-semibold px-2 py-1 rounded-md">
                      S{show.nextEpisode.seasonNumber}E
                      {show.nextEpisode.episodeNumber}
                      {show.nextEpisode.daysUntil != null &&
                        (show.nextEpisode.daysUntil <= 0
                          ? " today"
                          : ` in ${show.nextEpisode.daysUntil}d`)}
                    </span>
                  </div>
                )}
                {!upcoming && progress > 0 && (
                  <div className="absolute bottom-0 left-0 right-0">
                    <div
                      className="relative h-[3px]"
                      style={{ background: "rgba(255,255,255,0.28)" }}
                    >
                      <div
                        className="absolute inset-y-0 left-0"
                        style={{ width: `${progress}%`, background: sp.solid }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-2.5">
                <p className="font-sans font-semibold text-[14px] leading-snug truncate text-foreground">
                  {show.name}
                </p>
                <p className="font-mono text-[11.5px] text-muted-foreground mt-0.5">
                  {upcoming
                    ? show.firstAirDate
                      ? new Date(show.firstAirDate).getFullYear()
                      : ""
                    : `${show.watchedEpisodes ?? 0}/${show.totalEpisodes ?? "?"} eps`}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { theme } = useTheme()
  const { toast } = useToast()
  const [, setLocation] = useLocation()

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalShows: number
    watchingShows: number
    completedShows: number
    episodesWatched: number
  }>({ queryKey: ["/api/stats"] })

  const { data: watchingData, isLoading: watchingLoading } = useQuery<{
    shows: ShowWithProgress[]
    total: number
  }>({
    queryKey: ["/api/shows/watching", "dashboard"],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/shows/watching?page=1&limit=${LIMIT}`
      )
      return res.json()
    },
  })

  const { data: wantData, isLoading: wantLoading } = useQuery<{
    shows: ShowWithProgress[]
    total: number
  }>({
    queryKey: ["/api/shows/want-to-watch", "dashboard"],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/shows/want-to-watch?page=1&limit=${LIMIT}`
      )
      return res.json()
    },
  })

  const { data: caughtUpData, isLoading: caughtUpLoading } = useQuery<{
    shows: ShowWithProgress[]
    total: number
  }>({
    queryKey: ["/api/shows/caught-up", "dashboard"],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/shows/caught-up?page=1&limit=${LIMIT}`
      )
      return res.json()
    },
  })

  const watchingShows = watchingData?.shows || []
  const wantShows = wantData?.shows || []
  const caughtUpShows = caughtUpData?.shows || []

  // Most recently updated watching show for hero
  const featured = watchingShows.length
    ? [...watchingShows].sort((a, b) => {
        const aTime = a.userShow?.updatedAt
          ? new Date(a.userShow.updatedAt).getTime()
          : 0
        const bTime = b.userShow?.updatedAt
          ? new Date(b.userShow.updatedAt).getTime()
          : 0
        return bTime - aTime
      })[0]
    : null

  const watchingPalette = statusPalette("watching", theme)

  const markEpisodeMutation = useMutation({
    mutationFn: async () => {
      if (!featured?.nextEpisode) return
      return apiRequest("POST", `/api/shows/${featured.id}/progress`, {
        seasonNumber: featured.nextEpisode.seasonNumber,
        episodeNumber: featured.nextEpisode.episodeNumber,
        watched: true,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shows/watching"] })
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] })
      toast({ title: "Episode marked as watched" })
    },
  })

  const backdropUrl = featured?.backdropPath
    ? `https://image.tmdb.org/t/p/w1280${featured.backdropPath}`
    : null

  return (
    <div>
      {/* Cinematic hero */}
      <div className="relative h-[520px] overflow-hidden -mx-8 -mt-8">
        {backdropUrl ? (
          <img
            src={backdropUrl}
            alt={featured?.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: featured
                ? watchingPalette.solid
                : "hsl(var(--muted))",
            }}
          />
        )}
        {/* Scrim overlays */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 30%, transparent 45%, rgba(0,0,0,0.75) 85%, hsl(var(--background)) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 35%, transparent 55%)",
          }}
        />

        {featured ? (
          <div className="absolute left-6 right-6 bottom-10 max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: watchingPalette.solid,
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              <span className="text-[11px] text-white/90 uppercase tracking-[0.18em] font-semibold font-sans">
                Continue watching · {featured.name}
              </span>
            </div>
            {featured.nextEpisode ? (
              <>
                <p
                  className="font-serif italic text-[52px] text-white leading-[1.05] tracking-[-0.025em]"
                  style={{ textShadow: "0 2px 18px rgba(0,0,0,0.35)" }}
                >
                  S{featured.nextEpisode.seasonNumber} · E
                  {featured.nextEpisode.episodeNumber}
                </p>
                <p className="font-mono text-[13px] text-white/85 mt-2.5 font-medium">
                  {featured.watchedEpisodes ?? 0}/
                  {featured.totalEpisodes ?? "?"} watched
                </p>
              </>
            ) : (
              <p
                className="font-serif italic text-[52px] text-white leading-[1.05] tracking-[-0.025em]"
                style={{ textShadow: "0 2px 18px rgba(0,0,0,0.35)" }}
              >
                {featured.name}
              </p>
            )}
            <div className="flex gap-2.5 mt-5">
              {featured.nextEpisode && (
                <button
                  onClick={() => markEpisodeMutation.mutate()}
                  disabled={markEpisodeMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-black text-[13.5px] font-bold leading-none"
                >
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  Mark watched
                </button>
              )}
              <button
                onClick={() => setLocation(`/show/${featured.id}`)}
                className="inline-flex items-center px-5 py-3 rounded-full text-white text-[13.5px] font-semibold leading-none border border-white/22"
                style={{
                  background: "rgba(255,255,255,0.16)",
                  backdropFilter: "blur(12px)",
                }}
              >
                Open show
              </button>
            </div>
          </div>
        ) : !watchingLoading ? (
          <div className="absolute left-6 right-6 bottom-10 max-w-2xl">
            <p className="font-serif italic text-[52px] text-white leading-[1.05] tracking-[-0.025em]">
              Welcome back.
            </p>
            <p className="text-white/70 text-[15px] mt-3 font-sans">
              Add shows to your library to get started.
            </p>
          </div>
        ) : null}
      </div>

      {/* Stats strip */}
      <div className="flex gap-14 py-8">
        {[
          { v: stats?.totalShows ?? 0, l: "Shows", testId: "text-total-shows" },
          {
            v: stats?.watchingShows ?? 0,
            l: "Watching",
            testId: "text-watching-shows",
          },
          {
            v: stats?.completedShows ?? 0,
            l: "Completed",
            testId: "text-completed-shows",
          },
          {
            v: stats?.episodesWatched ?? 0,
            l: "Episodes",
            testId: "text-episodes-watched",
          },
        ].map((s) => (
          <div key={s.l}>
            {statsLoading ? (
              <Skeleton className="h-9 w-12 mb-1" />
            ) : (
              <div
                className="font-serif text-[36px] font-normal leading-none tracking-[-0.02em] text-foreground"
                data-testid={s.testId}
              >
                {s.v.toLocaleString()}
              </div>
            )}
            <div className="font-mono text-[10.5px] text-muted-foreground uppercase tracking-[0.12em] font-medium mt-1.5">
              {s.l}
            </div>
          </div>
        ))}
      </div>

      {/* Poster rows */}
      <PosterRow
        title="Watching"
        shows={watchingShows}
        isLoading={watchingLoading}
        status="watching"
        href="/watching"
      />
      <PosterRow
        title="Want to Watch"
        shows={wantShows}
        isLoading={wantLoading}
        status="want_to_watch"
        href="/want-to-watch"
      />
      <PosterRow
        title="Caught Up"
        shows={caughtUpShows}
        isLoading={caughtUpLoading}
        status="caught_up"
        href="/caught-up"
        upcoming
      />

      <div className="h-16" />
    </div>
  )
}
