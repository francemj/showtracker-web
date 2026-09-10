import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react"
import {
  startAuthentication,
  startRegistration,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser"
import { apiRequest } from "./queryClient"

interface User {
  id: string
  email: string
  name: string | null
  picture?: string | null
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  loginWithPasskey: () => Promise<void>
  addPasskey: (name?: string) => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * The session lives in an httpOnly cookie, so there is deliberately nothing
 * here that reads or stores a token — the browser attaches it, and script
 * cannot get at it.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    try {
      const response = await apiRequest("GET", "/api/auth/me")
      const data = await response.json()
      setUser(data.user)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (email: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { email, password })
    setUser((await res.json()).user)
  }

  const register = async (email: string, password: string, name?: string) => {
    const res = await apiRequest("POST", "/api/auth/register", {
      email,
      password,
      ...(name ? { name } : {}),
    })
    setUser((await res.json()).user)
  }

  const loginWithPasskey = async () => {
    const optionsRes = await apiRequest(
      "POST",
      "/api/auth/passkey/login/options"
    )
    const { challengeId, options } = await optionsRes.json()
    const response = await startAuthentication({ optionsJSON: options })
    const verifyRes = await apiRequest(
      "POST",
      "/api/auth/passkey/login/verify",
      {
        challengeId,
        response,
      }
    )
    setUser((await verifyRes.json()).user)
  }

  const addPasskey = async (name?: string) => {
    const optionsRes = await apiRequest(
      "POST",
      "/api/auth/passkey/register/options"
    )
    const { challengeId, options } = await optionsRes.json()
    const response = await startRegistration({ optionsJSON: options })
    await apiRequest("POST", "/api/auth/passkey/register/verify", {
      challengeId,
      response,
      ...(name ? { name } : {}),
    })
  }

  const requestPasswordReset = async (email: string) => {
    await apiRequest("POST", "/api/auth/forgot-password", { email })
  }

  const resetPassword = async (token: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/reset-password", {
      token,
      password,
    })
    setUser((await res.json()).user)
  }

  const logout = async () => {
    await apiRequest("POST", "/api/auth/logout")
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        loginWithPasskey,
        addPasskey,
        requestPasswordReset,
        resetPassword,
        logout,
        refreshUser: checkAuth,
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

export { browserSupportsWebAuthn }
