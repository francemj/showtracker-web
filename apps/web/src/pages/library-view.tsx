import { ShowWithProgress } from "@shared/schema"
import { ShowGrid } from "@/components/show-grid"
import { Skeleton } from "@/components/ui/skeleton"
import { statusPalette, type StatusKey } from "@/lib/status"
import { useTheme } from "@/components/theme-provider"
import { Link } from "wouter"
import { LayoutGrid, List } from "lucide-react"

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
]

interface LibraryViewProps {
  activeTab: StatusKey
  shows: ShowWithProgress[]
  isLoading: boolean
  total: number
  hasNextPage: boolean
  isFetchingNextPage: boolean
  observerTarget: React.RefObject<HTMLDivElement>
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

export function LibraryView({
  activeTab,
  shows,
  isLoading,
  total,
  hasNextPage,
  isFetchingNextPage,
  observerTarget,
  emptyMessage,
}: LibraryViewProps) {
  const { theme } = useTheme()

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between pb-6">
        <div>
          <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.14em] font-semibold mb-2">
            {isLoading ? <Skeleton className="h-3 w-16" /> : `${total} shows`}
          </div>
          <h1 className="font-serif font-normal text-[56px] leading-none tracking-[-0.025em] text-foreground">
            Library
          </h1>
        </div>
        <div className="flex items-center gap-2.5 pb-1">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card text-[13px] text-muted-foreground min-w-[200px]">
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
            <span className="flex-1">Filter library…</span>
            <span className="font-mono text-[10.5px] text-muted-foreground/60">
              ⌘K
            </span>
          </div>
          <div className="flex bg-card border border-border rounded-lg p-0.5">
            <button className="p-1.5 rounded-md bg-muted text-foreground">
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 rounded-md text-muted-foreground">
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Underline tabs */}
      <div className="flex gap-6 border-b border-border mb-7">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab
          const sp = statusPalette(tab.id, theme)
          return (
            <Link key={tab.id} href={tab.href}>
              <div
                className="flex items-center gap-2 pb-3.5 -mb-px cursor-pointer"
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

      {/* Grid */}
      <ShowGrid
        shows={shows}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
      />

      {hasNextPage && (
        <div ref={observerTarget} className="py-8">
          {isFetchingNextPage && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-8 mt-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="w-full aspect-[2/3] rounded-lg" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
