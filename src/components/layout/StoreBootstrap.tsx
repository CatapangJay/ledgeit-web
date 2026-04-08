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
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        loadTransactions(user.id)
        loadBudgetLimits(user.id)
      }
    })
  }, [supabase, setUserId, loadTransactions, loadBudgetLimits])

  return null
}
