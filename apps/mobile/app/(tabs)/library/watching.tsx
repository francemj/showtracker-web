import React, { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ShowList } from "../../../components/ShowList"
import type { ShowWithProgress } from "@showtracker/shared"

const PAGE_SIZE = 20

export default function WatchingScreen() {
  const [page] = useState(1)
  const { data, isLoading } = useQuery<{ shows: ShowWithProgress[] }>({
    queryKey: [`/api/shows/watching?page=${page}&limit=${PAGE_SIZE}`],
  })
  return (
    <ShowList
      shows={data?.shows}
      isLoading={isLoading}
      emptyMessage="No shows in progress."
    />
  )
}
