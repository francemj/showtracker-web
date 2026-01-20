import { useEffect, useRef } from "react"
import { useLocation } from "wouter"
import { apiRequest } from "@/lib/queryClient"

const STORAGE_KEY = "statusValidationLastRun"
const THROTTLE_MS = 30 * 60 * 1000 // 30 minutes

function tryRun(scope: "all" | "caught_up_only") {
  if (typeof sessionStorage === "undefined") return
  const raw = sessionStorage.getItem(STORAGE_KEY)
  const last = raw ? parseInt(raw, 10) : 0
  if (last && Date.now() - last < THROTTLE_MS) return
  sessionStorage.setItem(STORAGE_KEY, String(Date.now()))
  apiRequest("POST", "/api/user/shows/validate-status", { scope }).catch(
    () => {}
  )
}

export function StatusValidationTrigger() {
  const [location] = useLocation()
  const isFirstLocation = useRef(true)

  useEffect(() => {
    tryRun("all")
  }, [])

  useEffect(() => {
    if (isFirstLocation.current) {
      isFirstLocation.current = false
      return
    }
    tryRun("caught_up_only")
  }, [location])

  return null
}
