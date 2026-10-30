// The one order collection states are presented in, everywhere: the web
// sidebar, both library tab strips, and the add-to-collection menus. Kept free
// of dependencies so the mobile bundle can import it without pulling in the
// Drizzle schema.
export const STATUS_ORDER = [
  "watching",
  "want_to_watch",
  "caught_up",
  "completed",
  "stopped",
] as const

export type StatusKey = (typeof STATUS_ORDER)[number]

export const STATUS_SLUG: Record<StatusKey, string> = {
  watching: "watching",
  want_to_watch: "want-to-watch",
  caught_up: "caught-up",
  completed: "completed",
  stopped: "stopped",
}
