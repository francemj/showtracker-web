import { useState } from "react"
import { ShowWithProgress } from "@shared/schema"
import { ShowGrid } from "@/components/show-grid"
import { Skeleton } from "@/components/ui/skeleton"
import { statusPalette, type StatusKey } from "@/lib/status"
import { useTheme } from "@/components/theme-provider"
import { Link } from "wouter"
import { LayoutGrid, List, Star } from "lucide-react"

interface TabConfig {
  id: StatusKey
  label: string
  href: string
}

const TABS: TabConfig[] = [
  { id: "watching", label: "Watching", href: "/watching" },
  { id: "want_to_watch", label: "Want to Watch", href: "/want-to-watch" },
  { id: "caught_up", label: "Caught Up", href: "/caught-up" },
  { id: "completed", label: "Completed", href: "/completed" },
  { id: "stopped", label: "Stopped", href: "/stopped" },
]

interface LibraryViewProps {
  activeTab: StatusKey
  shows: ShowWithProgress[]
  isLoading: boolean
  total: number
  hasNextPage: boolean
  isFetchingNextPage: boolean
  observerTarget: React.RefObject<HTMLDivElement>
  filterValue: string
  onFilterChange: (value: string) => void
  emptyMessage?: React.ReactNode
}

function StatusDot({
  status,
  mode,
}: {
  status: StatusKey
  mode: "light" | "dark"
}) {
  const p = statusPalette(status, mode)
  return (
    <span
      style={{
        background: p.solid,
        width: 7,
        height: 7,
        borderRadius: "50%",
        flexShrink: 0,
        display: "inline-block",
      }}
    />
  )
}

interface ShowListViewProps {
  shows?: ShowWithProgress[]
  isLoading: boolean
  emptyMessage?: React.ReactNode
  mode: "light" | "dark"
}

function ShowListView({
  shows,
  isLoading,
  emptyMessage,
  mode,
}: ShowListViewProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col divide-y divide-border">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3">
            <Skeleton className="w-10 shrink-0 aspect-[2/3] rounded-md" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!shows || shows.length === 0) {
    return emptyMessage || null
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {shows.map((show) => {
        const posterUrl = show.posterPath
          ? `https://image.tmdb.org/t/p/w185${show.posterPath}`
          : "/placeholder-poster.svg"
        const year = show.firstAirDate
          ? new Date(show.firstAirDate).getFullYear()
          : null
        const isWatching = show.userShow?.status === "watching"
        const meta = [
          year,
          isWatching &&
          show.watchedEpisodes !== undefined &&
          show.totalEpisodes !== undefined
            ? `${show.watchedEpisodes}/${show.totalEpisodes} ep`
            : show.numberOfSeasons
              ? `${show.numberOfSeasons}s`
              : null,
        ]
          .filter(Boolean)
          .join(" · ")

        const progress = show.progress || 0

        return (
          <Link key={show.id} href={`/show/${show.id}`} className="block">
            <div className="flex items-center gap-4 py-3 px-2 -mx-2 rounded-lg hover:bg-muted/40 transition-colors max-w-[920px]">
              <img
                src={posterUrl}
                alt={show.name}
                className="w-10 shrink-0 aspect-[2/3] rounded-md object-cover bg-muted"
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-foreground truncate">
                  {show.name}
                </p>
                <p className="text-[12px] font-mono text-muted-foreground mt-0.5">
                  {meta}
                </p>
                {isWatching && progress > 0 && (
                  <div className="relative h-[3px] w-full max-w-[220px] rounded-full overflow-hidden bg-muted mt-1.5">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${progress}%`,
                        background: statusPalette("watching", mode).solid,
                      }}
                    />
                  </div>
                )}
              </div>
              {show.voteAverage && parseFloat(show.voteAverage) > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground shrink-0">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  {parseFloat(show.voteAverage).toFixed(1)}
                </span>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}

export function LibraryView({
  activeTab,
  shows,
  isLoading,
  total,
  hasNextPage,
  isFetchingNextPage,
  observerTarget,
  filterValue,
  onFilterChange,
  emptyMessage,
}: LibraryViewProps) {
  const { theme } = useTheme()
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const resolvedEmptyMessage = filterValue.trim() ? (
    <div className="col-span-full py-8">
      <p className="text-muted-foreground">No shows match “{filterValue}”.</p>
      <button
        onClick={() => onFilterChange("")}
        className="mt-3 px-3.5 py-2 rounded-full text-[12.5px] font-semibold border border-border text-foreground hover:bg-muted transition-colors"
        data-testid="button-clear-filter"
      >
        Clear filter
      </button>
    </div>
  ) : (
    emptyMessage
  )

  return (
    <div>
      {/* Header — stacks on narrow screens so the filter never lands on the title */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between pb-6">
        <div>
          <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.14em] font-semibold mb-2">
            {isLoading ? (
              <Skeleton className="h-3 w-16" />
            ) : (
              `${total} ${total === 1 ? "show" : "shows"}`
            )}
          </div>
          <h1 className="font-serif font-normal text-[40px] sm:text-[56px] leading-none tracking-[-0.025em] text-foreground">
            Library
          </h1>
        </div>
        <div className="flex items-center gap-2.5 md:pb-1">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card text-[13px] text-muted-foreground flex-1 md:flex-none md:min-w-[200px]">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={filterValue}
              onChange={(e) => onFilterChange(e.target.value)}
              placeholder="Filter library…"
              className="flex-1 bg-transparent outline-none text-[13px] text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex bg-card border border-border rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md ${viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md ${viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Underline tabs — scroll sideways rather than wrapping or clipping,
          which previously put Stopped entirely off-screen on a phone */}
      <div className="flex gap-6 border-b border-border mb-7 overflow-x-auto scrollbar-none -mx-8 px-8 md:mx-0 md:px-0">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab
          const sp = statusPalette(tab.id, theme)
          return (
            <Link key={tab.id} href={tab.href} className="shrink-0">
              <div
                className="flex items-center gap-2 pb-3.5 -mb-px cursor-pointer whitespace-nowrap"
                style={{
                  borderBottom: isActive
                    ? `2px solid ${sp.solid}`
                    : "2px solid transparent",
                }}
              >
                <StatusDot status={tab.id} mode={theme} />
                <span
                  className="text-[14px] font-medium"
                  style={{
                    color: isActive
                      ? "hsl(var(--foreground))"
                      : "hsl(var(--muted-foreground))",
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  {tab.label}
                </span>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Grid or List. A filter that matches nothing is not an empty library —
          say which one it is, and offer the way out. */}
      {viewMode === "grid" ? (
        <ShowGrid
          shows={shows}
          isLoading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
          emptyMessage={resolvedEmptyMessage}
          hideStatusBadge
        />
      ) : (
        <ShowListView
          shows={shows}
          isLoading={isLoading}
          emptyMessage={resolvedEmptyMessage}
          mode={theme}
        />
      )}

      {hasNextPage && <div ref={observerTarget} className="py-4" />}
    </div>
  )
}
