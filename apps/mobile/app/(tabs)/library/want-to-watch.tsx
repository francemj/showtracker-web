import React from "react"
import { useQuery } from "@tanstack/react-query"
import { PosterGrid } from "../../../components/PosterGrid"
import type { ShowWithProgress } from "@showtracker/shared"

const PAGE_SIZE = 40

export default function WantToWatchScreen() {
  const { data, isLoading } = useQuery<{ shows: ShowWithProgress[]; total: number }>({
    queryKey: [`/api/shows/want-to-watch?page=1&limit=${PAGE_SIZE}`],
  })
  return <PosterGrid shows={data?.shows} isLoading={isLoading} status="want_to_watch" />
}
