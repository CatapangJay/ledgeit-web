import { createClient } from '@/lib/supabase/client'

// Per-user preferences (one row per user). Currently just the hidden preset
// categories. A hidden preset is removed from pickers, budget rows, and filters,
// but historical transactions keep their category_id. Custom categories are
// deleted via customCategories.ts instead of hidden here.

interface UserSettingsRow {
  user_id: string
  hidden_categories: string[] | null
  updated_at: string
}

/** The current user's hidden preset category ids (empty if no settings row yet). */
export async function fetchHiddenCategories(userId: string): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('user_settings')
    .select('hidden_categories')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as Pick<UserSettingsRow, 'hidden_categories'> | null)?.hidden_categories ?? []
}

/** Persist the full hidden-category set for a user (whole-array upsert). */
export async function saveHiddenCategories(userId: string, hidden: string[]): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('user_settings')
    .upsert(
      { user_id: userId, hidden_categories: hidden, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  if (error) throw new Error(error.message)
}
