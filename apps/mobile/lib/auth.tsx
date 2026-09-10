import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react"
import * as SecureStore from "expo-secure-store"
import { Passkey } from "react-native-passkey"
import { setApiTokenGetter } from "@showtracker/api-client"
import { API_URL } from "./config"

const TOKEN_KEY = "showtracker.session"
// Whether a passkey was enrolled from this device, so sign-in can lead with
// Face ID instead of offering it to people who have never set one up.
const PASSKEY_KEY = "showtracker.passkeyEnrolled"

export type AuthUser = {
  id: string
  email: string
  name: string | null
  picture: string | null
}

type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  passkeysSupported: boolean
  hasLocalPasskey: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name?: string) => Promise<void>
  signInWithPasskey: () => Promise<void>
  addPasskey: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function request<T>(
  path: string,
  {
    method = "POST",
    body,
    token,
  }: {
    method?: string
    body?: unknown
    token?: string | null
  } = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      // There is no cookie jar here, so ask for the raw session token and keep
      // it in SecureStore. Web gets an httpOnly cookie instead.
      "X-Auth-Mode": "token",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.message ?? "Something went wrong. Please try again.")
  }
  return data as T
}

type SessionResponse = { user: AuthUser; token?: string }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasLocalPasskey, setHasLocalPasskey] = useState(false)

  const passkeysSupported = Passkey.isSupported()

  const acceptSession = useCallback(async (data: SessionResponse) => {
    if (data.token) await SecureStore.setItemAsync(TOKEN_KEY, data.token)
    setUser(data.user)
  }, [])

  const refreshUser = useCallback(async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY)
    if (!token) {
      setUser(null)
      return
    }
    try {
      const data = await request<{ user: AuthUser }>("/api/auth/me", {
        method: "GET",
        token,
      })
      setUser(data.user)
    } catch {
      // The session is gone or was revoked elsewhere; don't keep a token that
      // no longer opens anything.
      await SecureStore.deleteItemAsync(TOKEN_KEY)
      setUser(null)
    }
  }, [])

  useEffect(() => {
    setApiTokenGetter(() => SecureStore.getItemAsync(TOKEN_KEY))

    let cancelled = false
    void (async () => {
      const enrolled = await SecureStore.getItemAsync(PASSKEY_KEY)
      if (cancelled) return
      setHasLocalPasskey(enrolled === "1")
      await refreshUser()
      if (!cancelled) setIsLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [refreshUser])

  const signIn = async (email: string, password: string) => {
    acceptSession(
      await request<SessionResponse>("/api/auth/login", {
        body: { email, password },
      })
    )
  }

  const signUp = async (email: string, password: string, name?: string) => {
    acceptSession(
      await request<SessionResponse>("/api/auth/register", {
        body: { email, password, ...(name ? { name } : {}) },
      })
    )
  }

  const signInWithPasskey = async () => {
    const { challengeId, options } = await request<{
      challengeId: string
      options: Parameters<typeof Passkey.get>[0]
    }>("/api/auth/passkey/login/options")

    const response = await Passkey.get(options)

    acceptSession(
      await request<SessionResponse>("/api/auth/passkey/login/verify", {
        body: { challengeId, response },
      })
    )
  }

  const addPasskey = async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY)
    const { challengeId, options } = await request<{
      challengeId: string
      options: Parameters<typeof Passkey.create>[0]
    }>("/api/auth/passkey/register/options", { token })

    const response = await Passkey.create(options)

    await request("/api/auth/passkey/register/verify", {
      body: { challengeId, response, name: "This device" },
      token,
    })

    await SecureStore.setItemAsync(PASSKEY_KEY, "1")
    setHasLocalPasskey(true)
  }

  const requestPasswordReset = async (email: string) => {
    await request("/api/auth/forgot-password", { body: { email } })
  }

  const logout = async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY)
    try {
      await request("/api/auth/logout", { token })
    } catch {
      // Revoking server-side is best effort; dropping the local token is not.
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        passkeysSupported,
        hasLocalPasskey,
        signIn,
        signUp,
        signInWithPasskey,
        addPasskey,
        requestPasswordReset,
        logout,
        refreshUser,
      }}
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
