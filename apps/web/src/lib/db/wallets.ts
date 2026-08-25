import { createClient } from '@/lib/supabase/client'
import type { Wallet, WalletKind, WalletMovement, WalletMovementType, WalletMovementSource } from '@/types'

// ── DB row shapes ──────────────────────────────────────────────────────────────

interface WalletRow {
  id: string
  user_id: string
  name: string
  kind: string
  icon: string
  color: string
  target: number | null
  note: string | null
  is_archived: boolean
  created_at: string
  wallet_movements: WalletMovementRow[]
}

interface WalletMovementRow {
  id: string
  wallet_id: string
  type: string
  amount: number
  date: string
  note: string | null
  source: string | null
  transaction_id: string | null
  created_at: string
}

// ── Mapping ────────────────────────────────────────────────────────────────────

function rowToMovement(row: WalletMovementRow): WalletMovement {
  return {
    id: row.id,
    type: row.type as WalletMovementType,
    amount: Number(row.amount),
    date: String(row.date).slice(0, 10),
    note: row.note ?? undefined,
    // Legacy rows (before the source column) are manual by definition.
    source: (row.source ?? 'manual') as WalletMovementSource,
    transactionId: row.transaction_id ?? undefined,
    createdAt: row.created_at,
  }
}

function rowToWallet(row: WalletRow): Wallet {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as WalletKind,
    icon: row.icon,
    color: row.color,
    target: row.target != null ? Number(row.target) : undefined,
    note: row.note ?? undefined,
    isArchived: row.is_archived,
    movements: (row.wallet_movements ?? [])
      .map(rowToMovement)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    createdAt: row.created_at,
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function fetchWallets(userId: string): Promise<Wallet[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('wallets')
    .select('*, wallet_movements(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as WalletRow[]).map(rowToWallet)
}

export async function createWallet(
  userId: string,
  payload: {
    name: string
    kind: WalletKind
    icon: string
    color: string
    target?: number
    note?: string
  }
): Promise<Wallet> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('wallets')
    .insert({
      user_id: userId,
      name: payload.name,
      kind: payload.kind,
      icon: payload.icon,
      color: payload.color,
      target: payload.target ?? null,
      note: payload.note ?? null,
    })
    .select('*, wallet_movements(*)')
    .single()
  if (error) throw new Error(error.message)
  return rowToWallet(data as WalletRow)
}

export async function patchWallet(
  walletId: string,
  patch: {
    name?: string
    kind?: WalletKind
    icon?: string
    color?: string
    target?: number | null
    note?: string | null
    isArchived?: boolean
  }
): Promise<void> {
  const supabase = createClient()
  const dbPatch: Record<string, unknown> = {}
  if (patch.name !== undefined) dbPatch.name = patch.name
  if (patch.kind !== undefined) dbPatch.kind = patch.kind
  if (patch.icon !== undefined) dbPatch.icon = patch.icon
  if (patch.color !== undefined) dbPatch.color = patch.color
  if (patch.target !== undefined) dbPatch.target = patch.target
  if (patch.note !== undefined) dbPatch.note = patch.note
  if (patch.isArchived !== undefined) dbPatch.is_archived = patch.isArchived
  if (Object.keys(dbPatch).length === 0) return

  const { error } = await supabase.from('wallets').update(dbPatch).eq('id', walletId)
  if (error) throw new Error(error.message)
}

export async function deleteWallet(walletId: string): Promise<void> {
  const supabase = createClient()
  // Movements cascade via ON DELETE CASCADE.
  const { error } = await supabase.from('wallets').delete().eq('id', walletId)
  if (error) throw new Error(error.message)
}

export async function insertWalletMovement(
  walletId: string,
  payload: {
    type: WalletMovementType
    amount: number
    date: string
    note?: string
    source?: WalletMovementSource
    transactionId?: string
  }
): Promise<WalletMovement> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('wallet_movements')
    .insert({
      wallet_id: walletId,
      type: payload.type,
      amount: payload.amount,
      date: payload.date,
      note: payload.note ?? null,
      source: payload.source ?? 'manual',
      transaction_id: payload.transactionId ?? null,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return rowToMovement(data as WalletMovementRow)
}

export async function deleteWalletMovement(movementId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('wallet_movements').delete().eq('id', movementId)
  if (error) throw new Error(error.message)
}
