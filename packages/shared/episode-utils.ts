// TMDB gives a date with no time and no timezone ("2026-08-25"), and that date
// is the original network's local air date. `new Date("2026-08-25")` parses it
// as UTC midnight, which is the earliest instant that date exists anywhere —
// so west of UTC it lands on the previous evening (5pm PT / 8pm ET the day
// before). That made episodes read as aired, and render as dated, a full day
// early. Parsing to local midnight instead keeps the calendar date intact
// wherever it is read.
//
// We still cannot know the hour an episode drops, because TMDB does not carry
// one, so "aired" means "the air date has arrived where you are".
export function parseAirDate(airDate: string | null | undefined): Date | null {
  if (!airDate) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(airDate)
  if (!match) {
    const parsed = new Date(airDate)
    return isNaN(parsed.getTime()) ? null : parsed
  }
  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}

export function isEpisodeAired(
  airDate: string | null | undefined,
  now: Date = new Date()
): boolean {
  const parsed = parseAirDate(airDate)
  if (!parsed) return false
  return parsed <= now
}

export function formatAirDate(
  airDate: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string | null {
  const parsed = parseAirDate(airDate)
  return parsed ? parsed.toLocaleDateString(undefined, options) : null
}
