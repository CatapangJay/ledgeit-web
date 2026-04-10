import { createClient } from '@/lib/supabase/client'
import type { CustomCategory } from '@/types'

// ── DB row shape ──────────────────────────────────────────────────────────────

interface CustomCategoryRow {
  id: string
  user_id: string
  name: string
  icon: string
  text_color: string
  bg_color: string
  created_at: string
}

function rowToCustomCategory(row: CustomCategoryRow): CustomCategory {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    textColor: row.text_color,
    bgColor: row.bg_color,
    createdAt: row.created_at,
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchCustomCategories(userId: string): Promise<CustomCategory[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('custom_categories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as CustomCategoryRow[]).map(rowToCustomCategory)
}

export async function createCustomCategory(
  userId: string,
  name: string,
  icon: string,
  textColor: string,
  bgColor: string
): Promise<CustomCategory> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('custom_categories')
    .insert({ user_id: userId, name, icon, text_color: textColor, bg_color: bgColor })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return rowToCustomCategory(data as CustomCategoryRow)
}

export async function deleteCustomCategory(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('custom_categories').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
