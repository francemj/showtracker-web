import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react"
import { useAuth0 } from "@auth0/auth0-react"
import { apiRequest, setApiTokenGetter } from "./queryClient"

interface User {
  id: string
  email: string
  name: string
  picture?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (options?: { signUp?: boolean }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const {
    loginWithPopup,
    getAccessTokenSilently,
    logout: auth0Logout,
  } = useAuth0()

  useEffect(() => {
    setApiTokenGetter(async () => {
      try {
        return await getAccessTokenSilently()
      } catch {
        return null
      }
    })
  }, [getAccessTokenSilently])

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await apiRequest("GET", "/api/auth/me")
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error("Auth check failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (options?: { signUp?: boolean }) => {
    try {
      await loginWithPopup({
        authorizationParams: options?.signUp ? { screen_hint: "signup" } : {},
      })
      const accessToken = await getAccessTokenSilently()
      const response = await apiRequest("POST", "/api/auth/callback", {
        access_token: accessToken,
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message || "Login failed")
      }
      const data = await response.json()
      setUser(data.user)
    } catch (error: any) {
      if (error?.error === "popup_closed_by_user") {
        return
      }
      throw error
    }
  }

  const logout = async () => {
    await apiRequest("POST", "/api/auth/logout")
    setUser(null)
    auth0Logout({ logoutParams: { returnTo: window.location.origin } })
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
