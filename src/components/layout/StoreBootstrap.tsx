'use client'

import { useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/lib/store'
/**
 * Bootstraps the Zustand store on the client after auth is confirmed.
 * Renders nothing — onboarding is handled per-page (see dashboard/page.tsx).
 */
export default function StoreBootstrap() {
  const setUserId = useStore((s) => s.setUserId)
  const loadTransactions = useStore((s) => s.loadTransactions)
  const loadBudgetAllocations = useStore((s) => s.loadBudgetAllocations)
  const loadIncomeAllocations = useStore((s) => s.loadIncomeAllocations)
  const loadCustomCategories = useStore((s) => s.loadCustomCategories)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null
      if (user) {
        setUserId(user.id)
        // Load custom categories first so transaction resolution has them available
        await loadCustomCategories(user.id)
        loadTransactions(user.id)
        loadBudgetAllocations(user.id)
        loadIncomeAllocations(user.id)
      } else {
        setUserId(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase, setUserId, loadTransactions, loadBudgetAllocations, loadIncomeAllocations, loadCustomCategories])

  return null
}
