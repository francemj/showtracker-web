import React from "react"
import { useQuery } from "@tanstack/react-query"
import { ShowList } from "../../../components/ShowList"
import type { ShowWithProgress } from "@showtracker/shared"

export default function CaughtUpScreen() {
  const { data, isLoading } = useQuery<{ shows: ShowWithProgress[] }>({
    queryKey: ["/api/shows/caught-up?page=1&limit=50"],
  })
  return (
    <ShowList
      shows={data?.shows}
      isLoading={isLoading}
      emptyMessage="No shows caught up yet."
    />
  )
}
