import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShowWithProgress } from "@shared/schema";
import { Link } from "wouter";
import { Star, Calendar } from "lucide-react";

interface ShowCardProps {
  show: ShowWithProgress;
  href?: string;
}

export function ShowCard({ show, href }: ShowCardProps) {
  const posterUrl = show.posterPath
    ? `https://image.tmdb.org/t/p/w500${show.posterPath}`
    : '/placeholder-poster.png';

  const progress = show.progress || 0;
  const year = show.firstAirDate ? new Date(show.firstAirDate).getFullYear() : null;

  const content = (
    <Card className="overflow-hidden hover-elevate transition-all duration-200 group cursor-pointer" data-testid={`card-show-${show.id}`}>
      <div className="relative aspect-[2/3] overflow-hidden bg-muted">
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
      
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-heading font-semibold text-base line-clamp-1" data-testid={`text-show-title-${show.id}`}>
            {show.name}
          </h3>
          {year && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{year}</span>
              {show.numberOfSeasons && (
                <>
                  <span className="mx-1">•</span>
                  <span>{show.numberOfSeasons} Season{show.numberOfSeasons !== 1 ? 's' : ''}</span>
                </>
              )}
            </div>
          )}
        </div>

        {progress > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-accent">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            {show.watchedEpisodes !== undefined && show.totalEpisodes !== undefined && (
              <p className="text-xs text-muted-foreground">
                {show.watchedEpisodes} / {show.totalEpisodes} episodes
              </p>
            )}
          </div>
        )}

        {show.userShow?.status && (
          <Badge 
            variant={
              show.userShow.status === 'watching' ? 'default' :
              show.userShow.status === 'completed' ? 'secondary' :
              'outline'
            }
            className="text-xs"
          >
            {show.userShow.status === 'want_to_watch' && 'Want to Watch'}
            {show.userShow.status === 'watching' && 'Watching'}
            {show.userShow.status === 'completed' && 'Completed'}
          </Badge>
        )}
      </div>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
