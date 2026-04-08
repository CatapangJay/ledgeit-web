'use client'

import { useState, useEffect, useRef, useCallback, useId, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle } from '@phosphor-icons/react'
import { parseTransaction } from '@/lib/parser'
import { categorize, getMerchantKey } from '@/lib/categorizer'
import { getMerchantSuggestions, resolveMerchant } from '@/lib/fuzzy'
import { useStore } from '@/lib/store'
import ParsePreview from './ParsePreview'
import BulkEntryMode from './BulkEntryMode'
import type { MerchantSuggestion } from '@/lib/fuzzy'
import type { Transaction, TransactionDraft, Category } from '@/types'

const EXAMPLES = [
  '20 mcdonalds lunch',
  'grab 85 morning commute',
  'received 25000 salary',
  '1200 shopee haul',
  'netflix 649',
  'meralco bill 1740',
]

interface ParseResult {
  draft: TransactionDraft
  category: Category
  confidence: number
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function SmartEntrySheet({ open, onClose }: Props) {
  const labelId = useId()
  const [mode, setMode] = useState<'quick' | 'bulk'>('quick')
  const [input, setInput] = useState('')
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [merchantSuggestions, setMerchantSuggestions] = useState<MerchantSuggestion[]>([])
  const [rawMerchant, setRawMerchant] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [exampleIndex, setExampleIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const addTransaction = useStore((s) => s.addTransaction)
  const learnCategory = useStore((s) => s.learnCategory)
  const learnedMerchants = useStore((s) => s.learnedMerchants)
  const transactions = useStore((s) => s.transactions)

  // Derive history merchants (name + frequency) from logged transactions
  const historyMerchants = useMemo(() => {
    const freq = new Map<string, number>()
    for (const tx of transactions) {
      if (tx.merchant && tx.merchant !== 'Unknown') {
        freq.set(tx.merchant, (freq.get(tx.merchant) ?? 0) + 1)
      }
    }
    return [...freq.entries()].map(([name, freq]) => ({ name, freq }))
  }, [transactions])

  // Cycle placeholder examples
  useEffect(() => {
    const interval = setInterval(() => {
      setExampleIndex((i) => (i + 1) % EXAMPLES.length)
    }, 2800)
    return () => clearInterval(interval)
  }, [])

  // Reset and focus on open
  useEffect(() => {
    if (open) {
      setInput('')
      setParseResult(null)
      setMerchantSuggestions([])
      setSuccess(false)
      setIsAnalyzing(false)
      const t = setTimeout(() => textareaRef.current?.focus(), 120)
      return () => clearTimeout(t)
    }
  }, [open])

  // Debounced parsing
  const handleChange = useCallback(
    (val: string) => {
      setInput(val)
      if (timerRef.current) clearTimeout(timerRef.current)
      if (!val.trim()) {
        setParseResult(null)
        setMerchantSuggestions([])
        setRawMerchant(null)
        setIsAnalyzing(false)
        return
      }
      setIsAnalyzing(true)
      setParseResult(null)
      setMerchantSuggestions([])
      setRawMerchant(null)
      timerRef.current = setTimeout(() => {
        const draft = parseTransaction(val)
        const { category, confidence } = categorize(draft, learnedMerchants)

        // ── Fuzzy merchant resolution ──────────────────────────────────────────
        const suggestions = getMerchantSuggestions(draft.merchant, historyMerchants)
        const resolved = resolveMerchant(draft.merchant, historyMerchants)
        const wasResolved = resolved && resolved !== draft.merchant
        const resolvedDraft = resolved
          ? { ...draft, merchant: resolved }
          : draft
        // Alternatives: exclude the auto-applied name
        const altSuggestions = resolved
          ? suggestions.filter((s) => s.name !== resolved)
          : suggestions

        setRawMerchant(wasResolved ? draft.merchant : null)
        setParseResult({ draft: resolvedDraft, category, confidence })
        setMerchantSuggestions(altSuggestions.slice(0, 2))
        setIsAnalyzing(false)
      }, 400)
    },
    [learnedMerchants, historyMerchants],
  )

  const handleModeChange = useCallback((m: 'quick' | 'bulk') => {
    setMode(m)
    setSuccess(false)
    setInput('')
    setParseResult(null)
    setMerchantSuggestions([])
    setRawMerchant(null)
    setIsAnalyzing(false)
  }, [])

  const handleBulkComplete = useCallback(() => {
    setSuccess(true)
    const t = setTimeout(() => {
      onClose()
      setSuccess(false)
    }, 900)
    return () => clearTimeout(t)
  }, [onClose])

  const handleLog = useCallback(() => {
    if (!parseResult?.draft.amount) return
    const tx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      raw: parseResult.draft.raw,
      amount: parseResult.draft.amount,
      merchant: parseResult.draft.merchant,
      category: parseResult.category,
      date: parseResult.draft.date,
      type: parseResult.draft.type,
      confidence: parseResult.confidence,
      createdAt: new Date().toISOString(),
    }
    addTransaction(tx)
    setSuccess(true)
    const t = setTimeout(() => {
      onClose()
      setInput('')
      setParseResult(null)
      setSuccess(false)
    }, 1000)
    return () => clearTimeout(t)
  }, [parseResult, addTransaction, onClose])

  const canLog = !success && (parseResult?.draft.amount ?? null) !== null

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="sheet-backdrop"
            className="fixed inset-0 z-40 bg-black/65"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Bottom sheet */}
          <motion.div
            key="sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelId}
            className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[88dvh] flex-col rounded-t-[28px] border-t border-ledge-border bg-ledge-surface"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
          >
            {/* Drag handle bar */}
            <div className="flex justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-ledge-border" />
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-8 pt-2">
              {/* Header row */}
              <div className="mb-4 flex items-center justify-between">
                <span
                  id={labelId}
                  className="font-mono text-[11px] uppercase tracking-[0.18em] text-ledge-muted"
                >
                  Log Transaction
                </span>
                <motion.button
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-ledge-surface2 text-ledge-muted"
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <X size={14} weight="bold" aria-hidden="true" />
                </motion.button>
              </div>

