import React from "react"
import { LibraryScreen } from "../../../components/LibraryScreen"

export default function CaughtUpScreen() {
  return <LibraryScreen endpoint="/api/shows/caught-up" status="caught_up" />
}
