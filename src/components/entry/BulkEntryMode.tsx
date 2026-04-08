'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, CheckCircle } from '@phosphor-icons/react'
import { parseTransaction } from '@/lib/parser'
import { categorize, getMerchantKey } from '@/lib/categorizer'
import { resolveMerchant } from '@/lib/fuzzy'
import { useStore } from '@/lib/store'
import { PHOSPHOR_ICON_MAP } from '@/lib/iconMap'
import { formatCurrency } from '@/lib/formatters'
import { CATEGORIES } from '@/types'
import type { Transaction, Category, CategoryId } from '@/types'

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
}

// ─── Splitting Logic ──────────────────────────────────────────────────────────

/**
 * Splits freeform multi-entry text into individual entry strings.
 * Delimiters: newline, semicolon, and comma (when NOT between digits — avoids splitting "1,500").
 */
function splitEntries(text: string): string[] {
  const segments: string[] = []
  for (const line of text.split(/[\n;]/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    // Comma-split only when the comma is NOT preceded and followed by digits
    for (const part of trimmed.split(/,(?!\d)/)) {
      const t = part.trim()
      if (t) segments.push(t)
    }
  }
  return segments
}

// ─── Category Picker (inline panel) ──────────────────────────────────────────

interface CategoryPickerProps {
  currentId: CategoryId
  onSelect: (cat: Category) => void
  onClose: () => void
}

function CategoryPicker({ currentId, onSelect, onClose }: CategoryPickerProps) {
  return (
    <motion.div
      key="cat-picker"
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="rounded-2xl border border-ledge-border bg-ledge-surface p-3"
    >
      <div className="mb-2.5 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-ledge-muted">
          Change category
        </span>
        <button
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded-full text-ledge-muted transition-colors hover:bg-ledge-surface2 hover:text-ledge-data"
          aria-label="Close category picker"
        >
          <X size={11} weight="bold" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {CATEGORIES.map((cat) => {
          const Icon = PHOSPHOR_ICON_MAP[cat.icon]
          const active = cat.id === currentId
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat)}
              className={`flex flex-col items-center gap-1 rounded-xl py-2.5 text-[10px] font-medium transition-colors ${
                active
                  ? `${cat.bgColor} ${cat.color}`
                  : 'text-ledge-muted hover:bg-ledge-surface2 hover:text-ledge-data'
              }`}
            >
              {Icon && (
                <Icon size={15} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
              )}
              <span className="leading-none">{cat.label.split(/[\s&]/)[0]}</span>
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  onAllLogged: () => void
  onDiscard: () => void
}

const BULK_PLACEHOLDER = 'mcdo 150\ngrab 85; netflix 649\nmeralco bill 1,740'

export default function BulkEntryMode({ onAllLogged, onDiscard }: Props) {
  const addTransaction = useStore((s) => s.addTransaction)
  const learnCategory = useStore((s) => s.learnCategory)
  const learnedMerchants = useStore((s) => s.learnedMerchants)
  const transactions = useStore((s) => s.transactions)

  // History merchants for fuzzy resolution
  const historyMerchants = useMemo(() => {
    const freq = new Map<string, number>()
    for (const tx of transactions) {
      if (tx.merchant && tx.merchant !== 'Unknown') {
        freq.set(tx.merchant, (freq.get(tx.merchant) ?? 0) + 1)
      }
    }
    return [...freq.entries()].map(([name, freq]) => ({ name, freq }))
  }, [transactions])
  const [text, setText] = useState('')
  const [entries, setEntries] = useState<BulkEntry[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [categoryEditId, setCategoryEditId] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  const handleChange = useCallback(
    (val: string) => {
      setText(val)
      if (timerRef.current) clearTimeout(timerRef.current)
      if (!val.trim()) {
        setEntries([])
        setIsParsing(false)
        return
      }
      setIsParsing(true)
      timerRef.current = setTimeout(() => {
        const rawSegs = splitEntries(val)
        const parsed: BulkEntry[] = rawSegs.map((raw, i) => {
          const draft = parseTransaction(raw)
          const { category, confidence } = categorize(draft, learnedMerchants)
          // Silent fuzzy merchant resolution
          const resolvedMerchant = resolveMerchant(draft.merchant, historyMerchants)
          return {
            id: `bulk-${Date.now()}-${i}`,
            raw,
            amount: draft.amount,
            merchant: resolvedMerchant ?? draft.merchant,
            date: draft.date,
            type: draft.type,
            category,
            confidence,
            logged: false,
          }
        })
        setEntries(parsed)
        setIsParsing(false)
      }, 450)
    },
    [learnedMerchants, historyMerchants],
  )

  const logEntry = useCallback(
    (id: string) => {
      setEntries((prev) => {
        const entry = prev.find((e) => e.id === id)
        if (!entry || entry.amount === null) return prev
        const tx: Transaction = {
          id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          raw: entry.raw,
          amount: entry.amount,
          merchant: entry.merchant,
          category: entry.category,
          date: entry.date,
          type: entry.type,
          confidence: entry.confidence,
          createdAt: new Date().toISOString(),
        }
        addTransaction(tx)
        const updated = prev.map((e) => (e.id === id ? { ...e, logged: true } : e))
        const valid = updated.filter((e) => e.amount !== null)
        if (valid.length > 0 && valid.every((e) => e.logged)) {
          setTimeout(onAllLogged, 700)
        }
        return updated
      })
    },
    [addTransaction, onAllLogged],
  )

  const logAll = useCallback(() => {
    setEntries((prev) => {
      const toLog = prev.filter((e) => !e.logged && e.amount !== null)
      if (toLog.length === 0) return prev
      toLog.forEach((entry, idx) => {
        addTransaction({
          id: `tx-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
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
      const updated = prev.map((e) => (e.amount !== null ? { ...e, logged: true } : e))
      setTimeout(onAllLogged, 700)
      return updated
    })
  }, [addTransaction, onAllLogged])

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    setCategoryEditId((cur) => (cur === id ? null : cur))
  }, [])

  const changeCategory = useCallback((entryId: string, cat: Category) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e
        // Persist correction so future entries benefit from it
        const draft = parseTransaction(e.raw)
        learnCategory(getMerchantKey(draft), cat.id)
        // Sync type with category: income category → income type, else expense
        const newType = cat.id === 'income' ? 'income' : 'expense'
        return { ...e, category: cat, type: newType }
      }),
    )
    setCategoryEditId(null)
  }, [learnCategory])

  const validPending = entries.filter((e) => e.amount !== null && !e.logged)
  const loggedCount = entries.filter((e) => e.logged).length
  const activeCatEntry = entries.find((e) => e.id === categoryEditId)

  return (
    <div className="flex flex-col gap-3">
      {/* Textarea */}
      <div>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={BULK_PLACEHOLDER}
          aria-label="Enter multiple transactions, one per line"
          rows={4}
          className="w-full resize-none rounded-2xl border border-ledge-border bg-ledge-surface2 px-4 py-3 text-sm leading-relaxed text-ledge-data caret-ledge-accent outline-none transition-colors placeholder:text-ledge-border focus:border-ledge-muted"
        />
        <p className="mt-1 font-mono text-[10px] text-ledge-muted">
          Separate entries with a new line,{' '}
          <code className="rounded bg-ledge-surface2 px-0.5 text-ledge-data">;</code> or{' '}
          <code className="rounded bg-ledge-surface2 px-0.5 text-ledge-data">,</code>
          {' '}— format: description + amount
        </p>
      </div>

      {/* Identifying entries pulse */}
      <AnimatePresence>
        {isParsing && (
          <motion.p
            key="bulk-parsing"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.9, 0.3] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            className="font-mono text-xs text-ledge-muted"
          >
            Identifying entries…
          </motion.p>
        )}
      </AnimatePresence>

      {/* Entry list */}
      <AnimatePresence>
        {entries.length > 0 && !isParsing && (
          <motion.div
            key="entry-list"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="flex flex-col gap-2"
          >
            {/* Count header */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-ledge-muted">
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'} found
              </span>
              <AnimatePresence>
                {loggedCount > 0 && (
                  <motion.span
                    key="logged-count"
                    initial={{ opacity: 0, x: 4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1 font-mono text-[10px] text-emerald-400"
                  >
                    <CheckCircle size={11} weight="fill" aria-hidden="true" />
                    {loggedCount} logged
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Entry rows */}
            <AnimatePresence mode="popLayout">
              {entries.map((entry) => {
                const isValid = entry.amount !== null
                const isEditingCat = categoryEditId === entry.id
                return (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: entry.logged ? 0.5 : 1, x: 0 }}
                    exit={{ opacity: 0, x: 10, transition: { duration: 0.15 } }}
                    transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                    className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 transition-colors ${
                      entry.logged
                        ? 'border-emerald-500/20 bg-emerald-950/15'
                        : isEditingCat
                        ? 'border-ledge-accent/40 bg-ledge-surface2'
                        : 'border-ledge-border bg-ledge-surface2'
                    }`}
                  >
                    {/* Amount */}
                    <span
                      className={`shrink-0 font-mono text-[13px] font-semibold tabular-nums ${
                        entry.type === 'income' || entry.logged
                          ? 'text-emerald-400'
                          : isValid
                          ? 'text-ledge-data'
                          : 'text-ledge-muted'
                      }`}
                    >
                      {isValid ? formatCurrency(entry.amount!) : '—'}
                    </span>

                    {/* Merchant / description */}
                    <span className="min-w-0 flex-1 truncate text-xs text-ledge-data">
                      {entry.merchant && entry.merchant !== 'Unknown'
                        ? entry.merchant
                        : entry.raw}
                    </span>

                    {/* Category pill (clickable to edit) */}
                    {!entry.logged && (
                      <button
                        onClick={() =>
                          isValid &&
                          setCategoryEditId((cur) => (cur === entry.id ? null : entry.id))
                        }
                        disabled={!isValid}
                        aria-label={`Category: ${entry.category.label}. Tap to change`}
                        className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium leading-none transition-all disabled:opacity-30 ${entry.category.bgColor} ${entry.category.color} ${
                          isEditingCat ? 'ring-1 ring-ledge-accent/60' : ''
                        }`}
                      >
                        {entry.category.label.split(/[\s&]/)[0]}
                        <span className="ml-0.5 opacity-50">▾</span>
                      </button>
                    )}

                    {/* Logged checkmark */}
                    {entry.logged && (
                      <CheckCircle
                        size={14}
                        weight="fill"
                        className="shrink-0 text-emerald-400"
                        aria-label="Logged"
                      />
                    )}

                    {/* Confirm (log) button */}
                    {!entry.logged && (
                      <motion.button
                        onClick={() => isValid && logEntry(entry.id)}
                        disabled={!isValid}
                        aria-label="Confirm and log entry"
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ledge-accent text-[#0A0A0F] disabled:opacity-25"
                        whileTap={{ scale: 0.85 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      >
                        <Check size={11} weight="bold" aria-hidden="true" />
                      </motion.button>
                    )}

                    {/* Remove button */}
                    {!entry.logged && (
                      <motion.button
                        onClick={() => removeEntry(entry.id)}
                        aria-label="Remove this entry"
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ledge-muted transition-colors hover:bg-ledge-surface hover:text-ledge-data"
                        whileTap={{ scale: 0.85 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      >
                        <X size={10} weight="bold" aria-hidden="true" />
                      </motion.button>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {/* Inline category picker */}
            <AnimatePresence>
              {categoryEditId && activeCatEntry && (
                <CategoryPicker
                  key={`picker-${categoryEditId}`}
                  currentId={activeCatEntry.category.id}
                  onSelect={(cat) => changeCategory(categoryEditId, cat)}
                  onClose={() => setCategoryEditId(null)}
                />
              )}
            </AnimatePresence>

            {/* Log All button — shown when 2+ valid unlogged entries */}
            <AnimatePresence>
              {validPending.length > 1 && (
                <motion.button
                  key="log-all"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                  onClick={logAll}
                  className="mt-1 w-full rounded-2xl bg-ledge-accent py-3.5 text-sm font-semibold text-[#0A0A0F]"
                  whileTap={{ scale: 0.97 }}
                >
                  Log All {validPending.length} Entries
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discard */}
      <button
        onClick={onDiscard}
        className="w-full rounded-2xl border border-ledge-border py-4 text-sm text-ledge-muted transition-colors hover:border-ledge-muted hover:text-ledge-data active:scale-[0.97]"
      >
        Discard
      </button>
    </div>
  )
}
