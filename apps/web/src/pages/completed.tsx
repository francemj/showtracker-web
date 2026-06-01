import { LibraryView } from "./library-view"
import { useLibraryShows } from "@/hooks/use-library-shows"

export default function Completed() {
  const lib = useLibraryShows("/api/shows/completed")

  return (
    <LibraryView
      activeTab="completed"
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
          No completed shows yet. Keep watching!
        </p>
      }
    />
  )
}
