import { useState, useMemo, useEffect } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { apiRequest } from "@showtracker/api-client"
import type { PaginatedShowsResponse } from "@showtracker/shared"

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function useLibraryShows(endpoint: string) {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 350)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery<PaginatedShowsResponse>({
      queryKey: [endpoint, debouncedSearch],
      queryFn: async ({ pageParam = 1 }) => {
        const params = [`page=${pageParam}`, "limit=20"]
        if (debouncedSearch)
          params.push(`search=${encodeURIComponent(debouncedSearch)}`)
        const res = await apiRequest("GET", `${endpoint}?${params.join("&")}`)
        return res.json()
      },
      getNextPageParam: (last) =>
        last.page < last.totalPages ? last.page + 1 : undefined,
      initialPageParam: 1,
    })

  const shows = useMemo(() => data?.pages.flatMap((p) => p.shows) ?? [], [data])
  const total = data?.pages[0]?.total ?? 0

  const onEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage()
  }

  return {
    shows,
    total,
    isLoading,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    onEndReached,
    search,
    setSearch,
  }
}
