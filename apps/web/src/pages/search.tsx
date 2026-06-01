import { useState, useMemo } from "react"
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query"
import { Skeleton } from "@/components/ui/skeleton"
import { AddToCollectionButton } from "@/components/add-to-collection-button"
import { statusPalette, type StatusKey } from "@/lib/status"
import { useTheme } from "@/components/theme-provider"
import { Search as SearchIcon, Check, Star } from "lucide-react"
import { UserShow, SearchResponse } from "@shared/schema"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { useDebounce } from "@/hooks/use-debounce"
import { Link } from "wouter"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"

export default function Search() {
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 500)
  const { toast } = useToast()
  const { theme } = useTheme()

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery<SearchResponse>({
      queryKey: ["/api/search/shows", debouncedSearch],
      queryFn: async ({ pageParam = 1 }) => {
        const res = await apiRequest(
          "GET",
          `/api/search/shows/${encodeURIComponent(debouncedSearch)}?page=${pageParam}`
        )
        return res.json()
      },
      getNextPageParam: (lastPage) =>
        lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
      enabled: debouncedSearch.length >= 2,
      initialPageParam: 1,
    })

  const searchResults = useMemo(
    () => data?.pages.flatMap((page) => page.results) || [],
    [data]
  )
  const totalResults = data?.pages[0]?.totalResults ?? 0

  const observerTarget = useInfiniteScroll(
    () => fetchNextPage(),
    hasNextPage ?? false,
    isFetchingNextPage
  )

  const { data: userShows } = useQuery<Array<UserShow>>({
    queryKey: ["/api/user/shows"],
  })

  const addShowMutation = useMutation({
    mutationFn: async ({
      showId,
      initialStatus,
    }: {
      showId: number
      initialStatus?: string
    }) => {
      return apiRequest("POST", "/api/user/shows", { showId, initialStatus })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/shows"] })
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] })
      queryClient.invalidateQueries({ queryKey: ["/api/shows/watching"] })
      queryClient.invalidateQueries({ queryKey: ["/api/shows/caught-up"] })
      queryClient.invalidateQueries({ queryKey: ["/api/shows/completed"] })
      queryClient.invalidateQueries({ queryKey: ["/api/shows/want-to-watch"] })
      const statusLabel =
        variables.initialStatus === "completed"
          ? "Completed"
          : variables.initialStatus === "caught_up"
            ? "Caught Up"
            : "Want to Watch"
      toast({ title: "Show Added", description: `Added as "${statusLabel}".` })
    },
    onError: () =>
      toast({
        title: "Error",
        description: "Failed to add show.",
        variant: "destructive",
      }),
  })

  const findUserShow = (showId: number): UserShow | undefined =>
    userShows?.find((us) => us.showId === showId)
  const handleAddShow = (showId: number, initialStatus?: string) =>
    addShowMutation.mutate({ showId, initialStatus })

  return (
    <div>
      {/* Header */}
      <div className="pb-6">
        <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.14em] font-semibold mb-2">
          {debouncedSearch && !isLoading
            ? `${totalResults.toLocaleString()} results`
            : "Search"}
        </div>
        <h1 className="font-serif font-normal text-[56px] leading-none tracking-[-0.025em] text-foreground">
          Search
        </h1>
      </div>

      {/* Search input */}
      <div className="sticky top-0 z-10 bg-background pb-4 pt-1">
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-[14px] border border-border bg-card max-w-2xl">
          <SearchIcon className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
          <input
            type="search"
            placeholder="Search for TV shows…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-[16px] text-foreground placeholder:text-muted-foreground outline-none"
            data-testid="input-search-shows"
          />
          {searchQuery && (
            <span className="font-mono text-[11px] text-muted-foreground/60">
              esc
            </span>
          )}
        </div>
      </div>

      {/* Loading skeletons */}
      {isLoading && debouncedSearch && (
        <div className="space-y-0 mt-2 max-w-[920px]">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-5 py-5 border-b border-border">
              <Skeleton className="w-[100px] h-[150px] rounded-lg shrink-0" />
              <div className="flex-1 space-y-3 py-2">
                <Skeleton className="h-7 w-2/3" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!isLoading && searchResults.length > 0 && (
        <div className="max-w-[920px]">
          {searchResults.map((show) => {
            const posterUrl = show.poster_path
              ? `https://image.tmdb.org/t/p/w300${show.poster_path}`
              : "/placeholder-poster.png"
            const year = show.first_air_date
              ? new Date(show.first_air_date).getFullYear()
              : null
            const userShow = findUserShow(show.id)
            const userStatus = userShow?.status as StatusKey | undefined
            const sp = userStatus ? statusPalette(userStatus, theme) : null

            return (
              <div
                key={show.id}
                className="flex gap-5 py-5 border-b border-border items-start"
                data-testid={`card-search-result-${show.id}`}
              >
                {/* Poster */}
                <div className="relative shrink-0">
                  <Link href={`/show/${show.id}`}>
                    <img
                      src={posterUrl}
                      alt={show.name}
                      className="w-[100px] h-[150px] object-cover rounded-lg bg-muted"
                      loading="lazy"
                    />
                  </Link>
                  {/* In-collection disc badge */}
                  {userShow && sp && (
                    <div
                      className="absolute -top-1.5 -right-1.5 w-[26px] h-[26px] rounded-full flex items-center justify-center border-2 border-background shadow-md"
                      style={{ background: sp.solid }}
                    >
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link href={`/show/${show.id}`}>
                    <h3
                      className="font-serif text-[28px] font-normal leading-[1.1] tracking-[-0.015em] text-foreground hover:opacity-80 transition-opacity"
                      data-testid={`text-result-title-${show.id}`}
                    >
                      {show.name}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-3 mt-1.5 font-mono text-[12px] text-muted-foreground font-medium">
                    {year && <span>{year}</span>}
                    {show.vote_average > 0 && (
                      <>
                        {year && (
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                          {show.vote_average.toFixed(1)}
                        </span>
                      </>
                    )}
                    {userShow && sp && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                        <span style={{ color: sp.fg, fontWeight: 600 }}>
                          In{" "}
                          {userShow.status === "want_to_watch"
                            ? "Want to Watch"
                            : userShow.status === "caught_up"
                              ? "Caught Up"
                              : userShow.status.charAt(0).toUpperCase() +
                                userShow.status.slice(1)}
                        </span>
                      </>
                    )}
                  </div>
                  {show.overview && (
                    <p className="text-[13.5px] text-muted-foreground mt-2.5 leading-relaxed line-clamp-2 max-w-2xl">
                      {show.overview}
                    </p>
                  )}
                  {!userShow && (
                    <div className="flex gap-2 mt-3.5">
                      <AddToCollectionButton
                        showId={show.id}
                        status={show.status}
                        onAdd={handleAddShow}
                        isPending={addShowMutation.isPending}
                        userShow={userShow}
                        size="sm"
                        dataTestId={`button-add-show-${show.id}`}
                      />
                      <Link href={`/show/${show.id}`}>
                        <button className="px-3.5 py-2 rounded-full text-foreground text-[12.5px] font-semibold border border-border bg-transparent hover:bg-muted transition-colors">
                          Details
                        </button>
                      </Link>
                    </div>
                  )}
                  {userShow && (
                    <div className="mt-3.5">
                      <button
                        className="px-3.5 py-2 rounded-full text-[12.5px] font-semibold border border-border text-muted-foreground bg-transparent opacity-60 cursor-default inline-flex items-center gap-1.5"
                        disabled
                        data-testid={`button-in-collection-${show.id}`}
                      >
                        <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                        In Collection
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {hasNextPage && (
            <div ref={observerTarget} className="py-8">
              {isFetchingNextPage && (
                <div className="space-y-0">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="flex gap-5 py-5 border-b border-border"
                    >
                      <Skeleton className="w-[100px] h-[150px] rounded-lg shrink-0" />
                      <div className="flex-1 space-y-3 py-2">
                        <Skeleton className="h-7 w-2/3" />
                        <Skeleton className="h-4 w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty states */}
      {!isLoading && debouncedSearch && searchResults.length === 0 && (
        <p className="text-muted-foreground font-sans mt-4">
          No shows found for "{debouncedSearch}". Try a different search term.
        </p>
      )}
      {!debouncedSearch && (
        <p className="text-muted-foreground font-sans mt-2">
          Enter a show name to search the database.
        </p>
      )}
    </div>
  )
}
