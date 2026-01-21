import { useQuery } from "@tanstack/react-query"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ShowWithProgress } from "@shared/schema"
import { Eye } from "lucide-react"
import { ShowGrid } from "@/components/show-grid"

export default function Watching() {
  const { data: shows, isLoading } = useQuery<ShowWithProgress[]>({
    queryKey: ["/api/shows/watching"],
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
          <Eye className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-heading font-bold text-foreground">
            Currently Watching
          </h1>
          <p className="text-muted-foreground">
            Shows you're actively following
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
                You're not currently watching any shows. Add shows from the
                search page to start tracking!
              </CardDescription>
            </CardHeader>
          </Card>
        }
      />
    </div>
  )
}
