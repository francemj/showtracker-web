import React from "react"
import { LibraryScreen } from "../../../components/LibraryScreen"

export default function CompletedScreen() {
  return <LibraryScreen endpoint="/api/shows/completed" status="completed" />
}
