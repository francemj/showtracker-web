import { useInfiniteQuery } from "@tanstack/react-query"
import { PaginatedShowsResponse } from "@shared/schema"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { apiRequest } from "@/lib/queryClient"
import { useMemo } from "react"
import { LibraryView } from "./library-view"

export default function CaughtUp() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery<PaginatedShowsResponse>({
      queryKey: ["/api/shows/caught-up"],
      queryFn: async ({ pageParam = 1 }) => {
        const res = await apiRequest(
          "GET",
          `/api/shows/caught-up?page=${pageParam}&limit=20`
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
      activeTab="caught_up"
      shows={shows}
      isLoading={isLoading}
      total={total}
      hasNextPage={hasNextPage ?? false}
      isFetchingNextPage={isFetchingNextPage}
      observerTarget={observerTarget}
      emptyMessage={
        <p className="text-muted-foreground col-span-full py-8">
          No shows yet. Keep watching to catch up!
        </p>
      }
    />
  )
}
