import { useQuery } from '@tanstack/react-query';
import { ShowCard } from '@/components/show-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShowWithProgress } from '@shared/schema';
import { CheckCircle2 } from 'lucide-react';

export default function Completed() {
  const { data: shows, isLoading } = useQuery<ShowWithProgress[]>({
    queryKey: ['/api/shows/completed'],
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 bg-accent/10 rounded-lg">
          <CheckCircle2 className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h1 className="text-4xl font-heading font-bold text-foreground">Completed Shows</h1>
          <p className="text-muted-foreground">Shows you've finished watching</p>
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
            <CardTitle className="font-heading">No Completed Shows</CardTitle>
            <CardDescription>
              You haven't completed any shows yet. Keep watching to add shows to this list!
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
