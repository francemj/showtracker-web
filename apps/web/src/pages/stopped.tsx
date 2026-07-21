import { LibraryView } from "./library-view"
import { useLibraryShows } from "@/hooks/use-library-shows"

export default function Stopped() {
  const lib = useLibraryShows("/api/shows/stopped")

  return (
    <LibraryView
      activeTab="stopped"
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
          No stopped shows. Shows you stop tracking will show up here.
        </p>
      }
    />
  )
}
