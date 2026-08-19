import { Link } from "wouter"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Compass } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex items-center justify-center py-16">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <Compass className="h-7 w-7 text-muted-foreground shrink-0" />
            <h1 className="font-serif text-2xl text-foreground">
              This page doesn’t exist
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            The link may be out of date, or the show may have been removed from
            your library.
          </p>
          <Button asChild className="mt-6">
            <Link href="/" data-testid="link-not-found-home">
              Back to Home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
