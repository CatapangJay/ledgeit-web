'use client'

import { useEffect, useMemo, useRef } from 'react'
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
  const loadDebts = useStore((s) => s.loadDebts)
  const supabase = useMemo(() => createClient(), [])
  // Track the user we've already loaded data for. `onAuthStateChange` also fires
  // on TOKEN_REFRESHED and tab re-focus (and insertTransaction's getUser() can
  // trigger a refresh) — reloading on those would replace the store with a stale
  // DB snapshot, wiping optimistic entries just added. So only (re)load when the
  // signed-in user actually changes.
  const loadedUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null
      if (user) {
        if (loadedUserIdRef.current === user.id) return // same user — data already loaded
        loadedUserIdRef.current = user.id
        setUserId(user.id)
        // Load custom categories first so transaction resolution has them available
        await loadCustomCategories(user.id)
        loadTransactions(user.id)
        loadBudgetAllocations(user.id)
        loadIncomeAllocations(user.id)
        loadDebts(user.id)
      } else {
        loadedUserIdRef.current = null
        setUserId(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase, setUserId, loadTransactions, loadBudgetAllocations, loadIncomeAllocations, loadCustomCategories, loadDebts])

  return null
}
