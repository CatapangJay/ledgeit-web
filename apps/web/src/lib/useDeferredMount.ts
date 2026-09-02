'use client'

import { useEffect, useState } from 'react'

/**
 * Returns `false` on the first client render, then flips to `true` after the
 * browser has painted (double rAF, falling back to a 0ms timer for SSR-less
 * safety).
 *
 * Why: the app's route pages are heavy client components that synchronously
 * render 10-15 store-reading cards (charts, heatmap, feeds). On a client-side
 * navigation the JS chunk is already loaded, so there's no Suspense/`loading.tsx`
 * boundary to fill the gap — the whole tree renders before the browser can paint
 * the new route, which reads as a freeze. Deferring the heavy stack by one paint
 * lets the route's shell + skeleton show instantly, then the content mounts.
 */
export function useDeferredMount(): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let raf1 = 0
    let raf2 = 0
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setReady(true))
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [])

  return ready
}
