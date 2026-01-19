import { Switch, Route } from "wouter"
import { queryClient } from "./lib/queryClient"
import { QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { AuthProvider, useAuth } from "@/lib/auth"
import { AppSidebar } from "@/components/app-sidebar"
import AuthPage from "@/pages/auth"
import Dashboard from "@/pages/dashboard"
import Search from "@/pages/search"
import WantToWatch from "@/pages/want-to-watch"
import Watching from "@/pages/watching"
import CaughtUp from "@/pages/caught-up"
import Completed from "@/pages/completed"
import ShowDetail from "@/pages/show-detail"
import NotFound from "@/pages/not-found"

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/search" component={Search} />
      <Route path="/want-to-watch" component={WantToWatch} />
      <Route path="/watching" component={Watching} />
      <Route path="/caught-up" component={CaughtUp} />
      <Route path="/completed" component={Completed} />
      <Route path="/show/:id" component={ShowDetail} />
      <Route component={NotFound} />
    </Switch>
  )
}

function AuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AuthPage />
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto p-8">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AuthProvider>
            <AuthenticatedApp />
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
