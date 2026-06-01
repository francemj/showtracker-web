import { Switch, Route } from "wouter"
import { Auth0Provider } from "@auth0/auth0-react"
import { queryClient } from "./lib/queryClient"
import { QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider, useAuth } from "@/lib/auth"
import { AppSidebar } from "@/components/app-sidebar"
import { StatusValidationTrigger } from "@/components/status-validation-trigger"
import AuthPage from "@/pages/auth"
import Dashboard from "@/pages/dashboard"
import Search from "@/pages/search"
import WantToWatch from "@/pages/want-to-watch"
import Watching from "@/pages/watching"
import CaughtUp from "@/pages/caught-up"
import Completed from "@/pages/completed"
import ShowDetail from "@/pages/show-detail"
import NotFound from "@/pages/not-found"

const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN as string
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID as string

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
      <StatusValidationTrigger />
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto p-8">
          <Router />
        </main>
      </div>
    </SidebarProvider>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Auth0Provider
            domain={auth0Domain}
            clientId={auth0ClientId}
            authorizationParams={{
              redirect_uri:
                typeof window !== "undefined"
                  ? window.location.origin
                  : undefined,
              scope: "openid profile email",
            }}
            cacheLocation="localstorage"
            useRefreshTokens
          >
            <AuthProvider>
              <AuthenticatedApp />
            </AuthProvider>
          </Auth0Provider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
