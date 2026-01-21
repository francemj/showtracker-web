import { ShowWithProgress } from "@shared/schema"
import { ShowCard } from "./show-card"
import { Skeleton } from "./ui/skeleton"

interface ShowGridProps {
  shows?: ShowWithProgress[]
  isLoading: boolean
  emptyMessage?: React.ReactNode
  noContainer?: boolean
}

export const showGridClass =
  "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6"

export function ShowGrid({
  shows,
  isLoading,
  emptyMessage,
  noContainer,
}: ShowGridProps) {
  if (isLoading)
    return (
      <div className={showGridClass}>
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="aspect-[2/3]" />
        ))}
      </div>
    )

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
