import { createClient } from '@/lib/supabase/client'
import type { BudgetCarryover, CarryoverDestination } from '@/types'

// ── DB row shape ──────────────────────────────────────────────────────────────
interface CarryoverRow {
  id: string
  user_id: string
  category_id: string
  from_month: string
  to_month: string
  amount: number
  destination: string
  wallet_id: string | null
  transaction_id: string | null
  created_at: string
}

function rowToCarryover(row: CarryoverRow): BudgetCarryover {
  return {
    id: row.id,
    categoryId: row.category_id,
    fromMonth: row.from_month,
    toMonth: row.to_month,
    amount: Number(row.amount),
    destination: row.destination as CarryoverDestination,
    walletId: row.wallet_id ?? undefined,
    transactionId: row.transaction_id ?? undefined,
    createdAt: row.created_at,
  }
}

// ── Typed DB functions ────────────────────────────────────────────────────────

/** All carryovers for a user, newest first. */
export async function fetchBudgetCarryovers(userId: string): Promise<BudgetCarryover[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('budget_carryovers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as CarryoverRow[]).map(rowToCarryover)
}

/**
 * Create a carryover row. One per (user, category, from_month) — the unique
 * constraint rejects a second attempt to roll the same category/month forward.
 */
export async function insertBudgetCarryover(
  userId: string,
  payload: {
    categoryId: string
    fromMonth: string
    toMonth: string
    amount: number
    destination: CarryoverDestination
    walletId?: string
    transactionId?: string
  }
): Promise<BudgetCarryover> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('budget_carryovers')
    .insert({
      user_id: userId,
      category_id: payload.categoryId,
      from_month: payload.fromMonth,
      to_month: payload.toMonth,
      amount: payload.amount,
      destination: payload.destination,
      wallet_id: payload.walletId ?? null,
      transaction_id: payload.transactionId ?? null,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return rowToCarryover(data as CarryoverRow)
}

export async function deleteBudgetCarryover(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('budget_carryovers').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
