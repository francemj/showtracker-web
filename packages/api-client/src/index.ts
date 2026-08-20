import { useState, useEffect, useMemo } from "react"
import {
  QueryClient,
  type QueryFunction,
  useInfiniteQuery,
} from "@tanstack/react-query"
import type { PaginatedShowsResponse } from "@showtracker/shared"

let getApiToken: () => Promise<string | null> = async () => null
let apiBaseUrl = ""

export function setApiTokenGetter(fn: () => Promise<string | null>) {
  getApiToken = fn
}

// Mobile apps need an absolute base URL; web app passes "" (uses relative paths)
export function setApiBaseUrl(url: string) {
  apiBaseUrl = url.replace(/\/$/, "")
}

export interface ApiError extends Error {
  status: number
}

// Surface the server's own message so callers can show it verbatim instead of
// guessing at a cause. The status stays available for callers that branch on it.
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText
    let message = text
    try {
      const parsed = JSON.parse(text)
      if (parsed?.message) message = parsed.message
    } catch {
      // Not JSON — fall back to the raw body.
    }
    const error = new Error(message) as ApiError
    error.status = res.status
    throw error
  }
}

function resolveUrl(url: string): string {
  return url.startsWith("http") ? url : `${apiBaseUrl}${url}`
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const token = await getApiToken()
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  const res = await fetch(resolveUrl(url), {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: apiBaseUrl ? "omit" : "include",
  })

  await throwIfResNotOk(res)
  return res
}

type UnauthorizedBehavior = "returnNull" | "throw"

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = await getApiToken()
    const res = await fetch(resolveUrl(queryKey.join("/") as string), {
      credentials: apiBaseUrl ? "omit" : "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null
    }

    await throwIfResNotOk(res)
    return await res.json()
  }

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// Core library hook shared between web and mobile.
// Returns fetchNextPage so each platform can wire up its own scroll trigger:
//   web  → pass to useInfiniteScroll for an IntersectionObserver ref
//   mobile → call inside FlatList's onEndReached
export function useLibraryShows(endpoint: string) {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 350)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useInfiniteQuery<PaginatedShowsResponse>({
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

  return {
    shows,
    total,
    isLoading,
    // Callers need to tell "the request failed" apart from "you have no
    // shows". Without these the only non-loading branch is the empty state,
    // so a failed fetch renders as an empty library.
    isError,
    error: error as Error | null,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
    search,
    setSearch,
  }
}

// Watch progress changes from other devices and from the background status
// sweep, so cached data has to be able to go stale on its own. Long enough
// that navigating between library tabs doesn't refetch on every visit, short
// enough that returning to the app shows the truth.
const DEFAULT_STALE_TIME_MS = 60 * 1000

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        queryFn: getQueryFn({ on401: "throw" }),
        networkMode: "always",
        refetchInterval: false,
        // Previously staleTime: Infinity with no refetch triggers, which meant
        // data only ever changed when something explicitly invalidated it — so
        // anything the server changed on its own stayed wrong until reload.
        staleTime: DEFAULT_STALE_TIME_MS,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: false,
      },
      mutations: {
        networkMode: "always",
        retry: false,
      },
    },
  })
}
