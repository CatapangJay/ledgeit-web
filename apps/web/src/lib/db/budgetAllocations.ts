import { createClient } from '@/lib/supabase/client'
import type { BudgetAllocation, BudgetAllocationItem, CategoryId } from '@/types'

// ── DB row shapes ──────────────────────────────────────────────────────────────

interface AllocationRow {
  id: string
  user_id: string
  name: string
  is_active: boolean
  created_at: string
  budget_allocation_items: AllocationItemRow[]
}

interface AllocationItemRow {
  id: string
  allocation_id: string
  category_id: string
  limit_amount: number
}

// ── Mapping ────────────────────────────────────────────────────────────────────

function rowToAllocation(row: AllocationRow): BudgetAllocation {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active,
    createdAt: row.created_at,
    items: row.budget_allocation_items.map((item) => ({
      categoryId: item.category_id as CategoryId,
      limit: Number(item.limit_amount),
    })),
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Fetch all allocations (with nested items) for a user, newest-first. */
export async function fetchBudgetAllocations(
  userId: string
): Promise<BudgetAllocation[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('budget_allocations')
    .select('*, budget_allocation_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as AllocationRow[]).map(rowToAllocation)
}

/**
 * Create a new allocation.
 * If this is the user's first allocation, it will be set as active automatically.
 */
export async function createBudgetAllocation(
  userId: string,
  name: string,
  items: BudgetAllocationItem[]
): Promise<BudgetAllocation> {
  const supabase = createClient()

  // Count existing allocations to decide if this should be active
  const { count } = await supabase
    .from('budget_allocations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  const isFirst = (count ?? 0) === 0

  // Insert the allocation header
  const { data: allocData, error: allocError } = await supabase
    .from('budget_allocations')
    .insert({ user_id: userId, name, is_active: isFirst })
    .select('id, user_id, name, is_active, created_at')
    .single()

  if (allocError) throw new Error(allocError.message)

  // Insert items
  if (items.length > 0) {
    const { error: itemsError } = await supabase
      .from('budget_allocation_items')
      .insert(
        items.map((item) => ({
          allocation_id: allocData.id,
          category_id: item.categoryId,
          limit_amount: item.limit,
        }))
      )
    if (itemsError) throw new Error(itemsError.message)
  }

  return {
    id: allocData.id,
    name: allocData.name,
    isActive: allocData.is_active,
    createdAt: allocData.created_at,
    items,
  }
}

/**
 * Update an existing allocation's name and replace all its items.
 */
export async function updateBudgetAllocation(
  allocationId: string,
  name: string,
  items: BudgetAllocationItem[]
): Promise<void> {
  const supabase = createClient()

  // Update name
  const { error: nameError } = await supabase
    .from('budget_allocations')
    .update({ name })
    .eq('id', allocationId)

  if (nameError) throw new Error(nameError.message)

  // Delete existing items then re-insert
  const { error: deleteError } = await supabase
    .from('budget_allocation_items')
    .delete()
    .eq('allocation_id', allocationId)

  if (deleteError) throw new Error(deleteError.message)

  if (items.length > 0) {
    const { error: insertError } = await supabase
      .from('budget_allocation_items')
      .insert(
        items.map((item) => ({
          allocation_id: allocationId,
          category_id: item.categoryId,
          limit_amount: item.limit,
        }))
      )
    if (insertError) throw new Error(insertError.message)
  }
}

/**
 * Set one allocation as active; clear all others for the user.
 * Sequential (not atomic) — acceptable for a personal finance app.
 */
export async function activateBudgetAllocation(
  userId: string,
  allocationId: string
): Promise<void> {
  const supabase = createClient()

  // Clear all active flags for this user
  const { error: clearError } = await supabase
    .from('budget_allocations')
    .update({ is_active: false })
    .eq('user_id', userId)

  if (clearError) throw new Error(clearError.message)

  // Set target as active
  const { error: setError } = await supabase
    .from('budget_allocations')
    .update({ is_active: true })
    .eq('id', allocationId)

  if (setError) throw new Error(setError.message)
}

/**
 * Delete an allocation (items cascade).
 * Returns the id of the allocation that should now be active (if any),
 * i.e. the most recently created remaining allocation.
 */
export async function deleteBudgetAllocation(
  userId: string,
  allocationId: string,
  wasActive: boolean
): Promise<string | null> {
  const supabase = createClient()

  const { error } = await supabase
    .from('budget_allocations')
    .delete()
    .eq('id', allocationId)

  if (error) throw new Error(error.message)

  if (!wasActive) return null

  // Activate the most recently created remaining allocation
  const { data: remaining } = await supabase
    .from('budget_allocations')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)

  const nextId = remaining?.[0]?.id ?? null
  if (nextId) {
    await activateBudgetAllocation(userId, nextId)
  }
  return nextId
}
