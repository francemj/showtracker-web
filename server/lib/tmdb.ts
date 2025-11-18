const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  throw new Error('Missing TMDB_API_KEY environment variable');
}

export async function searchTVShows(query: string) {
  const response = await fetch(
    `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=1`
  );
  if (!response.ok) {
    throw new Error('Failed to search TV shows');
  }
  const data = await response.json();
  return data.results;
}

export async function getTVShowDetails(showId: number) {
  const response = await fetch(
    `${TMDB_BASE_URL}/tv/${showId}?api_key=${TMDB_API_KEY}`
  );
  if (!response.ok) {
    throw new Error('Failed to get TV show details');
  }
  return response.json();
}

export async function getTVShowSeason(showId: number, seasonNumber: number) {
  const response = await fetch(
    `${TMDB_BASE_URL}/tv/${showId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`
  );
  if (!response.ok) {
    throw new Error('Failed to get TV show season');
  }
  return response.json();
}
