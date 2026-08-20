import { useWindowDimensions } from "react-native"

// `supportsTablet: true` shipped without a tablet layout, so every screen was a
// phone layout stretched to 1032pt: 140-character lines, a full-width sign-in
// button, stat columns thrown to opposite corners. Capping the content column
// is what makes the existing visual language hold at tablet size.
export const CONTENT_MAX_WIDTH = 620

export const SCREEN_PADDING = 22
const GRID_GUTTER = 18

// Roughly the poster width a phone already shows at two columns. Holding the
// poster size steady and letting the column count follow the width is what
// keeps an iPad from rendering two 500pt posters and calling it a library.
const TARGET_POSTER_WIDTH = 170

export function useContentWidth(): number {
  const { width } = useWindowDimensions()
  return Math.min(width, CONTENT_MAX_WIDTH)
}

export function useGridMetrics(): {
  columns: number
  posterWidth: number
  posterHeight: number
} {
  const { width } = useWindowDimensions()
  const available = width - SCREEN_PADDING * 2
  const columns = Math.max(
    2,
    Math.floor((available + GRID_GUTTER) / (TARGET_POSTER_WIDTH + GRID_GUTTER))
  )
  const posterWidth = Math.floor(
    (available - GRID_GUTTER * (columns - 1)) / columns
  )
  return { columns, posterWidth, posterHeight: Math.floor(posterWidth * 1.5) }
}
