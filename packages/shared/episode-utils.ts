export function isEpisodeAired(
  airDate: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!airDate) return false
  return new Date(airDate) <= now
}
