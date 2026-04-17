'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/lib/store'
import OnboardingBudgetSetup from '@/components/budget/OnboardingBudgetSetup'

/**
 * Bootstraps the Zustand store on the client after auth is confirmed.
 * Also renders the first-time budget setup onboarding overlay.
 */
export default function StoreBootstrap() {
  const setUserId = useStore((s) => s.setUserId)
  const loadTransactions = useStore((s) => s.loadTransactions)
  const loadBudgetAllocations = useStore((s) => s.loadBudgetAllocations)
  const loadIncomeAllocations = useStore((s) => s.loadIncomeAllocations)
  const loadCustomCategories = useStore((s) => s.loadCustomCategories)
  const supabase = useRef(createClient()).current

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

  return <OnboardingBudgetSetup />
}
