// Duplicated from packages/shared/episode-utils.ts rather than imported: that
// package is ESM ("type": "module"), while server/api are CommonJS and
// Vercel copies server/** and packages/shared/** as separate files instead
// of bundling them (see vercel.json's `includeFiles`), so a runtime
// require() of an ESM file there crashes with ERR_REQUIRE_ESM.
export function isEpisodeAired(
  airDate: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!airDate) return false
  return new Date(airDate) <= now
}
