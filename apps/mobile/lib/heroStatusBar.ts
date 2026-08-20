import { useCallback, useState } from "react"
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native"
import type { StatusBarStyle } from "expo-status-bar"

// Home and the show detail screen both put dark artwork under the status bar
// and then scroll a themed surface up behind it, so what the bar needs for
// contrast inverts partway down. A fixed style is wrong for half the screen and
// "auto" is wrong for the other half, which is how the clock ended up invisible
// on Android — iOS happens to pick dark content in light mode on its own.
//
// `threshold` is the scroll offset at which the themed surface has taken over
// the area behind the bar.
export function useHeroStatusBarStyle(threshold: number): {
  statusBarStyle: StatusBarStyle
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
} {
  const [overHero, setOverHero] = useState(true)

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      setOverHero(event.nativeEvent.contentOffset.y < threshold)
    },
    [threshold]
  )

  return { statusBarStyle: overHero ? "light" : "auto", onScroll }
}
