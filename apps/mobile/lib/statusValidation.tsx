import { useEffect } from "react"
import { AppState, type AppStateStatus } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { apiRequest } from "@showtracker/api-client"
import { queryClient } from "./queryClient"
import { useAuth } from "./auth"

const STORAGE_KEY_INITIAL = "statusValidationInitial"
const STORAGE_KEY_FOREGROUND = "statusValidationForeground"
const STORAGE_KEY_COMPLETED_RECHECK = "statusValidationCompletedRecheck"
const THROTTLE_INITIAL_MS = 30 * 60 * 1000 // 30 minutes
const THROTTLE_FOREGROUND_MS = 10 * 60 * 1000 // 10 minutes
const THROTTLE_COMPLETED_RECHECK_MS = 24 * 60 * 60 * 1000 // 24 hours
export const STATUS_INVALIDATE_DELAY_MS = 60 * 1000 // 1 minute - give backend time to finish

// Query keys for these endpoints embed extra params (page/limit on the
// dashboard, a debounced search term in the library screens), so we match
// by prefix instead of an exact key.
const STATUS_QUERY_PREFIXES = [
  "/api/stats",
  "/api/shows/watching",
  "/api/shows/want-to-watch",
  "/api/shows/caught-up",
  "/api/shows/completed",
]

export function invalidateStatusRelatedQueries() {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey[0]
      return (
        typeof key === "string" &&
        STATUS_QUERY_PREFIXES.some((prefix) => key.startsWith(prefix))
      )
    },
  })
}

async function tryRun(
  scope: "all" | "caught_up_only" | "completed_recheck",
  storageKey: string,
  throttleMs: number
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(storageKey)
    const last = raw ? parseInt(raw, 10) : 0
    if (last && Date.now() - last < throttleMs) return

    const res = await apiRequest("POST", "/api/user/shows/validate-status", {
      scope,
    })
    if (res.ok) {
      await AsyncStorage.setItem(storageKey, String(Date.now()))
      setTimeout(invalidateStatusRelatedQueries, STATUS_INVALIDATE_DELAY_MS)
    }
  } catch {
    // Best-effort background refresh; ignore failures
  }
}

// Mirrors apps/web/src/components/status-validation-trigger.tsx, adapted for
// mobile: sessionStorage -> AsyncStorage, and wouter route changes -> AppState
// foreground transitions (there's no equivalent of a SPA route change here).
export function StatusValidationTrigger() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    // App session start: refresh all non-completed shows (throttled 30 min),
    // plus a much rarer sweep of completed shows in case one was renewed.
    tryRun("all", STORAGE_KEY_INITIAL, THROTTLE_INITIAL_MS)
    tryRun(
      "completed_recheck",
      STORAGE_KEY_COMPLETED_RECHECK,
      THROTTLE_COMPLETED_RECHECK_MS
    )

    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState !== "active") return
        // Returning to the foreground: refresh all non-completed shows
        // (throttled 10 min, separate from the session-start check)
        tryRun("all", STORAGE_KEY_FOREGROUND, THROTTLE_FOREGROUND_MS)
      }
    )

    return () => subscription.remove()
  }, [user])

  return null
}
