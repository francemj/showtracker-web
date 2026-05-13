import * as React from "react"

type Breakpoint = "base" | "sm" | "md" | "lg" | "xl" | "2xl"

// Tailwind default breakpoints in rem (matches Tailwind's default config)
// These will be converted to pixels based on root font size
const BREAKPOINTS_REM = {
  sm: 40, // 40rem = 640px at 16px base
  md: 48, // 48rem = 768px at 16px base
  lg: 64, // 64rem = 1024px at 16px base
  xl: 80, // 80rem = 1280px at 16px base
  "2xl": 96, // 96rem = 1536px at 16px base
} as const

function getRootFontSize(): number {
  if (typeof window === "undefined") return 16
  const rootFontSize = parseFloat(
    getComputedStyle(document.documentElement).fontSize
  )
  return rootFontSize || 16 // Fallback to 16px if parsing fails
}

function remToPx(rem: number): number {
  return rem * getRootFontSize()
}

function getBreakpoint(width: number): Breakpoint {
  const px2xl = remToPx(BREAKPOINTS_REM["2xl"])
  const pxxl = remToPx(BREAKPOINTS_REM.xl)
  const pxlg = remToPx(BREAKPOINTS_REM.lg)
  const pxmd = remToPx(BREAKPOINTS_REM.md)
  const pxsm = remToPx(BREAKPOINTS_REM.sm)

  if (width >= px2xl) return "2xl"
  if (width >= pxxl) return "xl"
  if (width >= pxlg) return "lg"
  if (width >= pxmd) return "md"
  if (width >= pxsm) return "sm"
  return "base"
}

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = React.useState<Breakpoint>(() => {
    if (typeof window === "undefined") return "base"
    return getBreakpoint(window.innerWidth)
  })

  React.useEffect(() => {
    const updateBreakpoint = () => {
      setBreakpoint(getBreakpoint(window.innerWidth))
    }

    // Set initial breakpoint
    updateBreakpoint()

    // Listen for resize events with debouncing for better performance
    let timeoutId: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(updateBreakpoint, 100)
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      clearTimeout(timeoutId)
    }
  }, [])

  return breakpoint
}
