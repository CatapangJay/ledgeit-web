'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'

// ─── Active-plan metadata ──────────────────────────────────────────────────────
// The store knows WHICH plan is active but not since WHEN. We persist the
// activation moment locally so the coach can gently remind a household that a
// temporary plan (e.g. "Vacation Mode") has been active for a while — without
// any silent, date-based auto-switching (which would be confusing).

const STORAGE_KEY = 'ledgeit:activePlan'

interface StoredMeta {
  id: string
  since: number // epoch ms
}

function read(): StoredMeta | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredMeta) : null
  } catch {
    return null
  }
}

function write(meta: StoredMeta) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meta))
  } catch {
    /* ignore quota / unavailable */
  }
}

export interface ActivePlanMeta {
  id: string | null
  name: string | null
  /** epoch ms when this plan became active on this device, or null if unknown */
  since: number | null
  /** whole days the active plan has been active, or 0 if unknown */
  activeDays: number
}

/**
 * Returns the active budget plan and how long it's been active.
 * Records the activation timestamp the first time a given plan id is seen
 * active, and resets it whenever the active plan changes.
 */
export function useActivePlanMeta(): ActivePlanMeta {
  const allocations = useStore((s) => s.budgetAllocations)
  const active = allocations.find((a) => a.isActive) ?? null
  const activeId = active?.id ?? null

  const [since, setSince] = useState<number | null>(null)

  useEffect(() => {
    if (!activeId) {
      setSince(null)
      return
    }
    const stored = read()
    if (stored && stored.id === activeId) {
      setSince(stored.since)
    } else {
      const now = Date.now()
      write({ id: activeId, since: now })
      setSince(now)
    }
  }, [activeId])

  const activeDays =
    since != null ? Math.floor((Date.now() - since) / 86_400_000) : 0

  return { id: activeId, name: active?.name ?? null, since, activeDays }
}
