'use client'

import { useState, useEffect, useRef, useCallback, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle } from '@phosphor-icons/react'
import { parseTransaction } from '@/lib/parser'
import { categorize } from '@/lib/categorizer'
import { useStore } from '@/lib/store'
import ParsePreview from './ParsePreview'
import type { Transaction, TransactionDraft, Category } from '@/types'

const EXAMPLES = [
  '$20 mcdonalds lunch',
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
  const [input, setInput] = useState('')
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [exampleIndex, setExampleIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const addTransaction = useStore((s) => s.addTransaction)

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
      setSuccess(false)
      setIsAnalyzing(false)
      const t = setTimeout(() => textareaRef.current?.focus(), 120)
      return () => clearTimeout(t)
    }
  }, [open])

  // Debounced parsing
  const handleChange = useCallback((val: string) => {
    setInput(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!val.trim()) {
      setParseResult(null)
      setIsAnalyzing(false)
      return
    }
    setIsAnalyzing(true)
    setParseResult(null)
    timerRef.current = setTimeout(() => {
      const draft = parseTransaction(val)
      const { category, confidence } = categorize(draft)
      setParseResult({ draft, category, confidence })
      setIsAnalyzing(false)
    }, 400)
  }, [])

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
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[28px] border-t border-ledge-border bg-ledge-surface"
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

            <div className="px-5 pb-8 pt-2">
              {/* Header row */}
              <div className="mb-5 flex items-center justify-between">
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

              {/* Parse preview card */}
              <AnimatePresence mode="wait">
                {parseResult && !isAnalyzing && !success && (
                  <ParsePreview
                    key="preview"
                    draft={parseResult.draft}
                    category={parseResult.category}
                    confidence={parseResult.confidence}
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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
