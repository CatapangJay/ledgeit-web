'use client'

import { useEffect, useMemo, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/lib/store'

/** Routes usable without a session — never redirect away from these. Mirrors the
 *  public-route list in lib/supabase/middleware.ts. */
function isPublicRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname.startsWith('/about') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth')
  )
}

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
  const loadHiddenCategories = useStore((s) => s.loadHiddenCategories)
  const loadDebts = useStore((s) => s.loadDebts)
  const loadWallets = useStore((s) => s.loadWallets)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const pathname = usePathname()
  // Keep the latest pathname readable inside the auth callback without
  // re-subscribing on every navigation.
  const pathnameRef = useRef(pathname)
  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])
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
        loadHiddenCategories(user.id)
        loadTransactions(user.id)
        loadBudgetAllocations(user.id)
        loadIncomeAllocations(user.id)
        loadDebts(user.id)
        loadWallets(user.id)
      } else {
        loadedUserIdRef.current = null
        setUserId(null)
        // Session ended in an already-open tab (expired refresh token, sign-out,
        // or the middleware's inactivity cap kicked in). If we're sitting on a
        // protected page, send the user to log in rather than leaving it empty.
        if (!isPublicRoute(pathnameRef.current)) {
          router.replace('/login?reason=expired')
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase, setUserId, loadTransactions, loadBudgetAllocations, loadIncomeAllocations, loadCustomCategories, loadHiddenCategories, loadDebts, loadWallets, router])

  return null
}
