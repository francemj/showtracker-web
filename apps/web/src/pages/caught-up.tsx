import { LibraryView } from "./library-view"
import { useLibraryShows } from "@/hooks/use-library-shows"

export default function CaughtUp() {
  const lib = useLibraryShows("/api/shows/caught-up")

  return (
    <LibraryView
      activeTab="caught_up"
      shows={lib.shows}
      isLoading={lib.isLoading}
      total={lib.total}
      hasNextPage={lib.hasNextPage}
      isFetchingNextPage={lib.isFetchingNextPage}
      observerTarget={lib.observerTarget}
      filterValue={lib.search}
      onFilterChange={lib.setSearch}
      emptyMessage={
        <p className="text-muted-foreground col-span-full py-8">
          No shows yet. Keep watching to catch up!
        </p>
      }
    />
  )
}
