import { useQuery } from "@tanstack/react-query"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ShowWithProgress } from "@shared/schema"
import { Zap } from "lucide-react"
import { ShowGrid } from "@/components/show-grid"

export default function CaughtUp() {
  const { data: shows, isLoading } = useQuery<ShowWithProgress[]>({
    queryKey: ["/api/shows/caught-up"],
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 bg-teal-600/10 rounded-lg">
          <Zap className="w-6 h-6 text-teal-600" />
        </div>
        <div>
          <h1 className="text-4xl font-heading font-bold text-foreground">
            Caught Up
          </h1>
          <p className="text-muted-foreground">
            Shows where you've watched all available episodes
          </p>
        </div>
      </div>

      <ShowGrid
        shows={shows}
        isLoading={isLoading}
        emptyMessage={
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">No Shows</CardTitle>
              <CardDescription>
                You've not caught up with any shows yet. Keep watching to add
                shows to this list!
              </CardDescription>
            </CardHeader>
          </Card>
        }
      />
    </div>
  )
}
