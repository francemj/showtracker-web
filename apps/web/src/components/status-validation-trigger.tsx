import { useEffect } from "react"
import { apiRequest, queryClient } from "@/lib/queryClient"

const STORAGE_KEY_INITIAL = "statusValidationInitial"
const STORAGE_KEY_COMPLETED_RECHECK = "statusValidationCompletedRecheck"
const THROTTLE_INITIAL_MS = 30 * 60 * 1000 // 30 minutes
const THROTTLE_COMPLETED_RECHECK_MS = 24 * 60 * 60 * 1000 // 24 hours
// Only used for the bulk sweeps, which are genuinely asynchronous. Anything
// targeting a single show now finishes inline and invalidates on its result.
export const STATUS_INVALIDATE_DELAY_MS = 60 * 1000

export function invalidateStatusRelatedQueries() {
  queryClient.invalidateQueries({ queryKey: ["/api/stats"] })
  queryClient.invalidateQueries({ queryKey: ["/api/shows/watching"] })
  queryClient.invalidateQueries({ queryKey: ["/api/shows/caught-up"] })
  queryClient.invalidateQueries({ queryKey: ["/api/shows/completed"] })
  queryClient.invalidateQueries({ queryKey: ["/api/shows/want-to-watch"] })
  queryClient.invalidateQueries({ queryKey: ["/api/shows/stopped"] })
}

function tryRun(
  scope: "all" | "caught_up_only" | "completed_recheck",
  storageKey: string,
  throttleMs: number
): void {
  if (typeof sessionStorage === "undefined") return
  const raw = sessionStorage.getItem(storageKey)
  const last = raw ? parseInt(raw, 10) : 0
  if (last && Date.now() - last < throttleMs) return

  apiRequest("POST", "/api/user/shows/validate-status", { scope })
    .then((res) => {
      if (res.ok) {
        sessionStorage.setItem(storageKey, String(Date.now()))
        // The bulk sweep runs in the background, so there is no result to wait
        // on — refetch once, later, rather than polling.
        setTimeout(invalidateStatusRelatedQueries, STATUS_INVALIDATE_DELAY_MS)
      }
    })
    .catch(() => {})
}

/**
 * Refreshes show metadata from TMDB and re-runs status inference.
 *
 * This used to also run on every route change, which meant a full sweep of the
 * library — a TMDB fetch per show and per season — for the simple act of
 * navigating, and lists visibly reshuffling a minute later. Sweeps now happen
 * once per session; a show you actually open validates itself on its own page.
 */
export function StatusValidationTrigger() {
  useEffect(() => {
    tryRun("all", STORAGE_KEY_INITIAL, THROTTLE_INITIAL_MS)
    // Completed shows rarely change, but a renewal should eventually surface.
    tryRun(
      "completed_recheck",
      STORAGE_KEY_COMPLETED_RECHECK,
      THROTTLE_COMPLETED_RECHECK_MS
    )
  }, [])

  return null
}
