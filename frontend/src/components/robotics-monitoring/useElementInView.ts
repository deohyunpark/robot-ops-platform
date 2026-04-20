import { type RefObject, useEffect, useState } from "react"

/**
 * Approximates framer-motion `useInView(ref, { amount })`:
 * true when `intersectionRatio` is at least `amount`.
 */
export function useElementInView(
  ref: RefObject<Element | null>,
  options?: { amount?: number }
) {
  const amount = options?.amount ?? 0
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") return

    const thresholds = Array.from(
      new Set([0, Math.min(1, Math.max(0, amount)), 1])
    ).sort((a, b) => a - b)

    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e) return
        setInView(e.intersectionRatio >= amount)
      },
      { threshold: thresholds.length ? thresholds : [0] }
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [ref, amount])

  return inView
}