              {/* Mode toggle */}
              <div className="mb-5 flex overflow-hidden rounded-2xl border border-ledge-border">
                {(['quick', 'bulk'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => handleModeChange(m)}
                    className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                      mode === m
                        ? 'bg-ledge-surface2 text-ledge-data'
                        : 'text-ledge-muted hover:text-ledge-data'
                    }`}
                  >
                    {m === 'quick' ? 'Quick Entry' : 'Multi-Entry'}
                  </button>
                ))}
              </div>

              {/* Bulk mode */}
              {mode === 'bulk' && !success && (
                <BulkEntryMode
                  onAllLogged={handleBulkComplete}
                  onDiscard={onClose}
                />
              )}

              {/* Bulk success flash */}
              {mode === 'bulk' && success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 py-6 text-sm font-medium text-emerald-400"
                >
                  <CheckCircle size={18} weight="fill" aria-hidden="true" />
                  All transactions logged
                </motion.div>
              )}

              {/* ── QUICK MODE ────────────────────────────── */}
              {mode === 'quick' && (
                <>
                  {/* Freeform text input */}
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder={`try: ${EXAMPLES[exampleIndex]}`}
                    aria-label="Describe your transaction in plain language"
                    rows={2}
                    className="w-full resize-none bg-transparent text-[1.6rem] font-light leading-snug text-ledge-data caret-ledge-accent outline-none placeholder:text-ledge-border"
                  />

                  {/* Analyzing pulse */}
                  <AnimatePresence>
                    {isAnalyzing && (
                      <motion.p
                        key="analyzing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0.3, 0.9, 0.3] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                        className="mt-2 font-mono text-xs text-ledge-muted"
                      >
                        Analyzing…
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {/* Merchant suggestion chips (fuzzy matches / alternatives) */}
                  <AnimatePresence>
                    {!isAnalyzing && parseResult && (
                      <motion.div
                        key="merchant-chips"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                        className="mt-2 flex flex-wrap items-center gap-1.5"
                      >
                        {/* "Use original" chip — shown when fuzzy correction was applied */}
                        {rawMerchant && (
                          <>
                            <span className="font-mono text-[10px] text-ledge-muted">Not right?</span>
                            <motion.button
                              key="use-original"
                              onClick={() => {
                                setParseResult((prev) =>
                                  prev ? { ...prev, draft: { ...prev.draft, merchant: rawMerchant } } : prev
                                )
                                setRawMerchant(null)
                              }}
                              className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-400 transition-colors hover:bg-amber-500/20 active:scale-[0.95]"
                              whileTap={{ scale: 0.93 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            >
                              Use: {rawMerchant}
                            </motion.button>
                          </>
                        )}
                        {/* Alt suggestions */}
                        {merchantSuggestions.length > 0 && (
                          <span className="font-mono text-[10px] text-ledge-muted">
                            {rawMerchant ? 'or:' : 'Also:'}
                          </span>
                        )}
                        {merchantSuggestions.map((s) => (
                          <motion.button
                            key={s.name}
                            onClick={() =>
                              setParseResult((prev) =>
                                prev
                                  ? { ...prev, draft: { ...prev.draft, merchant: s.name } }
                                  : prev,
                              )
                            }
                            className="rounded-full border border-ledge-border bg-ledge-surface2 px-2 py-0.5 font-mono text-[10px] text-ledge-muted transition-colors hover:border-ledge-accent/50 hover:text-ledge-data active:scale-[0.95]"
                            whileTap={{ scale: 0.93 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                          >
                            {s.name}
                            {s.source === 'history' && (
                              <span className="ml-1 opacity-50">♥</span>
                            )}
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Parse preview card */}
                  <AnimatePresence mode="wait">
                    {parseResult && !isAnalyzing && !success && (
                      <ParsePreview
                        key="preview"
                        draft={parseResult.draft}
                        category={parseResult.category}
                        confidence={parseResult.confidence}
                        onMerchantChange={(name) =>
                          setParseResult((prev) =>
                            prev ? { ...prev, draft: { ...prev.draft, merchant: name } } : prev
                          )
                        }
                        onCategoryChange={(cat) => {
                          const newType = cat.id === 'income' ? 'income' : 'expense'
                          setParseResult((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  category: cat,
                                  draft: { ...prev.draft, type: newType },
                                }
                              : prev,
                          )
                          // Persist the user's category correction for future inputs
                          if (parseResult?.draft) {
                            learnCategory(getMerchantKey(parseResult.draft), cat.id)
                          }
                        }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Success confirmation */}
                  <AnimatePresence>
                    {success && (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.94, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                        className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 py-4 text-sm font-medium text-emerald-400"
                      >
                        <CheckCircle size={18} weight="fill" aria-hidden="true" />
                        Transaction logged
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Action buttons */}
                  {!success && (
                    <div className="mt-5 flex gap-3">
                      <button
                        onClick={onClose}
                        className="flex-1 rounded-2xl border border-ledge-border py-4 text-sm text-ledge-muted transition-colors hover:border-ledge-muted hover:text-ledge-data active:scale-[0.97]"
                      >
                        Discard
                      </button>
                      <motion.button
                        onClick={handleLog}
                        disabled={!canLog}
                        aria-label="Log transaction"
                        className="flex-1 rounded-2xl bg-ledge-accent py-4 text-sm font-semibold text-[#0A0A0F] disabled:opacity-30"
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      >
                        Log Transaction
                      </motion.button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
