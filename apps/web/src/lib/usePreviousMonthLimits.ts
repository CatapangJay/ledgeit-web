'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { previousMonthKey } from '@/lib/monthlyRecap'
import type { BudgetLimit } from '@/types'

// If the snapshot fetch is slow or fails, don't block a recap that gates on
// `loaded` forever — after this window we report loaded so the recap can open
// (without a budget section) rather than never appearing. Normal loads resolve
// well under this; for active users the snapshot is usually already cached.
const LOAD_FALLBACK_MS = 4000

export interface PreviousMonthLimits {
  /** Last month's frozen limits (empty when no snapshot was ever captured). */
  limits: BudgetLimit[]
  /** False until the snapshot fetch has resolved. Lets callers sequence UI
   *  (e.g. the once-per-month recap) against the load instead of guessing with a
   *  timer, so the budget-adherence section can't flash in late or be missed. */
  loaded: boolean
}

/**
 * The budget limits that applied during LAST calendar month, for the end-of-month
 * recap. The recap celebrates the month that just ended, so it must use the
 * budget that was in effect then — not whatever plan is active now.
 *
 * Resolution mirrors the Insights page: the previous month is always historical,
 * so it reads that month's frozen snapshot (`budgetLimitsByMonth`). For any
 * active user the snapshot already exists — `persistCurrentMonthSnapshot` wrote
 * it while last month was the current month — but we still trigger a load in
 * case this is the user's first session since the snapshot logic shipped.
 *
 * `loaded` distinguishes "still fetching" from "loaded, no snapshot": the store
 * caches an absent month as `undefined` and a fetched-but-empty month as `[]`.
 */
export function usePreviousMonthLimits(): PreviousMonthLimits {
  const budgetLimitsByMonth = useStore((s) => s.budgetLimitsByMonth)
  const loadBudgetLimitsForMonth = useStore((s) => s.loadBudgetLimitsForMonth)

  // Derived per render from the wall clock; cheap and avoids a stale key if the
  // app stays open across a month boundary.
  const key = previousMonthKey(new Date())

  // Fallback so a slow/failed fetch (which leaves the cache key `undefined`)
  // can't suppress a recap that waits on `loaded` indefinitely. The timer only
  // flips forward; `key` changing (a month rollover) is a full remount in
  // practice, so there's no need to reset it.
  const [fallbackReached, setFallbackReached] = useState(false)
  useEffect(() => {
    loadBudgetLimitsForMonth(key)
    const t = setTimeout(() => setFallbackReached(true), LOAD_FALLBACK_MS)
    return () => clearTimeout(t)
  }, [key, loadBudgetLimitsForMonth])

  const cached = budgetLimitsByMonth[key]
  return { limits: cached ?? [], loaded: cached !== undefined || fallbackReached }
}
