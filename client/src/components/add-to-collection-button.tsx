import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, ChevronDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface AddToCollectionButtonProps {
  showId: number
  status: string | undefined | null
  onAdd: (showId: number, initialStatus?: string) => void
  isPending: boolean
  isUserShow: boolean
  size?: "sm" | "default" | "lg"
  className?: string
  dataTestId?: string
}

export function AddToCollectionButton({
  showId,
  status,
  onAdd,
  isPending,
  isUserShow,
  size = "default",
  className,
  dataTestId,
}: AddToCollectionButtonProps) {
  const [open, setOpen] = useState(false)

  const shouldFetch = open && status == null
  const { data, isLoading } = useQuery<{ status?: string }>({
    queryKey: ["/api/shows", showId],
    enabled: shouldFetch,
  })

  const effectiveStatus = status ?? data?.status
  const showMarkCompleted =
    !isUserShow &&
    (effectiveStatus === "Ended" || effectiveStatus === "Canceled")
  const showMarkCaughtUp = !isUserShow && effectiveStatus === "Returning Series"
  const menuTestIdSuffix =
    dataTestId === "button-add-to-collection"
      ? ""
      : dataTestId
        ? `-${showId}`
        : undefined

  return (
    <div className={cn("inline-flex", className)}>
      <Button
        size={size}
        disabled={isPending}
        className="rounded-r-none"
        onClick={() => onAdd(showId)}
        data-testid={dataTestId}
      >
        <Plus className="w-4 h-4 mr-1" />
        Add to Collection
      </Button>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size={size}
            disabled={isPending}
            className="rounded-l-none border-l px-2"
            aria-label="Add to collection options"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => onAdd(showId)}
            data-testid={
              menuTestIdSuffix !== undefined
                ? `menu-item-want-to-watch${menuTestIdSuffix}`
                : undefined
            }
          >
            Want to Watch
          </DropdownMenuItem>
          {shouldFetch && isLoading && (
            <DropdownMenuItem disabled>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading…
            </DropdownMenuItem>
          )}
          {showMarkCompleted && (
            <DropdownMenuItem
              onClick={() => onAdd(showId, "completed")}
              data-testid={
                menuTestIdSuffix !== undefined
                  ? `menu-item-mark-completed${menuTestIdSuffix}`
                  : undefined
              }
            >
              Mark as Completed
            </DropdownMenuItem>
          )}
          {showMarkCaughtUp && (
            <DropdownMenuItem
              onClick={() => onAdd(showId, "caught_up")}
              data-testid={
                menuTestIdSuffix !== undefined
                  ? `menu-item-mark-caught-up${menuTestIdSuffix}`
                  : undefined
              }
            >
              Mark as Caught Up
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
