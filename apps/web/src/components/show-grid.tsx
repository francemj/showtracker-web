import { ShowWithProgress } from "@shared/schema"
import { ShowCard } from "./show-card"
import { Skeleton } from "./ui/skeleton"
import { useBreakpoint } from "@/hooks/use-breakpoint"

interface ShowGridProps {
  shows?: ShowWithProgress[]
  isLoading: boolean
  emptyMessage?: React.ReactNode
  noContainer?: boolean
}

export const gridColumns = {
  base: 2,
  sm: 3,
  md: 4,
  lg: 5,
  xl: 6,
  "2xl": 6,
}
export const showGridClass = `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-8`

export function ShowGrid({
  shows,
  isLoading,
  emptyMessage,
  noContainer,
}: ShowGridProps) {
  const breakpoint = useBreakpoint()

  const skeleton = (i: number) => (
    <Skeleton key={i} className="w-full aspect-[2/3] rounded-lg" />
  )

  if (isLoading) {
    if (noContainer) {
      return (
        <>{[...Array(gridColumns[breakpoint])].map((_, i) => skeleton(i))}</>
      )
    }
    return (
      <div className={showGridClass}>
        {[...Array(gridColumns[breakpoint])].map((_, i) => skeleton(i))}
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
    }
    return (
      <div className={showGridClass}>
        {shows.map((show) => (
          <ShowCard key={show.id} show={show} href={`/show/${show.id}`} />
        ))}
      </div>
    )
  }

  return emptyMessage || null
}
