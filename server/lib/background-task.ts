import { waitUntil } from "@vercel/functions"

type BackgroundTask = () => Promise<void>
type SchedulerMode =
  | "vercel_waitUntil"
  | "local_setImmediate"
  | "fallback_microtask"

interface ScheduleOptions {
  taskName: string
}

async function runTaskWithLogging(
  task: BackgroundTask,
  taskName: string
): Promise<void> {
  try {
    await task()
  } catch (error) {
    console.error(`[background-task:${taskName}] failed`, { error })
  }
}

export function scheduleBackgroundTask(
  task: BackgroundTask,
  options: ScheduleOptions
): SchedulerMode {
  const { taskName } = options

  if (process.env.VERCEL) {
    try {
      waitUntil(runTaskWithLogging(task, taskName))
      return "vercel_waitUntil"
    } catch (error) {
      console.warn(
        `[background-task:${taskName}] waitUntil unavailable, falling back to in-process scheduling`,
        { error }
      )
    }
  }

  if (typeof setImmediate === "function") {
    setImmediate(() => {
      void runTaskWithLogging(task, taskName)
    })
    return "local_setImmediate"
  }

  queueMicrotask(() => {
    void runTaskWithLogging(task, taskName)
  })
  return "fallback_microtask"
}
