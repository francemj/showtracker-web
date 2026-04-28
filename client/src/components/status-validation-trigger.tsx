import { useEffect, useRef } from "react"
import { useLocation } from "wouter"
import { apiRequest, queryClient } from "@/lib/queryClient"

const STORAGE_KEY_INITIAL = "statusValidationInitial"
const STORAGE_KEY_NAV = "statusValidationNav"
const THROTTLE_INITIAL_MS = 30 * 60 * 1000 // 30 minutes
const THROTTLE_NAV_MS = 10 * 60 * 1000 // 10 minutes
export const STATUS_INVALIDATE_DELAY_MS = 60 * 1000 // 1 minute - give backend time to finish

export function invalidateStatusRelatedQueries() {
  queryClient.invalidateQueries({ queryKey: ["/api/stats"] })
  queryClient.invalidateQueries({ queryKey: ["/api/shows/watching"] })
  queryClient.invalidateQueries({ queryKey: ["/api/shows/caught-up"] })
  queryClient.invalidateQueries({ queryKey: ["/api/shows/completed"] })
  queryClient.invalidateQueries({ queryKey: ["/api/shows/want-to-watch"] })
  queryClient.invalidateQueries({
    queryKey: ["/api/shows/want-to-watch", "dashboard"],
  })
}

function tryRun(
  scope: "all" | "caught_up_only",
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
        // Invalidate after delay so UI refetches once backend has updated
        setTimeout(invalidateStatusRelatedQueries, STATUS_INVALIDATE_DELAY_MS)
      }
    })
    .catch(() => {})
}

export function StatusValidationTrigger() {
  const [location] = useLocation()
  const isFirstLocation = useRef(true)

  // Initial load: refresh all non-completed shows (throttled 30 min)
  useEffect(() => {
    tryRun("all", STORAGE_KEY_INITIAL, THROTTLE_INITIAL_MS)
  }, [])

  // On navigation: refresh all non-completed shows (throttled 10 min, separate from initial)
  useEffect(() => {
    if (isFirstLocation.current) {
      isFirstLocation.current = false
      return
    }
    tryRun("all", STORAGE_KEY_NAV, THROTTLE_NAV_MS)
  }, [location])

  return null
}
