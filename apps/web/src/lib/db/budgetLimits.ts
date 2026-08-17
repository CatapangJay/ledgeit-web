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
