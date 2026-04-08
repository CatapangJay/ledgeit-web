'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/lib/store'

/**
 * Bootstraps the Zustand store on the client after auth is confirmed.
 * Renders nothing — place once in the root layout.
 */
export default function StoreBootstrap() {
  const setUserId = useStore((s) => s.setUserId)
  const loadTransactions = useStore((s) => s.loadTransactions)
  const loadBudgetLimits = useStore((s) => s.loadBudgetLimits)
  const supabase = useRef(createClient()).current

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null
      if (user) {
        setUserId(user.id)
        loadTransactions(user.id)
        loadBudgetLimits(user.id)
      } else {
        setUserId(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase, setUserId, loadTransactions, loadBudgetLimits])

  return null
}
