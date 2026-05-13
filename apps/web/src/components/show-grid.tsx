import { ShowWithProgress } from "@shared/schema"
import { ShowCard } from "./show-card"
import { Skeleton } from "./ui/skeleton"
import { Card } from "./ui/card"
import { useBreakpoint } from "@/hooks/use-breakpoint"

interface ShowGridProps {
  shows?: ShowWithProgress[]
  isLoading: boolean
  emptyMessage?: React.ReactNode
  noContainer?: boolean
}

export const gridColumns = {
  base: 1,
  sm: 1,
  md: 2,
  lg: 4,
  xl: 4,
  "2xl": 6,
}
export const showGridClass = `grid grid-cols-${gridColumns.base} md:grid-cols-${gridColumns.md} lg:grid-cols-${gridColumns.lg} 2xl:grid-cols-${gridColumns["2xl"]} gap-6`

export function ShowGrid({
  shows,
  isLoading,
  emptyMessage,
  noContainer,
}: ShowGridProps) {
  const breakpoint = useBreakpoint()
  const skeleton = (i: number) => (
    <>
      <Skeleton
        key={i}
        className="hidden md:block w-32 shrink-0 md:w-full md:aspect-[2/3] aspect-[2/3]"
      />
      <Card key={i} className="md:hidden">
        <div className="flex gap-4 p-4">
          <Skeleton className="w-24 h-36 rounded-md shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </Card>
    </>
  )

  if (isLoading) {
    if (noContainer) {
      return (
        <>{[...Array(gridColumns[breakpoint])].map((_, i) => skeleton(i))}</>
      )
    }

    return (
      <div className={showGridClass}>
        {[...Array(gridColumns[breakpoint])].map((_, i) => (
          <Skeleton
            key={i}
            className="w-32 shrink-0 md:w-full md:aspect-[2/3] aspect-[2/3]"
          />
        ))}
      </div>
    )
  }

  if (shows && shows.length > 0) {
    if (noContainer) {
      return (
        <>
          {shows.map((show) => (
            <ShowCard key={show.id} show={show} href={`/show/${show.id}`} />
          ))}
        </>
      )
    } else {
      return (
        <div className={showGridClass}>
          {shows.map((show) => (
            <ShowCard key={show.id} show={show} href={`/show/${show.id}`} />
          ))}
        </div>
      )
    }
  }

  return emptyMessage || null
}
