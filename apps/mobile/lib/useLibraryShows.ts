import { useLibraryShows as useSharedLibraryShows } from "@showtracker/api-client"

export function useLibraryShows(endpoint: string) {
  const lib = useSharedLibraryShows(endpoint)
  const onEndReached = () => {
    if (lib.hasNextPage && !lib.isFetchingNextPage) lib.fetchNextPage()
  }
  return { ...lib, onEndReached }
}
