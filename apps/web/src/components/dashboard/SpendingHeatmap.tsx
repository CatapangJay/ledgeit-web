'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CaretLeft, CaretRight, Plus, ArrowRight } from '@phosphor-icons/react'
import { useStore } from '@/lib/store'
import { isSpend } from '@/types'
import { formatCurrency, formatCurrencyCompact } from '@/lib/formatters'

// ─── Local-date helpers ─────────────────────────────────────────────────────────

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// Heatmap ramp — sage-white (no spend) → deep forest green (highest spend).
// Index 0 is reserved for "spent nothing on a day that has data around it";
// the day-with-no-entry state is rendered separately (hollow) so it's obvious.
const RAMP = ['#e7f0ed', '#c3ddd5', '#8fc0b4', '#4f9385', '#1f695d', '#00352e']

/** Map a day's spend to a ramp color, scaled against the month's busiest day. */
function rampColor(amount: number, max: number): string {
  if (amount <= 0 || max <= 0) return RAMP[0]
  // Buckets 1..5 (skip 0, that's the empty tint). sqrt curve so mid-spend days
  // are still visible rather than washed out by one huge outlier day.
  const t = Math.sqrt(amount / max)
  const bucket = Math.min(RAMP.length - 1, 1 + Math.floor(t * (RAMP.length - 1)))
  return RAMP[bucket]
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  /** Open Smart Entry pre-dated to this ISO day (for logging on an empty day). */
  onAddForDate: (iso: string) => void
  /** Navigate to the ledger filtered to this ISO day. */
  onViewDate: (iso: string) => void
}

