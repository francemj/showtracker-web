import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { TrendingUp, Clock, Eye, Zap, ArrowRight } from "lucide-react"
import { ShowWithProgress } from "@shared/schema"
import { gridColumns, ShowGrid, showGridClass } from "@/components/show-grid"
import { Link } from "wouter"
import { apiRequest } from "@/lib/queryClient"
import { useBreakpoint } from "@/hooks/use-breakpoint"

const LIMIT = 6

export default function Dashboard() {
  const breakpoint = useBreakpoint()
  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalShows: number
    watchingShows: number
    completedShows: number
    episodesWatched: number
  }>({
    queryKey: ["/api/stats"],
  })

  const { data: wantToWatchData, isLoading: showsLoading } = useQuery<{
    shows: ShowWithProgress[]
    total: number
    page: number
    totalPages: number
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

  const { data: currentlyWatchingData, isLoading: currentlyWatchingLoading } =
    useQuery<{
      shows: ShowWithProgress[]
      total: number
      page: number
      totalPages: number
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

  const { data: caughtUpData, isLoading: caughtUpLoading } = useQuery<{
    shows: ShowWithProgress[]
    total: number
    page: number
    totalPages: number
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

  const numberOfColumns = gridColumns[breakpoint]
  const effectiveLimit = Math.min(LIMIT, numberOfColumns)
  const wantToWatchShows = wantToWatchData?.shows || []
  const currentlyWatching = currentlyWatchingData?.shows || []
  const caughtUpShows = caughtUpData?.shows || []

  return (
    <div className="space-y-8">
      <div>
        <h1
          className="text-4xl font-heading font-bold text-foreground mb-2"
          data-testid="text-dashboard-title"
        >
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Track your TV shows and manage your watching progress
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium min-h-8 flex items-center">
              Total Shows
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div
                className="text-3xl font-heading font-bold text-primary"
                data-testid="text-total-shows"
              >
                {stats?.totalShows || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              In your collection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium min-h-8 flex items-center">
              Watching
            </CardTitle>
            <Eye className="w-4 h-4 text-primary shrink-0" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div
                className="text-3xl font-heading font-bold text-primary"
                data-testid="text-watching-shows"
              >
                {stats?.watchingShows || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Active shows</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium min-h-8 flex items-center">
              Caught Up
            </CardTitle>
            <Zap className="w-4 h-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div
                className="text-3xl font-heading font-bold text-accent"
                data-testid="text-completed-shows"
              >
                {stats?.completedShows || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Finished shows</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium min-h-8 flex items-center">
              Episodes Watched
            </CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div
                className="text-3xl font-heading font-bold text-secondary"
                data-testid="text-episodes-watched"
              >
                {stats?.episodesWatched || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Total episodes</p>
          </CardContent>
        </Card>
      </div>

      <div className={showGridClass}>
        <div className="flex items-center justify-between col-span-full my-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
              <Eye className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-2">
                Currently Watching
              </h2>
              <p className="text-sm text-muted-foreground">
                Pick up where you left off
              </p>
            </div>
          </div>
          {currentlyWatchingData &&
            currentlyWatchingData.total > effectiveLimit && (
              <Link href="/watching">
                <Button variant="outline" size="sm">
                  See All
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
        </div>
        <ShowGrid
          shows={currentlyWatching.slice(0, effectiveLimit)}
          isLoading={currentlyWatchingLoading}
          noContainer
        />

        <div className="flex items-center justify-between col-span-full my-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-teal-600/10 rounded-lg">
              <Zap className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-2xl font-heading font-bold text-foreground">
                Caught Up
              </h2>
              <p className="text-sm text-muted-foreground">
                Shows where you've watched all available episodes
              </p>
            </div>
          </div>
          {caughtUpData && caughtUpData.total > effectiveLimit && (
            <Link href="/caught-up">
              <Button variant="outline" size="sm">
                See All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          )}
        </div>
        <ShowGrid
          shows={caughtUpShows.slice(0, effectiveLimit)}
          isLoading={caughtUpLoading}
          noContainer
        />

        <div className="flex items-center justify-between col-span-full my-2">
          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground mb-2">
              Start Watching
            </h2>
            <p className="text-sm text-muted-foreground">
              Shows you want to watch
            </p>
          </div>
          {wantToWatchData && wantToWatchData.total > effectiveLimit && (
            <Link href="/want-to-watch">
              <Button variant="outline" size="sm">
                See All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          )}
        </div>
        <ShowGrid
          shows={wantToWatchShows.slice(0, effectiveLimit)}
          isLoading={showsLoading}
          noContainer
        />
      </div>
    </div>
  )
}
