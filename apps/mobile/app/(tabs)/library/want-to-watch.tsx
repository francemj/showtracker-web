import React from "react"
import { LibraryScreen } from "../../../components/LibraryScreen"

export default function WantToWatchScreen() {
  return (
    <LibraryScreen endpoint="/api/shows/want-to-watch" status="want_to_watch" />
  )
}
