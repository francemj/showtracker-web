import type { StatusKey } from "@shared/schema"

export type { StatusKey }

export const STATUS_HUE: Record<StatusKey, number> = {
  watching: 155,
  want_to_watch: 60,
  caught_up: 235,
  completed: 305,
  stopped: 0,
} as const

export function statusPalette(
  key: StatusKey,
  mode: "light" | "dark" = "light"
) {
  const h = STATUS_HUE[key]
  return mode === "dark"
    ? {
        fg: `oklch(0.82 0.14 ${h})`,
        bg: `oklch(0.30 0.06 ${h} / 0.55)`,
        edge: `oklch(0.55 0.12 ${h})`,
        solid: `oklch(0.68 0.16 ${h})`,
        faint: `oklch(0.28 0.04 ${h} / 0.35)`,
      }
    : {
        fg: `oklch(0.40 0.14 ${h})`,
        bg: `oklch(0.95 0.04 ${h})`,
        edge: `oklch(0.55 0.14 ${h})`,
        solid: `oklch(0.55 0.16 ${h})`,
        faint: `oklch(0.97 0.02 ${h})`,
      }
}

export const STATUS_LABEL: Record<StatusKey, string> = {
  watching: "Watching",
  want_to_watch: "Want to Watch",
  caught_up: "Caught Up",
  completed: "Completed",
  stopped: "Stopped",
}
