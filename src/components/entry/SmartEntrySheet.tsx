'use client'

import { useState, useEffect, useRef, useCallback, useId, useMemo } from 'react'
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import { X, CheckCircle, ArrowsOutSimple, ArrowsInSimple } from '@phosphor-icons/react'
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

// ─── Snap points ─────────────────────────────────────────────────────────────
const PARTIAL_FRACTION = 0.40 // 60% from top → 40% sheet height
const getPartialTopPx = () => Math.round(window.innerHeight * PARTIAL_FRACTION)
const getClosedTopPx = () => window.innerHeight

export default function SmartEntrySheet({ open, onClose }: Props) {
  const labelId = useId()
  const [mode, setMode] = useState<'quick' | 'bulk'>('quick')
  const [input, setInput] = useState('')
  const [bulkText, setBulkText] = useState('')
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
  const customCategories = useStore((s) => s.customCategories)

  // ── Drag / snap state ────────────────────────────────────────────────────
  const [sheetVisible, setSheetVisible] = useState(false)
  const [snapState, setSnapState] = useState<'partial' | 'full'>('partial')
  const isVisibleRef = useRef(false)
  const bulkLogAllRef = useRef<(() => void) | null>(null)
  const [bulkValidCount, setBulkValidCount] = useState(0)
  // `sheetTopPx` drives the sheet's `top` CSS property:
  //   0          → full screen
  //   ~12% of vh → partial (default)
  //   100% of vh → closed / off-screen
  const sheetTopPx = useMotionValue(800)

  const springCfg = { type: 'spring' as const, stiffness: 280, damping: 30 }

  // Open / close driven by the `open` prop
  useEffect(() => {
    if (open && !isVisibleRef.current) {
      isVisibleRef.current = true
      setSheetVisible(true)
      sheetTopPx.set(getClosedTopPx())
      requestAnimationFrame(() => {
        animate(sheetTopPx, getPartialTopPx(), springCfg)
        setSnapState('partial')
      })
    } else if (!open && isVisibleRef.current) {
      animate(sheetTopPx, getClosedTopPx(), {
        ...springCfg,
        onComplete: () => {
          isVisibleRef.current = false
          setSheetVisible(false)
        },
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // All close paths (X button, backdrop tap, drag-to-close) funnel through here
  const triggerClose = useCallback(() => {
    if (!isVisibleRef.current) return
    animate(sheetTopPx, getClosedTopPx(), {
      ...springCfg,
      onComplete: () => {
        isVisibleRef.current = false
        setSheetVisible(false)
        onClose()
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetTopPx, onClose])

  // Handle drag — move the sheet top live with the pointer
  const handleDrag = useCallback((_: unknown, info: PanInfo) => {
    const next = Math.max(0, Math.min(sheetTopPx.get() + info.delta.y, getClosedTopPx()))
    sheetTopPx.set(next)
  }, [sheetTopPx])

  // Handle drag end — snap to nearest point or close
  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    const current = sheetTopPx.get()
    const partialY = getPartialTopPx()
    const velocity = info.velocity.y

    if (velocity < -350 || current < partialY / 2) {
      // Expand to full screen
      animate(sheetTopPx, 0, springCfg)
      setSnapState('full')
    } else if (velocity > 500 || current > partialY + window.innerHeight * 0.14) {
      // Drag past close threshold → dismiss
      triggerClose()
    } else {
      // Snap back to partial
      animate(sheetTopPx, partialY, springCfg)
      setSnapState('partial')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetTopPx, triggerClose])

  // Toggle between snap states via the expand button
  const toggleSnap = useCallback(() => {
    if (snapState === 'partial') {
      animate(sheetTopPx, 0, springCfg)
      setSnapState('full')
    } else {
      animate(sheetTopPx, getPartialTopPx(), springCfg)
      setSnapState('partial')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapState, sheetTopPx])

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

  // Reset success state and focus on open (preserve input/parse state)
  useEffect(() => {
    if (open) {
      setSuccess(false)
      const t = setTimeout(() => {
        if (mode === 'quick') textareaRef.current?.focus()
      }, 120)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, [])

  const handleBulkComplete = useCallback(() => {
    setBulkText('')
    setSuccess(true)
    const t = setTimeout(() => {
      triggerClose()
      setSuccess(false)
    }, 900)
    return () => clearTimeout(t)
  }, [triggerClose])

  const handleLog = useCallback(() => {
    if (!parseResult?.draft.amount) return
    const tx: Transaction = {
      id: crypto.randomUUID(),
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
      triggerClose()
      setInput('')
      setParseResult(null)
      setSuccess(false)
    }, 1000)
    return () => clearTimeout(t)
  }, [parseResult, addTransaction, triggerClose])

  const canLog = !success && (parseResult?.draft.amount ?? null) !== null

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {sheetVisible && (
          <motion.div
            key="sheet-backdrop"
            className="fixed inset-0 z-40 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={triggerClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sheet — position controlled by sheetTopPx motion value */}
      {sheetVisible && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelId}
          className="fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden"
          style={{
            top: sheetTopPx,
            borderRadius: snapState === 'full' ? '0px' : '24px 24px 0px 0px',
            transition: 'border-radius 0.26s cubic-bezier(0.34, 1.56, 0.64, 1)',
            background: 'rgba(248,250,249,0.96)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 -8px 48px rgba(0,53,46,0.12)',
          }}
        >
          {/* ── Drag handle ───────────────────────────────────────────────── */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.08}
            dragMomentum={false}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            className="flex shrink-0 touch-none select-none cursor-grab items-center justify-between active:cursor-grabbing"
            style={{
              paddingTop: snapState === 'full' ? 'max(env(safe-area-inset-top), 16px)' : '12px',
              paddingBottom: '8px',
              paddingLeft: '20px',
              paddingRight: '20px',
            }}
          >
            {/* Expand / collapse button */}
            <motion.button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); toggleSnap() }}
              aria-label={snapState === 'full' ? 'Collapse sheet' : 'Expand sheet'}
              className="flex h-7 w-7 items-center justify-center rounded-full transition-colors"
              style={{ background: '#f0f4f2', color: '#6e9990' }}
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {snapState === 'full'
                ? <ArrowsInSimple size={13} weight="bold" aria-hidden="true" />
                : <ArrowsOutSimple size={13} weight="bold" aria-hidden="true" />}
            </motion.button>

            {/* Centre pill */}
            <motion.div
              className="rounded-full"
              animate={{ width: snapState === 'full' ? 28 : 40 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              style={{ height: 4, background: '#cde0db' }}
            />

            {/* Spacer to balance the expand button */}
            <div className="h-7 w-7" />
          </motion.div>

          {/* ── Pinned header + mode toggle — never scrolls away ────────── */}
          <div className="shrink-0 px-5 pt-1.5 pb-3" style={{ borderBottom: '1px solid #e7edeb' }}>
            <div className="mb-3 flex items-center justify-between">
              <span
                id={labelId}
                className="text-[15px] font-bold"
                style={{ color: '#00352e' }}
              >
                Smart Log
              </span>
              <motion.button
                onClick={triggerClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: '#f0f4f2', color: '#3f4946' }}
                whileTap={{ scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <X size={14} weight="bold" aria-hidden="true" />
              </motion.button>
            </div>
            <div className="flex rounded-xl p-1" style={{ background: '#f0f4f2' }}>
              {(['quick', 'bulk'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => handleModeChange(m)}
                  className="flex-1 py-2 text-[12px] font-semibold tracking-wide transition-all rounded-lg"
                  style={
                    mode === m
                      ? { background: '#ffffff', color: '#00352e', boxShadow: '0 2px 8px rgba(0,53,46,0.1)' }
                      : { background: 'transparent', color: '#6e9990' }
                  }
                >
                  {m === 'quick' ? 'Quick Entry' : 'Multi-Entry'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2">
              {/* Bulk mode */}
              {mode === 'bulk' && !success && (
                <BulkEntryMode
                  onAllLogged={handleBulkComplete}
                  onDiscard={triggerClose}
                  logAllRef={bulkLogAllRef}
                  onValidCountChange={setBulkValidCount}
                  initialText={bulkText}
                  onTextChange={setBulkText}
                />
              )}

              {/* Bulk success flash */}
              {mode === 'bulk' && success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  className="flex items-center justify-center gap-2 rounded-2xl py-6 text-sm font-semibold"
                  style={{ background: 'rgba(31,105,93,0.1)', color: '#1f6950' }}
                >
                  <CheckCircle size={18} weight="fill" aria-hidden="true" />
                  All transactions logged
                </motion.div>
              )}

              {/* ── QUICK MODE ────────────────────────────── */}
              {mode === 'quick' && (
                <>
                  {/* Freeform text input — grows with sheet height */}
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder={`try: ${EXAMPLES[exampleIndex]}`}
                    aria-label="Describe your transaction in plain language"
                    rows={snapState === 'full' ? 6 : 2}
                    className="w-full resize-none bg-transparent text-[1.6rem] font-light leading-snug outline-none transition-all"
                    style={{ color: '#191c1c', caretColor: '#1f695d' }}
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
                        className="mt-2 text-xs font-medium"
                        style={{ color: '#6e9990' }}
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
                            <span className="text-[11px] font-medium" style={{ color: '#6e9990' }}>Not right?</span>
                            <motion.button
                              key="use-original"
                              onClick={() => {
                                setParseResult((prev) =>
                                  prev ? { ...prev, draft: { ...prev.draft, merchant: rawMerchant } } : prev
                                )
                                setRawMerchant(null)
                              }}
                              className="px-3 py-0.5 text-[11px] font-semibold rounded-full transition-colors active:scale-[0.95]"
                              style={{ background: 'rgba(31,105,93,0.1)', color: '#1f695d', border: '1px solid rgba(31,105,93,0.2)' }}
                              whileTap={{ scale: 0.93 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            >
                              Use: {rawMerchant}
                            </motion.button>
                          </>
                        )}
                        {/* Alt suggestions */}
                        {merchantSuggestions.length > 0 && (
                          <span className="text-[11px] font-medium" style={{ color: '#6e9990' }}>
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
                            className="px-3 py-0.5 text-[11px] font-semibold rounded-full transition-colors active:scale-[0.95]"
                            style={{ background: '#f0f4f2', color: '#3f4946', border: '1px solid #e7edeb' }}
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
                        customCategories={customCategories}
                        onMerchantChange={(name) =>
                          setParseResult((prev) =>
                            prev ? { ...prev, draft: { ...prev.draft, merchant: name } } : prev
                          )
                        }
                        onCategoryChange={(cat) => {
                          const newType = cat.id === 'income' ? 'income' : 'expense'
                          setParseResult((prev) =>
                            prev
                              ? { ...prev, category: cat, draft: { ...prev.draft, type: newType } }
                              : prev,
                          )
                          if (parseResult?.draft) {
                            learnCategory(getMerchantKey(parseResult.draft), cat.id)
                          }
                        }}
                        onDateChange={(date) =>
                          setParseResult((prev) =>
                            prev ? { ...prev, draft: { ...prev.draft, date } } : prev
                          )
                        }
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
                        className="mt-4 flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold"
                        style={{ background: 'rgba(31,105,93,0.1)', color: '#1f6950' }}
                      >
                        <CheckCircle size={18} weight="fill" aria-hidden="true" />
                        Transaction logged
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>

          {/* ── Sticky footer — buttons always pinned to bottom ───────────── */}
          {!success && (
            <div
              className="shrink-0 px-5 pt-3"
              style={{
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)',
                borderTop: '1px solid #e7edeb',
              }}
            >
              <div className="flex gap-3">
                <button
                  onClick={triggerClose}
                  className="flex-1 rounded-2xl py-4 text-sm font-semibold transition-colors active:scale-[0.97]"
                  style={{ color: '#6e9990', background: '#f0f4f2' }}
                >
                  Discard
                </button>
                {mode === 'quick' && (
                  <motion.button
                    onClick={handleLog}
                    disabled={!canLog}
                    aria-label="Log transaction"
                    className="flex-1 rounded-2xl py-4 text-sm font-bold tracking-wide disabled:opacity-30"
                    style={{ background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)', color: '#ffffff' }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    Log Transaction
                  </motion.button>
                )}
                {mode === 'bulk' && (
                  <motion.button
                    onClick={() => bulkLogAllRef.current?.()}
                    disabled={bulkValidCount === 0}
                    aria-label="Log all entries"
                    className="flex-1 rounded-2xl py-4 text-sm font-bold tracking-wide disabled:opacity-30"
                    style={{ background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)', color: '#ffffff' }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    {bulkValidCount > 0 ? `Log All ${bulkValidCount}` : 'Log All'}
                  </motion.button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </>
  )
}
