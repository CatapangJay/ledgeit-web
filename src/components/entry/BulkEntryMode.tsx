'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle } from '@phosphor-icons/react'
import { parseTransaction } from '@/lib/parser'
import { categorize, getMerchantKey } from '@/lib/categorizer'
import { resolveMerchant } from '@/lib/fuzzy'
import { useStore } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/formatters'
import ParsePreview from './ParsePreview'
import { CATEGORIES } from '@/types'
import type { Transaction, Category } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BulkEntry {
  id: string
  raw: string
  amount: number | null
  merchant: string
  date: string
  type: 'expense' | 'income'
  category: Category
  confidence: number
  logged: boolean
  /** Whether this entry is ticked for inclusion when "Log All" is pressed */
  selected: boolean
}

// ─── Splitting Logic ──────────────────────────────────────────────────────────

function splitEntries(text: string): string[] {
  const segments: string[] = []
  for (const line of text.split(/[\n;]/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    for (const part of trimmed.split(/,(?!\d)/)) {
      const t = part.trim()
      if (t) segments.push(t)
    }
  }
  return segments
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  onAllLogged: () => void
  onDiscard: () => void
  logAllRef: React.MutableRefObject<(() => void) | null>
  onValidCountChange: (count: number) => void
  initialText?: string
  onTextChange?: (text: string) => void
}

const BULK_PLACEHOLDER = `mcdo 150
grab 85
netflix 649
meralco bill 1,740`

export default function BulkEntryMode({ onAllLogged, logAllRef, onValidCountChange, initialText = '', onTextChange }: Props) {
  const addTransaction = useStore((s) => s.addTransaction)
  const learnCategory = useStore((s) => s.learnCategory)
  const learnedMerchants = useStore((s) => s.learnedMerchants)
  const transactions = useStore((s) => s.transactions)
  const customCategories = useStore((s) => s.customCategories)

  const historyMerchants = useMemo(() => {
    const freq = new Map<string, number>()
    for (const tx of transactions) {
      if (tx.merchant && tx.merchant !== 'Unknown')
        freq.set(tx.merchant, (freq.get(tx.merchant) ?? 0) + 1)
    }
    return [...freq.entries()].map(([name, freq]) => ({ name, freq }))
  }, [transactions])

  const [text, setText] = useState(initialText)
  const [entries, setEntries] = useState<BulkEntry[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Stable entry pool keyed by raw text — prevents re-parsing unchanged lines
  const stablePoolRef = useRef<Map<string, BulkEntry[]>>(new Map())

  // Focus textarea on mount; trigger initial parse if text was pre-populated
  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (initialText.trim()) {
      handleChange(initialText)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const parseSegment = useCallback((raw: string, i: number): BulkEntry => {
    const draft = parseTransaction(raw)
    const { category, confidence } = categorize(draft, learnedMerchants)
    const resolvedMerchant = resolveMerchant(draft.merchant, historyMerchants)
    return {
      id: `bulk-${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`,
      raw,
      amount: draft.amount,
      merchant: resolvedMerchant ?? draft.merchant,
      date: draft.date,
      type: draft.type,
      category,
      confidence,
      logged: false,
      selected: true,
    }
  }, [learnedMerchants, historyMerchants])

  const handleChange = useCallback((val: string) => {
    setText(val)
    onTextChange?.(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!val.trim()) {
      setEntries([])
      stablePoolRef.current.clear()
      setIsParsing(false)
      return
    }
    setIsParsing(true)
    timerRef.current = setTimeout(() => {
      const rawSegs = splitEntries(val)

      // Build a consumption pool from the current stable set
      // (so identical raws are reused in order, avoids re-parsing unchanged lines)
      const pool = new Map<string, BulkEntry[]>()
      for (const e of stablePoolRef.current.values()) {
        for (const entry of e) {
          const arr = pool.get(entry.raw) ?? []
          arr.push({ ...entry }) // shallow copy to avoid mutation
          pool.set(entry.raw, arr)
        }
      }
      // Also pull from current entries (covers in-flight edits / category changes)
      setEntries((prev) => {
        const prevPool = new Map<string, BulkEntry[]>()
        for (const e of prev) {
          const arr = prevPool.get(e.raw) ?? []
          arr.push(e)
          prevPool.set(e.raw, arr)
        }

        const next: BulkEntry[] = rawSegs.map((raw, i) => {
          const bucket = prevPool.get(raw)
          if (bucket && bucket.length > 0) {
            return bucket.shift()! // reuse existing entry untouched
          }
          return parseSegment(raw, i) // parse fresh only for new/changed segments
        })

        // Rebuild stable pool
        const newPool = new Map<string, BulkEntry[]>()
        for (const e of next) {
          const arr = newPool.get(e.raw) ?? []
          arr.push(e)
          newPool.set(e.raw, arr)
        }
        stablePoolRef.current = newPool

        return next
      })

      setIsParsing(false)
    }, 380)
  }, [parseSegment])

  const toggleSelect = useCallback((id: string) => {
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, selected: !e.selected } : e))
  }, [])

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id)
      // Rebuild stable pool
      const newPool = new Map<string, BulkEntry[]>()
      for (const e of next) {
        const arr = newPool.get(e.raw) ?? []
        arr.push(e)
        newPool.set(e.raw, arr)
      }
      stablePoolRef.current = newPool
      return next
    })
  }, [])

  const changeCategory = useCallback((entryId: string, cat: Category) => {
    const entry = entries.find((e) => e.id === entryId)
    if (entry) learnCategory(getMerchantKey(parseTransaction(entry.raw)), cat.id)
    const newType = cat.id === 'income' ? 'income' : 'expense'
    setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, category: cat, type: newType } : e))
  }, [entries, learnCategory])

  const changeMerchant = useCallback((entryId: string, name: string) => {
    setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, merchant: name } : e))
  }, [])

  const changeDate = useCallback((entryId: string, date: string) => {
    setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, date } : e))
  }, [])

  const changeType = useCallback((entryId: string, type: 'expense' | 'income') => {
    const incomeCategory = CATEGORIES.find((c) => c.id === 'income')!
    const otherCategory = CATEGORIES.find((c) => c.id === 'other')!
    setEntries((prev) => prev.map((e) => {
      if (e.id !== entryId) return e
      const autoCategory = type === 'income'
        ? incomeCategory
        : e.category.id === 'income' ? otherCategory : e.category
      return { ...e, type, category: autoCategory }
    }))
  }, [])

  // Log all SELECTED valid unlogged entries
  const logAll = useCallback(() => {
    const toLog = entries.filter((e) => e.selected && !e.logged && e.amount !== null)
    if (toLog.length === 0) return

    toLog.forEach((entry) => {
      addTransaction({
        id: crypto.randomUUID(),
        raw: entry.raw,
        amount: entry.amount!,
        merchant: entry.merchant,
        category: entry.category,
        date: entry.date,
        type: entry.type,
        confidence: entry.confidence,
        createdAt: new Date().toISOString(),
      })
    })

    setEntries((prev) =>
      prev.map((e) => (e.selected && e.amount !== null ? { ...e, logged: true } : e))
    )
    setTimeout(onAllLogged, 700)
  }, [entries, addTransaction, onAllLogged])

  // Count of selected+valid+unlogged
  const selectedValidCount = entries.filter((e) => e.selected && e.amount !== null && !e.logged).length
  const loggedCount = entries.filter((e) => e.logged).length

  useEffect(() => { onValidCountChange(selectedValidCount) }, [selectedValidCount, onValidCountChange])
  useEffect(() => { logAllRef.current = logAll }, [logAll, logAllRef])

  return (
    <div className="flex flex-col gap-4">
      {/* ── Textarea — same feel as Quick Entry ── */}
      <div>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={BULK_PLACEHOLDER}
          aria-label="Enter multiple transactions, one per line"
          rows={4}
          className="w-full resize-none bg-transparent text-[1.35rem] font-light leading-relaxed outline-none"
          style={{ color: '#191c1c', caretColor: '#1f695d' }}
        />
        <p className="mt-1 text-[11px] font-medium" style={{ color: '#6e9990' }}>
          One entry per line — or separate with{' '}
          <code className="rounded px-0.5" style={{ background: '#e7edeb', color: '#3f4946' }}>;</code>
        </p>
      </div>

      {/* Parsing pulse */}
      <AnimatePresence>
        {isParsing && (
          <motion.p
            key="bulk-parsing"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.9, 0.3] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            className="text-xs font-medium"
            style={{ color: '#6e9990' }}
          >
            Analyzing…
          </motion.p>
        )}
      </AnimatePresence>

      {/* Entry cards */}
      <AnimatePresence>
        {entries.length > 0 && (
          <motion.div
            key="entry-list"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="flex flex-col gap-2"
          >
            {/* Count row */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#3f4946' }}>
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'} detected
              </span>
              <AnimatePresence>
                {loggedCount > 0 && (
                  <motion.span
                    key="logged-badge"
                    initial={{ opacity: 0, x: 4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1 text-[11px] font-semibold"
                    style={{ color: '#1f6950' }}
                  >
                    <CheckCircle size={11} weight="fill" aria-hidden="true" />
                    {loggedCount} logged
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence mode="popLayout">
              {entries.map((entry) => (
                <ParsePreview
                  key={entry.id}
                  draft={{
                    raw: entry.raw,
                    amount: entry.amount,
                    merchant: entry.merchant,
                    date: entry.date,
                    type: entry.type,
                  }}
                  category={entry.category}
                  confidence={entry.confidence}
                  customCategories={customCategories}
                  selected={entry.selected}
                  logged={entry.logged}
                  onToggleSelect={() => toggleSelect(entry.id)}
                  onCategoryChange={(cat) => changeCategory(entry.id, cat)}
                  onMerchantChange={(name) => changeMerchant(entry.id, name)}
                  onDateChange={(date) => changeDate(entry.id, date)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

