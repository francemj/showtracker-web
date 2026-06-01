import React from "react"
import { LibraryScreen } from "../../../components/LibraryScreen"

export default function WatchingScreen() {
  return <LibraryScreen endpoint="/api/shows/watching" status="watching" />
}
