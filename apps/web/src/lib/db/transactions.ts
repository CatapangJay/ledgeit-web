import { createClient } from '@/lib/supabase/client'
import { resolveCategory } from '@/types'
import type { Transaction, CustomCategory, PaymentMethodId, TransactionType } from '@/types'

// ── DB row shape returned from Supabase ───────────────────────────────────────
interface TransactionRow {
  id: string
  user_id: string
  amount: number
  type: string
  merchant: string
  category_id: string
  payment_method: string | null
  notes: string | null
  raw: string
  confidence: number
  is_recurring: boolean
  date: string
  created_at: string
}

// ── Mapper: DB row → frontend Transaction ────────────────────────────────────
function rowToTransaction(row: TransactionRow, customCats: CustomCategory[] = []): Transaction {
  return {
    id: row.id,
    raw: row.raw,
    amount: Number(row.amount),
    merchant: row.merchant,
    category: resolveCategory(row.category_id, customCats),
    // Normalize to YYYY-MM-DD. A Postgres DATE can surface with a time/zone
    // suffix depending on the client; slicing enforces the documented contract
    // so exact-match comparisons (7-day trend, today's spend) work reliably.
    date: String(row.date).slice(0, 10),
    type: row.type as TransactionType,
    // Legacy rows (before payment methods existed) have null → default to cash.
    paymentMethod: (row.payment_method ?? 'cash') as PaymentMethodId,
    confidence: Number(row.confidence),
    isRecurring: row.is_recurring,
    note: row.notes ?? undefined,
    createdAt: row.created_at,
  }
}

// ── Typed DB functions ────────────────────────────────────────────────────────

async function getCurrentUserId(): Promise<string> {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return user.id
}

export async function fetchTransactions(
  userId: string,
  customCats: CustomCategory[] = []
): Promise<Transaction[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as TransactionRow[]).map((row) => rowToTransaction(row, customCats))
}

export async function insertTransaction(tx: Transaction): Promise<void> {
  const supabase = createClient()
  const userId = await getCurrentUserId()
  const { error } = await supabase.from('transactions').insert({
    id: tx.id,
    user_id: userId,
    amount: tx.amount,
    type: tx.type,
    merchant: tx.merchant,
    category_id: tx.category.id,
    payment_method: tx.paymentMethod,
    notes: tx.note ?? null,
    raw: tx.raw,
    confidence: tx.confidence,
    is_recurring: tx.isRecurring ?? false,
    date: tx.date,
    created_at: tx.createdAt,
  })
  if (error) throw new Error(error.message)
}

export async function removeTransaction(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/** Set the category (and implied type) on many transactions in one request. */
export async function bulkSetCategory(
  ids: string[],
  categoryId: string,
  type: TransactionType
): Promise<void> {
  if (ids.length === 0) return
  const supabase = createClient()
  const { error } = await supabase
    .from('transactions')
    .update({ category_id: categoryId, type })
    .in('id', ids)
  if (error) throw new Error(error.message)
}

/** Set the date on many transactions in one request. */
export async function bulkSetDate(ids: string[], date: string): Promise<void> {
  if (ids.length === 0) return
  const supabase = createClient()
  const { error } = await supabase
    .from('transactions')
    .update({ date })
    .in('id', ids)
  if (error) throw new Error(error.message)
}

/** Delete many transactions in one request. */
export async function bulkDeleteTransactions(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const supabase = createClient()
  const { error } = await supabase
    .from('transactions')
    .delete()
    .in('id', ids)
  if (error) throw new Error(error.message)
}

export async function patchTransaction(
  id: string,
  patch: Partial<Transaction>
): Promise<void> {
  const supabase = createClient()
  const dbPatch: Record<string, unknown> = {}

  if (patch.amount !== undefined) dbPatch.amount = patch.amount
  if (patch.type !== undefined) dbPatch.type = patch.type
  if (patch.merchant !== undefined) dbPatch.merchant = patch.merchant
  if (patch.category !== undefined) dbPatch.category_id = patch.category.id
  if (patch.paymentMethod !== undefined) dbPatch.payment_method = patch.paymentMethod
  if (patch.note !== undefined) dbPatch.notes = patch.note
  if (patch.date !== undefined) dbPatch.date = patch.date
  if (patch.raw !== undefined) dbPatch.raw = patch.raw
  if (patch.isRecurring !== undefined) dbPatch.is_recurring = patch.isRecurring

  if (Object.keys(dbPatch).length === 0) return

  const { error } = await supabase
    .from('transactions')
    .update(dbPatch)
    .eq('id', id)
  if (error) throw new Error(error.message)
}
