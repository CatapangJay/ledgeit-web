import { createClient } from '@/lib/supabase/client'
import type { IncomeAllocation, IncomeAllocationItem } from '@/types'

// ── DB row shapes ──────────────────────────────────────────────────────────────

interface IncomeAllocationRow {
  id: string
  user_id: string
  name: string
  is_active: boolean
  created_at: string
  income_allocation_items: IncomeAllocationItemRow[]
}

interface IncomeAllocationItemRow {
  id: string
  allocation_id: string
  source_id: string
  amount: number
}

// ── Mapping ────────────────────────────────────────────────────────────────────

function rowToAllocation(row: IncomeAllocationRow): IncomeAllocation {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active,
    createdAt: row.created_at,
    items: row.income_allocation_items.map((item) => ({
      sourceId: item.source_id,
      amount: Number(item.amount),
    })),
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Fetch all income allocations (with nested items) for a user, newest-first. */
export async function fetchIncomeAllocations(
  userId: string
): Promise<IncomeAllocation[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('income_allocations')
    .select('*, income_allocation_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as IncomeAllocationRow[]).map(rowToAllocation)
}

/**
 * Create a new income allocation.
 * If this is the user's first, it is automatically set as active.
 */
export async function createIncomeAllocation(
  userId: string,
  name: string,
  items: IncomeAllocationItem[]
): Promise<IncomeAllocation> {
  const supabase = createClient()

  const { count } = await supabase
    .from('income_allocations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  const isFirst = (count ?? 0) === 0

  const { data: allocData, error: allocError } = await supabase
    .from('income_allocations')
    .insert({ user_id: userId, name, is_active: isFirst })
    .select('id, user_id, name, is_active, created_at')
    .single()

  if (allocError) throw new Error(allocError.message)

  const filteredItems = items.filter((i) => i.amount > 0)
  if (filteredItems.length > 0) {
    const { error: itemsError } = await supabase
      .from('income_allocation_items')
      .insert(
        filteredItems.map((item) => ({
          allocation_id: allocData.id,
          source_id: item.sourceId,
          amount: item.amount,
        }))
      )
    if (itemsError) throw new Error(itemsError.message)
  }

  return {
    id: allocData.id,
    name: allocData.name,
    isActive: allocData.is_active,
    createdAt: allocData.created_at,
    items: filteredItems,
  }
}

/** Update an existing income allocation's name and replace all its items. */
export async function updateIncomeAllocation(
  allocationId: string,
  name: string,
  items: IncomeAllocationItem[]
): Promise<void> {
  const supabase = createClient()

  const { error: nameError } = await supabase
    .from('income_allocations')
    .update({ name })
    .eq('id', allocationId)
  if (nameError) throw new Error(nameError.message)

  const { error: deleteError } = await supabase
    .from('income_allocation_items')
    .delete()
    .eq('allocation_id', allocationId)
  if (deleteError) throw new Error(deleteError.message)

  const filteredItems = items.filter((i) => i.amount > 0)
  if (filteredItems.length > 0) {
    const { error: insertError } = await supabase
      .from('income_allocation_items')
      .insert(
        filteredItems.map((item) => ({
          allocation_id: allocationId,
          source_id: item.sourceId,
          amount: item.amount,
        }))
      )
    if (insertError) throw new Error(insertError.message)
  }
}

/** Set one income allocation as active, deactivating all others for this user. */
export async function activateIncomeAllocation(
  userId: string,
  allocationId: string
): Promise<void> {
  const supabase = createClient()

  const { error: deactivateError } = await supabase
    .from('income_allocations')
    .update({ is_active: false })
    .eq('user_id', userId)
  if (deactivateError) throw new Error(deactivateError.message)

  const { error: activateError } = await supabase
    .from('income_allocations')
    .update({ is_active: true })
    .eq('id', allocationId)
  if (activateError) throw new Error(activateError.message)
}

/** Delete an income allocation (items cascade). */
export async function deleteIncomeAllocation(
  allocationId: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('income_allocations')
    .delete()
    .eq('id', allocationId)
  if (error) throw new Error(error.message)
}
