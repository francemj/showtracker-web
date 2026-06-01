import { LibraryView } from "./library-view"
import { useLibraryShows } from "@/hooks/use-library-shows"

export default function Watching() {
  const lib = useLibraryShows("/api/shows/watching")

  return (
    <LibraryView
      activeTab="watching"
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
          No shows yet. Search for shows to add them to your library.
        </p>
      }
    />
  )
}
