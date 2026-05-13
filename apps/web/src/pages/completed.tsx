import { useInfiniteQuery } from "@tanstack/react-query"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ShowWithProgress } from "@shared/schema"
import { CheckCircle2 } from "lucide-react"
import { gridColumns, ShowGrid, showGridClass } from "@/components/show-grid"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { apiRequest } from "@/lib/queryClient"
import { Skeleton } from "@/components/ui/skeleton"
import { useMemo } from "react"
import { useBreakpoint } from "@/hooks/use-breakpoint"

interface PaginatedResponse {
  shows: ShowWithProgress[]
  total: number
  page: number
  totalPages: number
}

export default function Completed() {
  const breakpoint = useBreakpoint()
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery<PaginatedResponse>({
      queryKey: ["/api/shows/completed"],
      queryFn: async ({ pageParam = 1 }) => {
        const res = await apiRequest(
          "GET",
          `/api/shows/completed?page=${pageParam}&limit=20`
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
        <div className="flex items-center justify-center w-12 h-12 bg-accent/10 rounded-lg">
          <CheckCircle2 className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h1 className="text-4xl font-heading font-bold text-foreground">
            Completed Shows
          </h1>
          <p className="text-muted-foreground">
            Shows you've finished watching
          </p>
        </div>
      </div>

      <div className={showGridClass}>
        <ShowGrid
          shows={shows}
          isLoading={isLoading}
          noContainer
          emptyMessage={
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">No Shows</CardTitle>
                <CardDescription>
                  You haven't completed any shows yet. Keep watching to add
                  shows to this list!
                </CardDescription>
              </CardHeader>
            </Card>
          }
        />
        {hasNextPage && <div ref={observerTarget} className="py-8"></div>}

        {isFetchingNextPage &&
          [...Array(gridColumns[breakpoint])].map((_, i) => (
            <Skeleton
              key={i}
              className="w-32 shrink-0 md:w-full md:aspect-[2/3] aspect-[2/3]"
            />
          ))}
      </div>
    </div>
  )
}
