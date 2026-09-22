import { createClient } from '@/lib/supabase/client'
import type { BudgetLimit, CategoryId } from '@/types'

// ── DB row shape ──────────────────────────────────────────────────────────────
interface BudgetLimitRow {
  id: string
  user_id: string
  category_id: string
  limit_amount: number
  month: string
}

function rowToBudgetLimit(row: BudgetLimitRow): BudgetLimit {
  return {
    categoryId: row.category_id as CategoryId,
    limit: Number(row.limit_amount),
    cycle: 'monthly',
  }
}

// ── Typed DB functions ────────────────────────────────────────────────────────

export async function fetchBudgetLimits(
  userId: string,
  month: string
): Promise<BudgetLimit[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('budget_limits')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)

  if (error) throw new Error(error.message)
  return (data as BudgetLimitRow[]).map(rowToBudgetLimit)
}

/**
 * The set of 'YYYY-MM' months that already have at least one snapshot row for
 * this user. Used by the one-time backfill to avoid overwriting real snapshots.
 */
export async function fetchSnapshottedMonths(userId: string): Promise<Set<string>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('budget_limits')
    .select('month')
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  return new Set((data as { month: string }[]).map((r) => r.month))
}

export async function upsertBudgetLimit(
  userId: string,
  limit: BudgetLimit,
  month: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('budget_limits').upsert(
    {
      user_id: userId,
      category_id: limit.categoryId,
      limit_amount: limit.limit,
      month,
    },
    { onConflict: 'user_id,category_id,month' }
  )
  if (error) throw new Error(error.message)
}

/**
 * Replace a whole month's limit snapshot. Used to freeze the active plan's
 * effective limits into a given month so historical views render the budget
 * that applied then, not whatever plan happens to be active now.
 *
 * Delete-then-insert (rather than upsert) so categories the user has since
 * dropped from their plan don't leave stale rows behind for that month; an
 * empty `limits` clears the month entirely.
 */
export async function replaceBudgetLimits(
  userId: string,
  limits: BudgetLimit[],
  month: string
): Promise<void> {
  const supabase = createClient()
  const { error: delError } = await supabase
    .from('budget_limits')
    .delete()
    .eq('user_id', userId)
    .eq('month', month)
  if (delError) throw new Error(delError.message)

  if (limits.length === 0) return
  const { error: insError } = await supabase.from('budget_limits').insert(
    limits.map((l) => ({
      user_id: userId,
      category_id: l.categoryId,
      limit_amount: l.limit,
      month,
    }))
  )
  if (insError) throw new Error(insError.message)
}
