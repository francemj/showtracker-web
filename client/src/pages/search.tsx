import { useState, useMemo } from "react"
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { AddToCollectionButton } from "@/components/add-to-collection-button"
import { Search as SearchIcon, Check, Star, Calendar } from "lucide-react"
import { TMDBShow, UserShow } from "@shared/schema"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { useDebounce } from "@/hooks/use-debounce"
import { Link } from "wouter"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"

interface SearchResponse {
  results: TMDBShow[]
  page: number
  totalPages: number
  totalResults: number
}

export default function Search() {
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 500)
  const { toast } = useToast()

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
      getNextPageParam: (lastPage) => {
        return lastPage.page < lastPage.totalPages
          ? lastPage.page + 1
          : undefined
      },
      enabled: debouncedSearch.length >= 2,
      initialPageParam: 1,
    })

  const searchResults = useMemo(() => {
    return data?.pages.flatMap((page) => page.results) || []
  }, [data])

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
      toast({
        title: "Show Added",
        description: `The show has been added to your collection as "${statusLabel}".`,
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add show. Please try again.",
        variant: "destructive",
      })
    },
  })

  const findUserShow = (showId: number): UserShow | undefined => {
    return userShows?.find((us) => us.showId === showId)
  }

  const handleAddShow = (showId: number, initialStatus?: string) => {
    addShowMutation.mutate({ showId, initialStatus })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-heading font-bold text-foreground mb-2">
          Search TV Shows
        </h1>
        <p className="text-muted-foreground">
          Find and add shows to your collection
        </p>
      </div>

      <div className="relative max-w-lg">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search for TV shows..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12 w-full text-base"
          data-testid="input-search-shows"
        />
      </div>

      {isLoading && debouncedSearch && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <Skeleton
              key={i}
              className="w-32 shrink-0 md:w-full md:aspect-[2/3] aspect-[2/3]"
            />
          ))}
        </div>
      )}

      {!isLoading && searchResults && searchResults.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {searchResults.map((show) => {
              const posterUrl = show.poster_path
                ? `https://image.tmdb.org/t/p/w300${show.poster_path}`
                : "/placeholder-poster.png"
              const year = show.first_air_date
                ? new Date(show.first_air_date).getFullYear()
                : null
              const userShow = findUserShow(show.id)

              return (
                <Link href={`/show/${show.id}`} key={show.id}>
                  <Card
                    className="hover-elevate transition-all overflow-hidden"
                    data-testid={`card-search-result-${show.id}`}
                  >
                    <div className="relative aspect-[2/3] bg-muted">
                      <img
                        src={posterUrl}
                        alt={show.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <h3
                          className="font-heading font-semibold text-base line-clamp-1 mb-2"
                          data-testid={`text-result-title-${show.id}`}
                        >
                          {show.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {year && (
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="w-3 h-3 mr-1" />
                              {year}
                            </Badge>
                          )}
                          {show.vote_average > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                              {show.vote_average.toFixed(1)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {show.overview}
                        </p>
                      </div>
                      {userShow ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full"
                          disabled
                          data-testid={`button-in-collection-${show.id}`}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          In Collection
                        </Button>
                      ) : (
                        <AddToCollectionButton
                          showId={show.id}
                          status={show.status}
                          onAdd={handleAddShow}
                          isPending={addShowMutation.isPending}
                          userShow={userShow}
                          size="sm"
                          className="w-full"
                          dataTestId={`button-add-show-${show.id}`}
                        />
                      )}
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
          {hasNextPage && (
            <div ref={observerTarget} className="py-8">
              {isFetchingNextPage && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton
                      key={i}
                      className="w-32 shrink-0 md:w-full md:aspect-[2/3] aspect-[2/3]"
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!isLoading && debouncedSearch && searchResults?.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">No Results</CardTitle>
            <CardDescription>
              No shows found for "{debouncedSearch}". Try a different search
              term.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {!debouncedSearch && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Start Searching</CardTitle>
            <CardDescription>
              Enter a TV show name to search the database and add shows to your
              collection.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
