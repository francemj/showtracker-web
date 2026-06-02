import { useLibraryShows as useSharedLibraryShows } from "@showtracker/api-client"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"

export function useLibraryShows(endpoint: string) {
  const lib = useSharedLibraryShows(endpoint)
  const observerTarget = useInfiniteScroll(
    () => lib.fetchNextPage(),
    lib.hasNextPage,
    lib.isFetchingNextPage
  )
  return { ...lib, observerTarget }
}