export default function SpendingHeatmap({ onAddForDate, onViewDate }: Props) {
  const transactions = useStore((s) => s.transactions)

  const now = useMemo(() => new Date(), [])
  const todayISO = useMemo(() => toISO(now), [now])

  // The day the user tapped — drives the inline detail panel below the grid.
  const [selectedIso, setSelectedIso] = useState<string | null>(null)

  // Month currently displayed (first-of-month). Starts on the current month.
  const [viewMonth, setViewMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))

  const atCurrentMonth =
    viewMonth.getFullYear() === now.getFullYear() && viewMonth.getMonth() === now.getMonth()

  // Per-day expense totals for the visible month.
  const dailyTotals = useMemo(() => {
    const prefix = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}-`
    const totals: Record<string, number> = {}
    for (const t of transactions) {
      if (!isSpend(t)) continue
      if (!t.date.startsWith(prefix)) continue
      totals[t.date] = (totals[t.date] ?? 0) + t.amount
    }
    return totals
  }, [transactions, viewMonth])

  const { cells, monthTotal, maxDay, activeDays, elapsedDays } = useMemo(() => {
    const year = viewMonth.getFullYear()
    const month = viewMonth.getMonth()
    const firstWeekday = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cells: (string | null)[] = []
    for (let i = 0; i < firstWeekday; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(toISO(new Date(year, month, d)))

    const amounts = Object.values(dailyTotals)
    const monthTotal = amounts.reduce((s, a) => s + a, 0)
    const maxDay = amounts.length ? Math.max(...amounts) : 0
    const activeDays = amounts.filter((a) => a > 0).length

    // Days that have already happened this month (for the "no entry" count).
    const elapsedDays = atCurrentMonth ? now.getDate() : daysInMonth

    return { cells, monthTotal, maxDay, activeDays, elapsedDays }
  }, [viewMonth, dailyTotals, atCurrentMonth, now])

  const daysWithoutEntry = Math.max(elapsedDays - activeDays, 0)
  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  function shiftMonth(delta: number) {
    setSelectedIso(null) // a selection from the previous month no longer applies
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))
  }

  const selectedAmount = selectedIso ? (dailyTotals[selectedIso] ?? 0) : 0

  return (
    <div
      className="rounded-2xl px-4 py-3"
      style={{ background: '#ffffff', boxShadow: '0 4px 24px rgba(0,53,46,0.07)' }}
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: '#00352e' }}>
          Spending Map
        </span>
        <div className="flex items-center gap-1">
          <motion.button
            aria-label="Previous month"
            whileTap={{ scale: 0.86 }}
            onClick={() => shiftMonth(-1)}
            className="flex h-6 w-6 items-center justify-center rounded-full"
            style={{ background: '#f0f4f2', color: '#3f4946' }}
          >
            <CaretLeft size={11} weight="bold" aria-hidden="true" />
          </motion.button>
          <span className="min-w-[78px] text-center font-mono text-[10px] font-semibold" style={{ color: '#6e9990' }}>
            {monthLabel}
          </span>
          <motion.button
            aria-label="Next month"
            whileTap={{ scale: atCurrentMonth ? 1 : 0.86 }}
            onClick={() => !atCurrentMonth && shiftMonth(1)}
            disabled={atCurrentMonth}
            className="flex h-6 w-6 items-center justify-center rounded-full disabled:opacity-30"
            style={{ background: '#f0f4f2', color: '#3f4946' }}
          >
            <CaretRight size={11} weight="bold" aria-hidden="true" />
          </motion.button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w, i) => (
          <span
            key={i}
            className="flex h-3.5 items-center justify-center text-[9px] font-bold uppercase"
            style={{ color: '#cde0db' }}
          >
            {w}
          </span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((iso, i) => {
          if (!iso) return <span key={`empty-${i}`} />
          const amount = dailyTotals[iso] ?? 0
          const isFuture = iso > todayISO
          const isToday = iso === todayISO
          const day = Number(iso.slice(-2))
          const hasSpend = amount > 0
          const isSelected = iso === selectedIso
          // No color at all for days with no logged transaction (or the future).
          const bg = isFuture || !hasSpend ? 'transparent' : rampColor(amount, maxDay)
          // Text stays legible: white on the darkest two buckets, ink otherwise.
          const darkBg = hasSpend && amount / (maxDay || 1) > 0.4
          return (
            <motion.button
              key={iso}
              type="button"
              disabled={isFuture}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: isFuture ? 1 : 0.88 }}
              transition={{ duration: 0.18, delay: Math.min(i * 0.006, 0.12) }}
              onClick={() => !isFuture && setSelectedIso((cur) => (cur === iso ? null : iso))}
              aria-label={
                isFuture
                  ? formatDateLabel(iso)
                  : `${formatDateLabel(iso)} — ${hasSpend ? formatCurrency(amount) : 'no entry'}`
              }
              aria-pressed={isSelected}
              className="relative flex aspect-square items-center justify-center rounded-md font-mono text-[9px] font-semibold transition-transform disabled:cursor-default"
              style={{
                background: bg,
                color: darkBg ? '#ffffff' : isFuture ? '#cbdbd6' : hasSpend ? '#00352e' : '#8aa8a1',
                border: isFuture
                  ? '1px dashed #e2ecea'
                  : !hasSpend
                    ? '1px dashed #d4e4e0'
                    : '1px solid transparent',
                boxShadow: isSelected
                  ? '0 0 0 2px #1f695d'
                  : isToday
                    ? '0 0 0 1.5px #00352e'
                    : 'none',
              }}
            >
              {day}
            </motion.button>
          )
        })}
      </div>

      {/* Selected-day detail panel */}
      <AnimatePresence initial={false}>
        {selectedIso && (
          <motion.div
            key="day-detail"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="overflow-hidden"
          >
            <div
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
              style={{ background: '#f4f6f5' }}
            >
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#6e9990' }}>
                  {formatDateLabel(selectedIso)}
                </p>
                <p
                  className="font-mono text-[15px] font-bold leading-tight"
                  style={{ color: selectedAmount > 0 ? '#00352e' : '#8aa8a1' }}
                >
                  {selectedAmount > 0 ? formatCurrency(selectedAmount) : 'No spending'}
                </p>
              </div>

              {selectedAmount > 0 ? (
                <div className="flex shrink-0 items-center gap-2">
                  {/* Secondary circular add button — log another entry for this day */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onAddForDate(selectedIso)}
                    aria-label="Add a transaction for this day"
                    className="flex h-9 w-9 items-center justify-center rounded-full"
                    style={{ background: '#e7edeb', color: '#1f695d' }}
                  >
                    <Plus size={14} weight="bold" aria-hidden="true" />
                  </motion.button>
                  {/* Primary — view the day's transactions in the ledger */}
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onViewDate(selectedIso)}
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)' }}
                  >
                    View details
                    <ArrowRight size={12} weight="bold" aria-hidden="true" />
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onAddForDate(selectedIso)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)' }}
                >
                  <Plus size={12} weight="bold" aria-hidden="true" />
                  Add transaction
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer — summary + legend */}
      <div className="mt-2.5 flex items-center justify-between" style={{ borderTop: '1px solid #f0f4f2', paddingTop: '8px' }}>
        <span className="text-[10px] font-medium" style={{ color: '#6e9990' }}>
          {monthTotal > 0 ? (
            <>
              {formatCurrencyCompact(monthTotal)} · {daysWithoutEntry} no {daysWithoutEntry === 1 ? 'entry' : 'entries'}
            </>
          ) : (
            'Nothing logged this month.'
          )}
        </span>
        <div className="flex items-center gap-0.5" aria-hidden="true">
          <span className="text-[8px] font-semibold" style={{ color: '#a9c2bd' }}>Less</span>
          {RAMP.slice(1).map((c) => (
            <span key={c} className="h-2 w-2 rounded-[2px]" style={{ background: c }} />
          ))}
          <span className="text-[8px] font-semibold" style={{ color: '#a9c2bd' }}>More</span>
        </div>
      </div>

    </div>
  )
}

// Local, allocation-free date label for tooltips: "Aug 8".
function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
