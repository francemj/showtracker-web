import React from "react"
import { LibraryScreen } from "../../../components/LibraryScreen"

export default function StoppedScreen() {
  return <LibraryScreen endpoint="/api/shows/stopped" status="stopped" />
}
