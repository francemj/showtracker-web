import { useState, useMemo } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { PaginatedShowsResponse } from "@shared/schema"
import { apiRequest } from "@/lib/queryClient"
import { useDebounce } from "@/hooks/use-debounce"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"

export function useLibraryShows(endpoint: string) {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 350)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery<PaginatedShowsResponse>({
      queryKey: [endpoint, debouncedSearch],
      queryFn: async ({ pageParam = 1 }) => {
        const qs = new URLSearchParams({ page: String(pageParam), limit: "20" })
        if (debouncedSearch) qs.set("search", debouncedSearch)
        const res = await apiRequest("GET", `${endpoint}?${qs}`)
        return res.json()
      },
      getNextPageParam: (last) =>
        last.page < last.totalPages ? last.page + 1 : undefined,
      initialPageParam: 1,
    })

  const shows = useMemo(() => data?.pages.flatMap((p) => p.shows) ?? [], [data])
  const total = data?.pages[0]?.total ?? 0
  const observerTarget = useInfiniteScroll(
    () => fetchNextPage(),
    hasNextPage ?? false,
    isFetchingNextPage
  )

  return {
    shows,
    total,
    isLoading,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    observerTarget,
    search,
    setSearch,
  }
}
