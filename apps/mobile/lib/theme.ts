import { useColorScheme } from "react-native"

export const SERIF = "InstrumentSerif_400Regular"
export const SERIF_ITALIC = "InstrumentSerif_400Regular_Italic"
export const SANS = "DMSans_400Regular"
export const SANS_500 = "DMSans_500Medium"
export const SANS_600 = "DMSans_600SemiBold"
export const SANS_700 = "DMSans_700Bold"
export const MONO = "JetBrainsMono_400Regular"
export const MONO_500 = "JetBrainsMono_500Medium"
export const MONO_600 = "JetBrainsMono_600SemiBold"

const light = {
  bg: "#FAFAF7",
  surface: "#FFFFFF",
  surfaceAlt: "#F2F1EC",
  border: "#E6E4DD",
  borderStrong: "#D7D4CB",
  fg: "#16161A",
  fgMuted: "#5C5B57",
  fgFaint: "#8E8C85",
  accent: "#1a9268",
}

const dark = {
  bg: "#0E0F12",
  surface: "#16181C",
  surfaceAlt: "#1C1F24",
  border: "#262A30",
  borderStrong: "#3A3F47",
  fg: "#F4F4F0",
  fgMuted: "#9C9C95",
  fgFaint: "#6F6E68",
  accent: "#36c98a",
}

export type AppTheme = typeof light

export const COLORS = { light, dark }

export type StatusKey = "watching" | "want_to_watch" | "caught_up" | "completed" | "stopped"

export const STATUS_COLORS: Record<
  StatusKey,
  { light: { solid: string; bg: string; fg: string }; dark: { solid: string; bg: string; fg: string } }
> = {
  watching: {
    light: { solid: "#1a9268", bg: "#e6f7f1", fg: "#0d5c41" },
    dark:  { solid: "#36c98a", bg: "#0d3d28", fg: "#6de0b0" },
  },
  want_to_watch: {
    light: { solid: "#8b7200", bg: "#fef9c3", fg: "#5a4a00" },
    dark:  { solid: "#c9a030", bg: "#2e2200", fg: "#e0c060" },
  },
  caught_up: {
    light: { solid: "#3a5ec0", bg: "#e8eef9", fg: "#1e3a80" },
    dark:  { solid: "#6890e0", bg: "#0e1e40", fg: "#90b0f0" },
  },
  completed: {
    light: { solid: "#8830b8", bg: "#f5e8fd", fg: "#5a1a80" },
    dark:  { solid: "#b868e0", bg: "#280a40", fg: "#d090f0" },
  },
  stopped: {
    light: { solid: "#c03030", bg: "#fde8e8", fg: "#801a1a" },
    dark:  { solid: "#e06060", bg: "#400a0a", fg: "#f09090" },
  },
}

export const STATUS_LABELS: Record<StatusKey, string> = {
  watching: "Watching",
  want_to_watch: "Want",
  caught_up: "Caught Up",
  completed: "Completed",
  stopped: "Stopped",
}

export function useAppTheme(): AppTheme {
  const scheme = useColorScheme()
  return scheme === "dark" ? dark : light
}
