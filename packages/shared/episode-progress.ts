import type { TMDBSeason, EpisodeProgress, StatusKey } from "./schema"
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

// Last aired episode across a show, walking seasons from the end. Skips
// specials (season 0). Returns null when nothing has aired yet.
export function findLastAiredEpisode(
  seasons: TMDBSeason[] | undefined
): { season: number; episode: number } | null {
  if (!seasons) return null
  const ordered = [...seasons]
    .filter((s) => s.season_number > 0)
    .sort((a, b) => b.season_number - a.season_number)

  for (const season of ordered) {
    let lastEpisode = 0
    for (const episode of season.episodes ?? []) {
      if (isEpisodeAired(episode.air_date))
        lastEpisode = Math.max(lastEpisode, episode.episode_number)
    }
    if (lastEpisode > 0)
      return { season: season.season_number, episode: lastEpisode }
  }
  return null
}

// The single definition of how watch progress maps to a collection status.
// Used by the server after every progress change, and by the web client when
// resuming a stopped show so both agree on where the show lands.
export function inferShowStatus({
  tmdbStatus,
  watchedEpisodes,
  totalAiredEpisodes,
}: {
  tmdbStatus: string | null | undefined
  watchedEpisodes: number
  totalAiredEpisodes: number
}): StatusKey {
  if (watchedEpisodes === 0) return "want_to_watch"

  const isShowEnded = tmdbStatus === "Ended" || tmdbStatus === "Canceled"
  const allAiredWatched =
    totalAiredEpisodes > 0 && watchedEpisodes >= totalAiredEpisodes

  if (allAiredWatched) return isShowEnded ? "completed" : "caught_up"
  return "watching"
}
