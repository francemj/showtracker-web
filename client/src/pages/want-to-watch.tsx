import { useQuery } from "@tanstack/react-query"
import { ShowCard } from "@/components/show-card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ShowWithProgress } from "@shared/schema"
import { Bookmark } from "lucide-react"

export default function WantToWatch() {
  const { data: shows, isLoading } = useQuery<ShowWithProgress[]>({
    queryKey: ["/api/shows/want-to-watch"],
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 bg-purple-600/10 rounded-lg">
          <Bookmark className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-4xl font-heading font-bold text-foreground">
            Want to Watch
          </h1>
          <p className="text-muted-foreground">
            Shows you've saved to watch later
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3]" />
          ))}
        </div>
      ) : shows && shows.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {shows.map((show) => (
            <ShowCard key={show.id} show={show} href={`/show/${show.id}`} />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">No Shows</CardTitle>
            <CardDescription>
              You haven't saved any shows to watch yet. Search for shows and add
              them to your Want to Watch list to get started!
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
