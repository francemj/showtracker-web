import { useEffect, useRef } from "react"

export function useInfiniteScroll(
  callback: () => void,
  hasNextPage: boolean,
  isFetchingNextPage: boolean
) {
  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          callback()
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [callback, hasNextPage, isFetchingNextPage])

  return observerTarget
}
