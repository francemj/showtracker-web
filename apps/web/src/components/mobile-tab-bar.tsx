import { Home, Search, Library, User } from "lucide-react"
import { Link, useLocation } from "wouter"
import { libraryItems } from "@/components/app-sidebar"
import { statusPalette } from "@/lib/status"
import { useTheme } from "@/components/theme-provider"

const libraryUrls = libraryItems.map((item) => item.url)

const tabs = [
  { title: "Home", url: "/", icon: Home, matches: (l: string) => l === "/" },
  {
    title: "Search",
    url: "/search",
    icon: Search,
    matches: (l: string) => l === "/search",
  },
  {
    title: "Library",
    url: "/watching",
    icon: Library,
    matches: (l: string) => libraryUrls.includes(l) || l.startsWith("/show/"),
  },
  {
    title: "Profile",
    url: "/profile",
    icon: User,
    matches: (l: string) => l === "/profile",
  },
]

export function MobileTabBar() {
  const [location] = useLocation()
  const { theme } = useTheme()
  const activeColor = statusPalette("watching", theme).solid

  return (
    <nav
      aria-label="Main"
      className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      data-testid="nav-mobile-tabs"
    >
      <ul className="flex items-stretch">
        {tabs.map((tab) => {
          const isActive = tab.matches(location)
          return (
            <li key={tab.title} className="flex-1">
              <Link
                href={tab.url}
                aria-current={isActive ? "page" : undefined}
                className="flex flex-col items-center justify-center gap-1 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                style={{
                  color: isActive
                    ? activeColor
                    : "hsl(var(--muted-foreground))",
                }}
                data-testid={`tab-${tab.title.toLowerCase()}`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-[11px] font-medium leading-none">
                  {tab.title}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
