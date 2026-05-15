import React from "react"
import { useQuery } from "@tanstack/react-query"
import { PosterGrid } from "../../../components/PosterGrid"
import type { ShowWithProgress } from "@showtracker/shared"

const PAGE_SIZE = 40

export default function CompletedScreen() {
  const { data, isLoading } = useQuery<{ shows: ShowWithProgress[]; total: number }>({
    queryKey: [`/api/shows/completed?page=1&limit=${PAGE_SIZE}`],
  })
  return <PosterGrid shows={data?.shows} isLoading={isLoading} status="completed" />
}
