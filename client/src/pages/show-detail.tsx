import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Star, Calendar, Clock, Tv, CheckCircle2 } from 'lucide-react';
import { ShowWithProgress, TMDBSeason, TMDBEpisode } from '@shared/schema';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function ShowDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [pendingEpisode, setPendingEpisode] = useState<{ seasonNumber: number; episodeNumber: number } | null>(null);

  const { data: show, isLoading: showLoading } = useQuery<ShowWithProgress>({
    queryKey: ['/api/shows', id],
    enabled: !!id,
  });

  const { data: seasons, isLoading: seasonsLoading } = useQuery<TMDBSeason[]>({
    queryKey: ['/api/shows', id, 'seasons'],
    enabled: !!id,
  });

  const { data: watchProgress } = useQuery<Array<{ seasonNumber: number; episodeNumber: number; watched: boolean }>>({
    queryKey: ['/api/shows', id, 'progress'],
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return apiRequest('PATCH', `/api/user/shows/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shows', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shows/watching'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shows/completed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shows/want-to-watch'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shows/continue-watching'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/shows'] });
      toast({ title: 'Status Updated', description: 'Show status has been updated.' });
    },
  });

  const toggleEpisodeMutation = useMutation({
    mutationFn: async ({ seasonNumber, episodeNumber, watched }: { seasonNumber: number; episodeNumber: number; watched: boolean }) => {
      return apiRequest('POST', `/api/shows/${id}/progress`, { seasonNumber, episodeNumber, watched });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shows', id, 'progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shows', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shows/watching'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shows/completed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shows/want-to-watch'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shows/continue-watching'] });
    },
  });

  const markSeasonWatchedMutation = useMutation({
    mutationFn: async ({ seasonNumber, watched }: { seasonNumber: number; watched: boolean }) => {
      return apiRequest('POST', `/api/shows/${id}/season/${seasonNumber}/mark-all`, { watched });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shows', id, 'progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shows', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shows/watching'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shows/completed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shows/want-to-watch'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shows/continue-watching'] });
      toast({ title: 'Season Updated', description: 'All episodes in season have been updated.' });
    },
  });

  const isEpisodeWatched = (seasonNumber: number, episodeNumber: number) => {
    return watchProgress?.some(
      (wp) => wp.seasonNumber === seasonNumber && wp.episodeNumber === episodeNumber && wp.watched
    );
  };

  const getSeasonProgress = (seasonNumber: number) => {
    const season = seasons?.find(s => s.season_number === seasonNumber);
    if (!season || !season.episodes) return { watched: 0, total: 0, percentage: 0 };
    
    const watched = season.episodes.filter(ep => isEpisodeWatched(seasonNumber, ep.episode_number)).length;
    const total = season.episodes.length;
    const percentage = total > 0 ? (watched / total) * 100 : 0;
    
    return { watched, total, percentage };
  };

  const markPreviousEpisodes = async (targetSeason: number, targetEpisode: number) => {
    if (!seasons) return;
    
    const episodesToMark: Array<{ seasonNumber: number; episodeNumber: number }> = [];
    
    for (const season of seasons) {
      if (season.season_number > targetSeason) continue;
      
      if (season.episodes) {
        for (const episode of season.episodes) {
          if (season.season_number < targetSeason) {
            if (!isEpisodeWatched(season.season_number, episode.episode_number)) {
              episodesToMark.push({
                seasonNumber: season.season_number,
                episodeNumber: episode.episode_number,
              });
            }
          } else if (season.season_number === targetSeason && episode.episode_number <= targetEpisode) {
            if (!isEpisodeWatched(season.season_number, episode.episode_number)) {
              episodesToMark.push({
                seasonNumber: season.season_number,
                episodeNumber: episode.episode_number,
              });
            }
          }
        }
      }
    }
    
    for (const ep of episodesToMark) {
      await apiRequest('POST', `/api/shows/${id}/progress`, {
        seasonNumber: ep.seasonNumber,
        episodeNumber: ep.episodeNumber,
        watched: true,
      });
    }
    
    queryClient.invalidateQueries({ queryKey: ['/api/shows', id, 'progress'] });
    queryClient.invalidateQueries({ queryKey: ['/api/shows', id] });
    queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    queryClient.invalidateQueries({ queryKey: ['/api/shows/watching'] });
    queryClient.invalidateQueries({ queryKey: ['/api/shows/completed'] });
    queryClient.invalidateQueries({ queryKey: ['/api/shows/want-to-watch'] });
    queryClient.invalidateQueries({ queryKey: ['/api/shows/continue-watching'] });
    
    toast({
      title: 'Episodes Marked',
      description: `Marked ${episodesToMark.length} episode${episodesToMark.length !== 1 ? 's' : ''} as watched`,
    });
  };

  const handleEpisodeToggle = (seasonNumber: number, episodeNumber: number, checked: boolean) => {
    const isAlreadyWatched = isEpisodeWatched(seasonNumber, episodeNumber);
    
    if (checked && !isAlreadyWatched) {
      setPendingEpisode({ seasonNumber, episodeNumber });
    } else {
      toggleEpisodeMutation.mutate({ seasonNumber, episodeNumber, watched: checked });
    }
  };

  const handleConfirmMarkAll = async () => {
    if (!pendingEpisode) return;
    
    await markPreviousEpisodes(pendingEpisode.seasonNumber, pendingEpisode.episodeNumber);
    setPendingEpisode(null);
  };

  const handleMarkJustOne = () => {
    if (!pendingEpisode) return;
    
    toggleEpisodeMutation.mutate({
      seasonNumber: pendingEpisode.seasonNumber,
      episodeNumber: pendingEpisode.episodeNumber,
      watched: true,
    });
    setPendingEpisode(null);
  };

  if (showLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="aspect-[2/3]" />
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!show) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Show Not Found</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const posterUrl = show.posterPath
    ? `https://image.tmdb.org/t/p/w500${show.posterPath}`
    : '/placeholder-poster.png';

  const backdropUrl = show.backdropPath
    ? `https://image.tmdb.org/t/p/original${show.backdropPath}`
    : null;

  return (
    <div className="space-y-8">
      {backdropUrl && (
        <div className="relative -mt-8 -mx-8 h-64 md:h-80 overflow-hidden">
          <img
            src={backdropUrl}
            alt={show.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="relative aspect-[2/3]">
              <img
                src={posterUrl}
                alt={show.name}
                className="w-full h-full object-cover"
              />
            </div>
          </Card>

          {show.userShow && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-heading">Your Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={show.userShow.status}
                  onValueChange={(value) => updateStatusMutation.mutate(value)}
                  data-testid="select-show-status"
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="want_to_watch">Want to Watch</SelectItem>
                    <SelectItem value="watching">Watching</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

                {show.progress !== undefined && show.progress > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium text-accent">{Math.round(show.progress)}%</span>
                    </div>
                    <Progress value={show.progress} className="h-2" />
                    {show.watchedEpisodes !== undefined && show.totalEpisodes !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        {show.watchedEpisodes} / {show.totalEpisodes} episodes watched
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-4xl font-heading font-bold text-foreground mb-4" data-testid="text-show-title">
              {show.name}
            </h1>

            <div className="flex flex-wrap items-center gap-3 mb-6">
              {show.voteAverage && parseFloat(show.voteAverage) > 0 && (
                <Badge variant="outline" className="text-sm">
                  <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                  {parseFloat(show.voteAverage).toFixed(1)}
                </Badge>
              )}
              {show.firstAirDate && (
                <Badge variant="outline" className="text-sm">
                  <Calendar className="w-4 h-4 mr-1" />
                  {new Date(show.firstAirDate).getFullYear()}
                </Badge>
              )}
              {show.numberOfSeasons && (
                <Badge variant="outline" className="text-sm">
                  <Tv className="w-4 h-4 mr-1" />
                  {show.numberOfSeasons} Season{show.numberOfSeasons !== 1 ? 's' : ''}
                </Badge>
              )}
              {show.status && (
                <Badge variant={show.status === 'Ended' ? 'secondary' : 'default'}>
                  {show.status}
                </Badge>
              )}
            </div>

            {show.genres && show.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {show.genres.map((genre, idx) => (
                  <Badge key={idx} variant="outline">{genre}</Badge>
                ))}
              </div>
            )}

            {show.overview && (
              <p className="text-base text-foreground leading-relaxed">{show.overview}</p>
            )}
          </div>

          <Separator />

          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground mb-4">Seasons & Episodes</h2>
            
            {seasonsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : seasons && seasons.length > 0 ? (
              <Accordion type="multiple" className="space-y-4">
                {seasons
                  .filter(season => season.season_number > 0)
                  .map((season) => {
                    const progress = getSeasonProgress(season.season_number);
                    const allWatched = progress.watched === progress.total && progress.total > 0;

                    return (
                      <AccordionItem
                        key={season.id}
                        value={`season-${season.season_number}`}
                        className="border rounded-lg px-4"
                      >
                        <AccordionTrigger className="hover:no-underline" data-testid={`accordion-season-${season.season_number}`}>
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-3">
                              <div className="text-left">
                                <h3 className="font-heading font-semibold">
                                  Season {season.season_number}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {season.episode_count} Episode{season.episode_count !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm font-medium text-accent">
                                  {progress.watched} / {progress.total}
                                </p>
                                <Progress value={progress.percentage} className="w-24 h-1.5" />
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4">
                          <div className="space-y-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                markSeasonWatchedMutation.mutate({
                                  seasonNumber: season.season_number,
                                  watched: !allWatched,
                                })
                              }
                              disabled={markSeasonWatchedMutation.isPending}
                              data-testid={`button-mark-season-${season.season_number}`}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              {allWatched ? 'Mark All Unwatched' : 'Mark All Watched'}
                            </Button>

                            <div className="space-y-2">
                              {season.episodes?.map((episode) => {
                                const watched = isEpisodeWatched(season.season_number, episode.episode_number);
                                const stillUrl = episode.still_path
                                  ? `https://image.tmdb.org/t/p/w300${episode.still_path}`
                                  : null;

                                return (
                                  <div
                                    key={episode.id}
                                    className="flex items-start gap-3 p-3 rounded-lg hover-elevate transition-all"
                                    data-testid={`episode-${season.season_number}-${episode.episode_number}`}
                                  >
                                    <Checkbox
                                      checked={watched}
                                      onCheckedChange={(checked) =>
                                        handleEpisodeToggle(season.season_number, episode.episode_number, !!checked)
                                      }
                                      data-testid={`checkbox-episode-${season.season_number}-${episode.episode_number}`}
                                    />
                                    {stillUrl && (
                                      <div className="w-32 h-18 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                                        <img
                                          src={stillUrl}
                                          alt={episode.name}
                                          className="w-full h-full object-cover"
                                          loading="lazy"
                                        />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-sm mb-1">
                                        {episode.episode_number}. {episode.name}
                                      </h4>
                                      {episode.air_date && (
                                        <p className="text-xs text-muted-foreground mb-1">
                                          <Calendar className="w-3 h-3 inline mr-1" />
                                          {new Date(episode.air_date).toLocaleDateString()}
                                        </p>
                                      )}
                                      {episode.overview && (
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                          {episode.overview}
                                        </p>
                                      )}
                                      {episode.runtime && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          <Clock className="w-3 h-3 inline mr-1" />
                                          {episode.runtime} min
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
              </Accordion>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-base">No Season Information</CardTitle>
                </CardHeader>
              </Card>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={pendingEpisode !== null} onOpenChange={(open) => !open && setPendingEpisode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Previous Episodes?</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to mark all previous episodes as watched as well? This will mark all episodes before S{pendingEpisode?.seasonNumber}E{pendingEpisode?.episodeNumber} as watched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleMarkJustOne} data-testid="button-mark-just-one">
              Just This Episode
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmMarkAll} data-testid="button-mark-all-previous">
              Mark All Previous
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
