'use client'

import { useEffect, useState } from 'react'

// Shared breakpoint hook — mirrors the md breakpoint (768px) used across the
// app to switch sheets from mobile bottom-sheets to centered desktop modals.
// Starts false so SSR / first paint matches the mobile layout, then syncs on
// mount. Extracted from SmartEntrySheet so every sheet behaves consistently.
export function useIsDesktop(minWidth = 768): boolean {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`)
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [minWidth])

  return isDesktop
}
