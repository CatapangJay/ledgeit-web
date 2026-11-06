import { useEffect } from 'react';
import type { BudgetLimit } from '@ledgeit/core';
import { useStore } from '@/lib/store';
import { previousMonthKey } from '@/lib/monthlyRecap';

export interface PreviousMonthLimits {
  /** Last month's frozen limits (empty when no snapshot was ever captured). */
  limits: BudgetLimit[];
  /** False until the snapshot has resolved, so the once-per-month recap can wait
   *  for its budget section instead of flashing it in late. */
  loaded: boolean;
}

/**
 * The budget limits that applied during LAST calendar month, for the end-of-month
 * recap. The recap covers the month that just ended, so it must use the budget in
 * effect then, not whatever plan is active now. Mirrors
 * apps/web/src/lib/usePreviousMonthLimits.ts; the mock store resolves
 * synchronously, so web's slow-fetch fallback timer isn't needed here.
 */
export function usePreviousMonthLimits(): PreviousMonthLimits {
  const budgetLimitsByMonth = useStore((s) => s.budgetLimitsByMonth);
  const loadBudgetLimitsForMonth = useStore((s) => s.loadBudgetLimitsForMonth);
  // The store leaves the month unresolved while no plan is active, so retry once
  // one becomes active.
  const hasActivePlan = useStore((s) => s.budgetAllocations.some((a) => a.isActive));
  const key = previousMonthKey(new Date());

  useEffect(() => {
    loadBudgetLimitsForMonth(key);
  }, [key, hasActivePlan, loadBudgetLimitsForMonth]);

  const cached = budgetLimitsByMonth[key];
  return { limits: cached ?? [], loaded: cached !== undefined };
}
