'use client'

import { useMemo } from 'react'
import { useStore } from '@/lib/store'
import { applyCarryoversToLimits } from '@/types'
import type { BudgetLimit } from '@/types'

// Local-time 'YYYY-MM' key for the current calendar month.
function currentMonthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * The CURRENT month's EFFECTIVE budget limits: the active plan's limits with any
 * end-of-month carryovers rolled into this month layered on top. A category that
 * carried a leftover forward shows a higher limit this month; one that carried an
 * overage shows a lower one. Carryovers routed to a wallet don't touch the budget.
 *
 * Every current-month budget consumer (overview, top categories, income panel,
 * coach) should read limits through here so the carried amounts actually move
 * the allocations the user sees — not just sit in history.
 */
export function useEffectiveBudgetLimits(): BudgetLimit[] {
  const budgetLimits = useStore((s) => s.budgetLimits)
  const carryovers = useStore((s) => s.budgetCarryovers)
  const monthKey = currentMonthKey()
  return useMemo(
    () => applyCarryoversToLimits(budgetLimits, carryovers, monthKey),
    [budgetLimits, carryovers, monthKey]
  )
}
