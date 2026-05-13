import React from "react"
import { useQuery } from "@tanstack/react-query"
import { ShowList } from "../../../components/ShowList"
import type { ShowWithProgress } from "@showtracker/shared"

export default function CompletedScreen() {
  const { data, isLoading } = useQuery<{ shows: ShowWithProgress[] }>({
    queryKey: ["/api/shows/completed?page=1&limit=50"],
  })
  return (
    <ShowList
      shows={data?.shows}
      isLoading={isLoading}
      emptyMessage="No completed shows yet."
    />
  )
}
