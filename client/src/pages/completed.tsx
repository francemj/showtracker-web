import { useQuery } from "@tanstack/react-query"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ShowWithProgress } from "@shared/schema"
import { CheckCircle2 } from "lucide-react"
import { ShowGrid } from "@/components/show-grid"

export default function Completed() {
  const { data: shows, isLoading } = useQuery<ShowWithProgress[]>({
    queryKey: ["/api/shows/completed"],
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 bg-accent/10 rounded-lg">
          <CheckCircle2 className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h1 className="text-4xl font-heading font-bold text-foreground">
            Completed Shows
          </h1>
          <p className="text-muted-foreground">
            Shows you've finished watching
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
                You haven't completed any shows yet. Keep watching to add shows
                to this list!
              </CardDescription>
            </CardHeader>
          </Card>
        }
      />
    </div>
  )
}
