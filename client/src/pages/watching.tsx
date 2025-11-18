import { useQuery } from '@tanstack/react-query';
import { ShowCard } from '@/components/show-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShowWithProgress } from '@shared/schema';
import { Eye } from 'lucide-react';

export default function Watching() {
  const { data: shows, isLoading } = useQuery<ShowWithProgress[]>({
    queryKey: ['/api/shows/watching'],
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
          <Eye className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-heading font-bold text-foreground">Currently Watching</h1>
          <p className="text-muted-foreground">Shows you're actively following</p>
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
              You're not currently watching any shows. Add shows from the search page to start tracking!
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
