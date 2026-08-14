import { createClient } from '@/lib/supabase/client'
import type { Debt, DebtDirection, DebtRepayment } from '@/types'

// ── DB row shapes ──────────────────────────────────────────────────────────────

interface DebtRow {
  id: string
  user_id: string
  person_name: string
  direction: string
  principal: number
  note: string | null
  is_settled: boolean
  due_date: string | null
  transaction_id: string | null
  created_at: string
  debt_repayments: DebtRepaymentRow[]
}

interface DebtRepaymentRow {
  id: string
  debt_id: string
  amount: number
  date: string
  transaction_id: string | null
  created_at: string
}

// ── Mapping ────────────────────────────────────────────────────────────────────

function rowToRepayment(row: DebtRepaymentRow): DebtRepayment {
  return {
    id: row.id,
    amount: Number(row.amount),
    date: String(row.date).slice(0, 10),
    transactionId: row.transaction_id ?? undefined,
    createdAt: row.created_at,
  }
}

function rowToDebt(row: DebtRow): Debt {
  return {
    id: row.id,
    personName: row.person_name,
    direction: row.direction as DebtDirection,
    principal: Number(row.principal),
    note: row.note ?? undefined,
    isSettled: row.is_settled,
    dueDate: row.due_date ? String(row.due_date).slice(0, 10) : undefined,
    transactionId: row.transaction_id ?? undefined,
    repayments: (row.debt_repayments ?? [])
      .map(rowToRepayment)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    createdAt: row.created_at,
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function fetchDebts(userId: string): Promise<Debt[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('debts')
    .select('*, debt_repayments(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as DebtRow[]).map(rowToDebt)
}

export async function createDebt(
  userId: string,
  payload: {
    personName: string
    direction: DebtDirection
    principal: number
    note?: string
    dueDate?: string
    transactionId?: string
  }
): Promise<Debt> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('debts')
    .insert({
      user_id: userId,
      person_name: payload.personName,
      direction: payload.direction,
      principal: payload.principal,
      note: payload.note ?? null,
      due_date: payload.dueDate ?? null,
      transaction_id: payload.transactionId ?? null,
    })
    .select('*, debt_repayments(*)')
    .single()
  if (error) throw new Error(error.message)
  return rowToDebt(data as DebtRow)
}

export async function insertDebtRepayment(
  debtId: string,
  payload: { amount: number; date: string; transactionId?: string }
): Promise<DebtRepayment> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('debt_repayments')
    .insert({
      debt_id: debtId,
      amount: payload.amount,
      date: payload.date,
      transaction_id: payload.transactionId ?? null,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return rowToRepayment(data as DebtRepaymentRow)
}

export async function patchDebt(
  debtId: string,
  patch: {
    personName?: string
    direction?: DebtDirection
    principal?: number
    note?: string | null
    dueDate?: string | null
  }
): Promise<void> {
  const supabase = createClient()
  const dbPatch: Record<string, unknown> = {}
  if (patch.personName !== undefined) dbPatch.person_name = patch.personName
  if (patch.direction !== undefined) dbPatch.direction = patch.direction
  if (patch.principal !== undefined) dbPatch.principal = patch.principal
  if (patch.note !== undefined) dbPatch.note = patch.note
  if (patch.dueDate !== undefined) dbPatch.due_date = patch.dueDate
  if (Object.keys(dbPatch).length === 0) return

  const { error } = await supabase.from('debts').update(dbPatch).eq('id', debtId)
  if (error) throw new Error(error.message)
}

export async function setDebtSettled(debtId: string, settled: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('debts')
    .update({ is_settled: settled })
    .eq('id', debtId)
  if (error) throw new Error(error.message)
}

export async function deleteDebt(debtId: string): Promise<void> {
  const supabase = createClient()
  // Repayments cascade via ON DELETE CASCADE.
  const { error } = await supabase.from('debts').delete().eq('id', debtId)
  if (error) throw new Error(error.message)
}
