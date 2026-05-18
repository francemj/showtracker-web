import { useInfiniteQuery } from "@tanstack/react-query"
import { ShowWithProgress } from "@shared/schema"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { apiRequest } from "@/lib/queryClient"
import { useMemo } from "react"
import { LibraryView } from "./library-view"

interface PaginatedResponse {
  shows: ShowWithProgress[]
  total: number
  page: number
  totalPages: number
}

export default function Watching() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery<PaginatedResponse>({
      queryKey: ["/api/shows/watching"],
      queryFn: async ({ pageParam = 1 }) => {
        const res = await apiRequest(
          "GET",
          `/api/shows/watching?page=${pageParam}&limit=20`
        )
        return res.json()
      },
      getNextPageParam: (lastPage) =>
        lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
      initialPageParam: 1,
    })

  const shows = useMemo(() => data?.pages.flatMap((p) => p.shows) || [], [data])
  const total = data?.pages[0]?.total ?? 0
  const observerTarget = useInfiniteScroll(
    () => fetchNextPage(),
    hasNextPage ?? false,
    isFetchingNextPage
  )

  return (
    <LibraryView
      activeTab="watching"
      shows={shows}
      isLoading={isLoading}
      total={total}
      hasNextPage={hasNextPage ?? false}
      isFetchingNextPage={isFetchingNextPage}
      observerTarget={observerTarget}
      emptyMessage={
        <p className="text-muted-foreground col-span-full py-8">
          No shows yet. Search for shows to add them to your library.
        </p>
      }
    />
  )
}
