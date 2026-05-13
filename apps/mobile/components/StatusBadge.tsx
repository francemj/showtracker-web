import React from "react"
import { Chip } from "react-native-paper"

const STATUS_CONFIG: Record<
  string,
  { label: string; backgroundColor: string; textColor: string }
> = {
  want_to_watch: {
    label: "Want to Watch",
    backgroundColor: "#e0e7ff",
    textColor: "#3730a3",
  },
  watching: {
    label: "Watching",
    backgroundColor: "#dcfce7",
    textColor: "#166534",
  },
  caught_up: {
    label: "Caught Up",
    backgroundColor: "#fef9c3",
    textColor: "#713f12",
  },
  completed: {
    label: "Completed",
    backgroundColor: "#f3e8ff",
    textColor: "#6b21a8",
  },
  stopped: {
    label: "Stopped",
    backgroundColor: "#fee2e2",
    textColor: "#991b1b",
  },
}

type Props = {
  status: string
}

export function StatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    backgroundColor: "#f3f4f6",
    textColor: "#374151",
  }

  return (
    <Chip
      style={{ backgroundColor: config.backgroundColor, alignSelf: "flex-start" }}
      textStyle={{ color: config.textColor, fontSize: 11, lineHeight: 14 }}
      compact
    >
      {config.label}
    </Chip>
  )
}
