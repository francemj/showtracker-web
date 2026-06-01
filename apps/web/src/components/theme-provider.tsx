import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react"

type Theme = "dark" | "light"

type ThemeProviderState = {
  theme: Theme
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined
)

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getSystemTheme)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) =>
      setTheme(e.matches ? "dark" : "light")
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(theme)
  }, [theme])

  return (
    <ThemeProviderContext.Provider value={{ theme }}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeProviderContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
