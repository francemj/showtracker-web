import { LibraryView } from "./library-view"
import { useLibraryShows } from "@/hooks/use-library-shows"

export default function WantToWatch() {
  const lib = useLibraryShows("/api/shows/want-to-watch")

  return (
    <LibraryView
      activeTab="want_to_watch"
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
          No shows saved yet. Add shows from Search.
        </p>
      }
    />
  )
}
