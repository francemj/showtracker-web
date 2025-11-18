import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShowCard } from '@/components/show-card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, CheckCircle2, Clock, Eye } from 'lucide-react';
import { ShowWithProgress } from '@shared/schema';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalShows: number;
    watchingShows: number;
    completedShows: number;
    episodesWatched: number;
  }>({
    queryKey: ['/api/stats'],
  });

  const { data: recentShows, isLoading: showsLoading } = useQuery<ShowWithProgress[]>({
    queryKey: ['/api/shows/recent'],
  });

  const { data: continueWatching, isLoading: continueLoading } = useQuery<ShowWithProgress[]>({
    queryKey: ['/api/shows/continue-watching'],
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-heading font-bold text-foreground mb-2" data-testid="text-dashboard-title">
          Dashboard
        </h1>
        <p className="text-muted-foreground">Track your TV shows and manage your watching progress</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shows</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-heading font-bold text-primary" data-testid="text-total-shows">
                {stats?.totalShows || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">In your collection</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currently Watching</CardTitle>
            <Eye className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-heading font-bold text-primary" data-testid="text-watching-shows">
                {stats?.watchingShows || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Active shows</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-heading font-bold text-accent" data-testid="text-completed-shows">
                {stats?.completedShows || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Finished shows</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Episodes Watched</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-heading font-bold text-secondary" data-testid="text-episodes-watched">
                {stats?.episodesWatched || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Total episodes</p>
          </CardContent>
        </Card>
      </div>

      {continueLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3]" />
            ))}
          </div>
        </div>
      ) : continueWatching && continueWatching.length > 0 ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground mb-2">Continue Watching</h2>
            <p className="text-sm text-muted-foreground">Pick up where you left off</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {continueWatching.map((show) => (
              <ShowCard key={show.id} show={show} href={`/show/${show.id}`} />
            ))}
          </div>
        </div>
      ) : null}

      {showsLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3]" />
            ))}
          </div>
        </div>
      ) : recentShows && recentShows.length > 0 ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground mb-2">Recently Added</h2>
            <p className="text-sm text-muted-foreground">Your latest additions</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentShows.slice(0, 8).map((show) => (
              <ShowCard key={show.id} show={show} href={`/show/${show.id}`} />
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Get Started</CardTitle>
            <CardDescription>
              You haven't added any shows yet. Search for shows to start tracking!
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
