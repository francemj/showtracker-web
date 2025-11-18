import { useQuery } from '@tanstack/react-query';
import { ShowCard } from '@/components/show-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShowWithProgress } from '@shared/schema';
import { Zap } from 'lucide-react';

export default function CaughtUp() {
  const { data: shows, isLoading } = useQuery<ShowWithProgress[]>({
    queryKey: ['/api/shows/caught-up'],
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 bg-teal-600/10 rounded-lg">
          <Zap className="w-6 h-6 text-teal-600" />
        </div>
        <div>
          <h1 className="text-4xl font-heading font-bold text-foreground">Caught Up</h1>
          <p className="text-muted-foreground">Shows where you've watched all available episodes</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3]" />
          ))}
        </div>
      ) : shows && shows.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {shows.map((show) => (
            <ShowCard key={show.id} show={show} href={`/show/${show.id}`} />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">No Shows</CardTitle>
            <CardDescription>
              You don't have any shows where you're caught up yet. Keep watching to get up to date with your favorite ongoing shows!
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
