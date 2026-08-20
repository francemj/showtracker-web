import { redis } from "./redis"

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_BASE_URL = "https://api.themoviedb.org/3"

if (!TMDB_API_KEY) {
  throw new Error("Missing TMDB_API_KEY environment variable")
}

// TMDB is the slow, rate-limited dependency in every request path: one show
// page costs a details call plus one call per season, and a status sweep
// repeats that for the whole library. The payloads change on TMDB's schedule,
// not ours, so they cache well. TTLs are short enough that a new episode or a
// status change ("Returning Series" → "Ended") lands the same day.
const TTL_SECONDS = {
  details: 60 * 60 * 12,
  season: 60 * 60 * 6,
  search: 60 * 60,
} as const

export interface TmdbFetchOptions {
  /**
   * Skip the cached copy and fetch from TMDB. The background sync exists to
   * pull TMDB's latest into our database, so it must never be served a cached
   * response — that would refresh the source of truth with data we already
   * had. The fresh result is still written back, so the sync warms the cache
   * for everyone else.
   */
  forceRefresh?: boolean
}

/**
 * Read-through cache around a TMDB call. Redis is an optimisation, never a
 * dependency — if it is down or slow, callers still get live data.
 */
async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
  options: TmdbFetchOptions = {}
): Promise<T> {
  if (!options.forceRefresh) {
    try {
      const hit = await redis.get<T>(key)
      if (hit) return hit
    } catch (err) {
      console.error(`TMDB cache read failed for ${key}:`, err)
    }
  }

  const value = await fetcher()

  try {
    await redis.set(key, value, { ex: ttlSeconds })
  } catch (err) {
    console.error(`TMDB cache write failed for ${key}:`, err)
  }

  return value
}

export async function searchTVShows(query: string, page: number = 1) {
  return cached(
    `tmdb:search:${query.toLowerCase()}:${page}`,
    TTL_SECONDS.search,
    async () => {
      const response = await fetch(
        `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}`
      )
      if (!response.ok) {
        throw new Error("Failed to search TV shows")
      }
      const data = await response.json()
      return {
        results: data.results,
        page: data.page,
        totalPages: data.total_pages,
        totalResults: data.total_results,
      }
    }
  )
}

export async function getTVShowDetails(
  showId: number,
  options: TmdbFetchOptions = {}
) {
  return cached(
    `tmdb:show:${showId}`,
    TTL_SECONDS.details,
    async () => {
      const response = await fetch(
        `${TMDB_BASE_URL}/tv/${showId}?api_key=${TMDB_API_KEY}`
      )
      if (!response.ok) {
        throw new Error("Failed to get TV show details")
      }
      return response.json()
    },
    options
  )
}

export async function getTVShowSeason(
  showId: number,
  seasonNumber: number,
  options: TmdbFetchOptions = {}
) {
  return cached(
    `tmdb:season:${showId}:${seasonNumber}`,
    TTL_SECONDS.season,
    async () => {
      const response = await fetch(
        `${TMDB_BASE_URL}/tv/${showId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`
      )
      if (!response.ok) {
        throw new Error("Failed to get TV show season")
      }
      return response.json()
    },
    options
  )
}
