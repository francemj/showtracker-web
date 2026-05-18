import { statusPalette, STATUS_LABEL, type StatusKey } from "@/lib/status"
import { useTheme } from "@/components/theme-provider"

interface StatusBadgeProps {
  status: StatusKey
  "data-testid"?: string
}

export function StatusBadge({
  status,
  "data-testid": testId,
}: StatusBadgeProps) {
  const { theme } = useTheme()
  const p = statusPalette(status, theme)
  return (
    <span
      style={{ background: p.solid, color: "#fff" }}
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.05em]"
      data-testid={testId}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
