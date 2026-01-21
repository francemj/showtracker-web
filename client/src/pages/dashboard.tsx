import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, Clock, Eye, Zap } from "lucide-react"
import { ShowWithProgress } from "@shared/schema"
import { ShowGrid, showGridClass } from "@/components/show-grid"

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalShows: number
    watchingShows: number
    completedShows: number
    episodesWatched: number
  }>({
    queryKey: ["/api/stats"],
  })

  const { data: wantToWatchShows, isLoading: showsLoading } = useQuery<
    ShowWithProgress[]
  >({
    queryKey: ["/api/shows/want-to-watch"],
  })

  const { data: currentlyWatching, isLoading: currentlyWatchingLoading } =
    useQuery<ShowWithProgress[]>({
      queryKey: ["/api/shows/watching"],
    })

  const { data: caughtUpShows, isLoading: caughtUpLoading } = useQuery<
    ShowWithProgress[]
  >({
    queryKey: ["/api/shows/caught-up"],
  })

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
        <div className="flex items-center gap-3 col-span-full my-2">
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
        <ShowGrid
          shows={currentlyWatching}
          isLoading={currentlyWatchingLoading}
          noContainer
        />

        <div className="flex items-center gap-3 col-span-full my-2">
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
        <ShowGrid
          shows={caughtUpShows}
          isLoading={caughtUpLoading}
          noContainer
        />

        <div className="col-span-full my-2">
          <h2 className="text-2xl font-heading font-bold text-foreground mb-2">
            Start Watching
          </h2>
          <p className="text-sm text-muted-foreground">
            Shows you want to watch
          </p>
        </div>
        <ShowGrid
          shows={wantToWatchShows}
          isLoading={showsLoading}
          noContainer
        />
      </div>
    </div>
  )
}
