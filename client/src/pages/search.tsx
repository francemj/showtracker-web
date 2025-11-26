import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search as SearchIcon,
  Plus,
  Check,
  Star,
  Calendar,
  ChevronDown,
} from "lucide-react"
import { TMDBShow } from "@shared/schema"
import { useToast } from "@/hooks/use-toast"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { useDebounce } from "@/hooks/use-debounce"

export default function Search() {
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 500)
  const { toast } = useToast()

  const { data: searchResults, isLoading } = useQuery<TMDBShow[]>({
    queryKey: ["/api/search/shows", debouncedSearch],
    enabled: debouncedSearch.length >= 2,
  })

  const { data: userShows } = useQuery<
    Array<{ showId: number; status: string }>
  >({
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
      queryClient.invalidateQueries({
        queryKey: ["/api/shows/caught-up-upcoming"],
      })
      queryClient.invalidateQueries({ queryKey: ["/api/shows/completed"] })
      queryClient.invalidateQueries({ queryKey: ["/api/shows/want-to-watch"] })
      queryClient.invalidateQueries({
        queryKey: ["/api/shows/continue-watching"],
      })
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

  const isShowInCollection = (showId: number): boolean => {
    return userShows?.some((us) => us.showId === showId) || false
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

      <div className="relative max-w-2xl">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search for TV shows..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12 text-base"
          data-testid="input-search-shows"
        />
      </div>

      {isLoading && debouncedSearch && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <div className="flex gap-4 p-4">
                <Skeleton className="w-24 h-36 rounded-md flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && searchResults && searchResults.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {searchResults.map((show) => {
            const posterUrl = show.poster_path
              ? `https://image.tmdb.org/t/p/w300${show.poster_path}`
              : "/placeholder-poster.png"
            const year = show.first_air_date
              ? new Date(show.first_air_date).getFullYear()
              : null
            const inCollection = isShowInCollection(show.id)

            return (
              <Card
                key={show.id}
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
                  {inCollection ? (
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          disabled={addShowMutation.isPending}
                          className="w-full"
                          data-testid={`button-add-show-${show.id}`}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add to Collection
                          <ChevronDown className="w-4 h-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => handleAddShow(show.id)}
                          data-testid={`menu-item-want-to-watch-${show.id}`}
                        >
                          Want to Watch
                        </DropdownMenuItem>
                        {(show.status === "Ended" ||
                          show.status === "Canceled") && (
                          <DropdownMenuItem
                            onClick={() => handleAddShow(show.id, "completed")}
                            data-testid={`menu-item-mark-completed-${show.id}`}
                          >
                            Mark as Completed
                          </DropdownMenuItem>
                        )}
                        {show.status === "Returning Series" && (
                          <DropdownMenuItem
                            onClick={() => handleAddShow(show.id, "caught_up")}
                            data-testid={`menu-item-mark-caught-up-${show.id}`}
                          >
                            Mark as Caught Up
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
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
