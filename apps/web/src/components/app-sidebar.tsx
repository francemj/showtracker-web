import { Home, Search, LogOut, User } from "lucide-react"
import { Link, useLocation } from "wouter"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import { useQuery } from "@tanstack/react-query"
import { statusPalette, type StatusKey } from "@/lib/status"
import { useTheme } from "@/components/theme-provider"

const primaryItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Search", url: "/search", icon: Search },
]

const libraryItems: { title: string; url: string; status: StatusKey }[] = [
  { title: "Want to Watch", url: "/want-to-watch", status: "want_to_watch" },
  { title: "Watching", url: "/watching", status: "watching" },
  { title: "Caught Up", url: "/caught-up", status: "caught_up" },
  { title: "Completed", url: "/completed", status: "completed" },
]

function StatusDot({ status }: { status: StatusKey }) {
  const { theme } = useTheme()
  const p = statusPalette(status, theme)
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

export function AppSidebar() {
  const [location] = useLocation()
  const { user, logout } = useAuth()
  const { closeSidebar } = useSidebar()
  const { theme } = useTheme()
  const watchingSolid = statusPalette("watching", theme).solid
  const completedSolid = statusPalette("completed", theme).solid

  const { data: stats } = useQuery<{
    totalShows: number
    watchingShows: number
    completedShows: number
    wantToWatchShows: number
    caughtUpShows: number
    episodesWatched: number
  }>({ queryKey: ["/api/stats"] })

  const libraryCounts: Record<StatusKey, number | undefined> = {
    watching: stats?.watchingShows,
    completed: stats?.completedShows,
    want_to_watch: stats?.wantToWatchShows,
    caught_up: stats?.caughtUpShows,
    stopped: undefined,
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-6 pb-4">
        <div className="flex items-center gap-2.5">
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: `linear-gradient(135deg, ${watchingSolid} 0%, ${completedSolid} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontStyle: "italic",
                color: "#fff",
                fontSize: 17,
                lineHeight: 1,
              }}
            >
              S
            </span>
          </div>
          <span className="font-serif italic text-[20px] text-sidebar-foreground leading-none tracking-[-0.01em]">
            Showtracker
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryItems.map((item) => {
                const isActive = location === item.url
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url} onClick={closeSidebar}>
                        <item.icon className="w-4 h-4" />
                        <span className="font-medium text-[13.5px]">
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/50 px-3 mb-1">
            Library
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {libraryItems.map((item) => {
                const isActive = location === item.url
                const count = libraryCounts[item.status]
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url} onClick={closeSidebar}>
                        <StatusDot status={item.status} />
                        <span className="font-medium text-[13px] flex-1">
                          {item.title}
                        </span>
                        {count !== undefined && (
                          <span className="font-mono text-[11px] text-sidebar-foreground/40 tabular-nums">
                            {count}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.picture} alt={user?.name} />
            <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase() || (
                <User className="w-4 h-4" />
              )}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate leading-tight">
              {user?.name}
            </p>
            <p className="text-xs text-sidebar-foreground/50 truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={logout}
          className="w-full bg-transparent text-sidebar-foreground hover:bg-sidebar-accent"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
