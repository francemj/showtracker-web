import { useInfiniteQuery } from "@tanstack/react-query"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ShowWithProgress } from "@shared/schema"
import { Eye } from "lucide-react"
import { ShowGrid } from "@/components/show-grid"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { apiRequest } from "@/lib/queryClient"
import { Skeleton } from "@/components/ui/skeleton"
import { useMemo } from "react"

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
      getNextPageParam: (lastPage) => {
        return lastPage.page < lastPage.totalPages
          ? lastPage.page + 1
          : undefined
      },
      initialPageParam: 1,
    })

  const shows = useMemo(() => {
    return data?.pages.flatMap((page) => page.shows) || []
  }, [data])

  const observerTarget = useInfiniteScroll(
    () => fetchNextPage(),
    hasNextPage ?? false,
    isFetchingNextPage
  )

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
          <Eye className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-heading font-bold text-foreground">
            Currently Watching
          </h1>
          <p className="text-muted-foreground">
            Shows you're actively following
          </p>
        </div>
      </div>
      <ShowGrid
        shows={shows}
        isLoading={isLoading}
        emptyMessage={
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">No Shows</CardTitle>
              <CardDescription>
                You're not currently watching any shows. Add shows from the
                search page to start tracking!
              </CardDescription>
            </CardHeader>
          </Card>
        }
      />
      {hasNextPage && (
        <div ref={observerTarget} className="py-8">
          {isFetchingNextPage && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6 gap-6">
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
    </div>
  )
}
