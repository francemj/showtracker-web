import { ShowWithProgress } from "@shared/schema"
import { ShowCard } from "./show-card"
import { Skeleton } from "./ui/skeleton"

interface ShowGridProps {
  shows?: ShowWithProgress[]
  isLoading: boolean
  emptyMessage?: React.ReactNode
}

export function ShowGrid({ shows, isLoading, emptyMessage }: ShowGridProps) {
  const gridClass =
    "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[repeat(auto-fit,_minmax(200px,_1fr))] gap-6"
  return isLoading ? (
    <div className={gridClass}>
      {[...Array(8)].map((_, i) => (
        <Skeleton key={i} className="aspect-[2/3]" />
      ))}
    </div>
  ) : shows && shows.length > 0 ? (
    <div className={gridClass}>
      {shows.map((show) => (
        <ShowCard key={show.id} show={show} href={`/show/${show.id}`} />
      ))}
    </div>
  ) : (
    emptyMessage || null
  )
}
