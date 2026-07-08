import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react"
import Auth0 from "react-native-auth0"
import { setApiTokenGetter } from "@showtracker/api-client"
import { AUTH0_DOMAIN, AUTH0_CLIENT_ID, API_URL } from "./config"
import { apiRequest } from "@showtracker/api-client"

const auth0 = new Auth0({ domain: AUTH0_DOMAIN, clientId: AUTH0_CLIENT_ID })

type AuthUser = {
  id: string
  email: string
  name: string | null
  picture: string | null
}

type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const syncUser = useCallback(async () => {
    try {
      const credentials = await auth0.credentialsManager.getCredentials()
      if (!credentials?.accessToken) {
        console.warn("[auth] syncUser: no access token in credentials manager")
        setUser(null)
        return
      }
      const res = await fetch(`${API_URL}/api/auth/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: credentials.accessToken }),
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user ?? data)
      } else {
        const body = await res.text().catch(() => "(unreadable)")
        console.warn(`[auth] syncUser: API returned ${res.status}`, body)
        setUser(null)
      }
    } catch (e) {
      console.error("[auth] syncUser failed:", e)
      setUser(null)
    }
  }, [])

  useEffect(() => {
    setApiTokenGetter(async () => {
      try {
        const credentials = await auth0.credentialsManager.getCredentials()
        return credentials?.accessToken ?? null
      } catch {
        return null
      }
    })

    auth0.credentialsManager
      .hasValidCredentials()
      .then(async (hasCredentials) => {
        if (hasCredentials) {
          await syncUser()
        }
      })
      .finally(() => setIsLoading(false))
  }, [syncUser])

  const login = async () => {
    setIsLoading(true)
    try {
      const credentials = await auth0.webAuth.authorize({
        scope: "openid profile email",
        audience: `https://${AUTH0_DOMAIN}/userinfo`,
      })
      await auth0.credentialsManager.saveCredentials(credentials)
      await syncUser()
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      await auth0.webAuth.clearSession()
      await auth0.credentialsManager.clearCredentials()
      setUser(null)
      await apiRequest("POST", "/api/auth/logout")
    } catch {
      // clearSession can fail on simulators; still clear locally
      await auth0.credentialsManager.clearCredentials()
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, refreshUser: syncUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
