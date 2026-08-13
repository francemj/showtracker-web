import type { TMDBSeason, EpisodeProgress } from "./schema"
import { isEpisodeAired } from "./episode-utils"

export function isEpisodeWatched(
  progress: EpisodeProgress[] | undefined,
  seasonNumber: number,
  episodeNumber: number
): boolean {
  return !!progress?.some(
    (wp) =>
      wp.season === seasonNumber && wp.episode === episodeNumber && wp.watched
  )
}

export function hasUnwatchedEpisodesBefore(
  seasons: TMDBSeason[] | undefined,
  progress: EpisodeProgress[] | undefined,
  targetSeason: number,
  targetEpisode: number
): boolean {
  if (!seasons) return false
  for (const season of seasons) {
    if (season.season_number > targetSeason) break
    if (season.episodes) {
      for (const episode of season.episodes) {
        if (!isEpisodeAired(episode.air_date)) continue
        if (season.season_number < targetSeason) {
          if (
            !isEpisodeWatched(
              progress,
              season.season_number,
              episode.episode_number
            )
          )
            return true
        } else if (
          season.season_number === targetSeason &&
          episode.episode_number < targetEpisode
        ) {
          if (
            !isEpisodeWatched(
              progress,
              season.season_number,
              episode.episode_number
            )
          )
            return true
        }
      }
    }
  }
  return false
}

export function buildEpisodesToMark(
  seasons: TMDBSeason[] | undefined,
  progress: EpisodeProgress[] | undefined,
  targetSeason: number,
  targetEpisode: number
): Array<{ season: number; episode: number; watched: true }> {
  if (!seasons) return []
  const episodesToMark: Array<{
    season: number
    episode: number
    watched: true
  }> = []
  for (const season of seasons) {
    if (season.season_number > targetSeason) continue
    if (season.episodes) {
      for (const episode of season.episodes) {
        if (!isEpisodeAired(episode.air_date)) continue
        if (season.season_number < targetSeason) {
          if (
            !isEpisodeWatched(
              progress,
              season.season_number,
              episode.episode_number
            )
          )
            episodesToMark.push({
              season: season.season_number,
              episode: episode.episode_number,
              watched: true,
            })
        } else if (
          season.season_number === targetSeason &&
          episode.episode_number <= targetEpisode
        ) {
          if (
            !isEpisodeWatched(
              progress,
              season.season_number,
              episode.episode_number
            )
          )
            episodesToMark.push({
              season: season.season_number,
              episode: episode.episode_number,
              watched: true,
            })
        }
      }
    }
  }
  return episodesToMark
}

export function buildEpisodesToUnmark(
  seasons: TMDBSeason[] | undefined,
  progress: EpisodeProgress[] | undefined,
  targetSeason: number,
  targetEpisode: number
): Array<{ season: number; episode: number; watched: false }> {
  if (!seasons) return []
  const episodesToUnmark: Array<{
    season: number
    episode: number
    watched: false
  }> = []
  for (const season of seasons) {
    if (season.season_number < targetSeason) continue
    if (season.episodes) {
      for (const episode of season.episodes) {
        if (!isEpisodeAired(episode.air_date)) continue
        if (season.season_number > targetSeason) {
          if (
            isEpisodeWatched(
              progress,
              season.season_number,
              episode.episode_number
            )
          )
            episodesToUnmark.push({
              season: season.season_number,
              episode: episode.episode_number,
              watched: false,
            })
        } else if (
          season.season_number === targetSeason &&
          episode.episode_number >= targetEpisode
        ) {
          if (
            isEpisodeWatched(
              progress,
              season.season_number,
              episode.episode_number
            )
          )
            episodesToUnmark.push({
              season: season.season_number,
              episode: episode.episode_number,
              watched: false,
            })
        }
      }
    }
  }
  return episodesToUnmark
}
