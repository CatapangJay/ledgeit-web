'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { useStore } from '@/lib/store'
import { formatCurrency, formatCurrencyCompact } from '@/lib/formatters'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

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

  // Which day the user tapped, and whether it has entries — drives the prompt.
  const [prompt, setPrompt] = useState<{ iso: string; hasSpend: boolean } | null>(null)

  // Month currently displayed (first-of-month). Starts on the current month.
  const [viewMonth, setViewMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))

  const atCurrentMonth =
    viewMonth.getFullYear() === now.getFullYear() && viewMonth.getMonth() === now.getMonth()

  // Per-day expense totals for the visible month.
  const dailyTotals = useMemo(() => {
    const prefix = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}-`
    const totals: Record<string, number> = {}
    for (const t of transactions) {
      if (t.type !== 'expense') continue
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
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))
  }

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
              onClick={() => !isFuture && setPrompt({ iso, hasSpend })}
              aria-label={
                isFuture
                  ? formatDateLabel(iso)
                  : `${formatDateLabel(iso)} — ${hasSpend ? formatCurrency(amount) : 'no entry'}`
              }
              className="relative flex aspect-square items-center justify-center rounded-md font-mono text-[9px] font-semibold transition-transform disabled:cursor-default"
              style={{
                background: bg,
                color: darkBg ? '#ffffff' : isFuture ? '#cbdbd6' : hasSpend ? '#00352e' : '#8aa8a1',
                border: isFuture
                  ? '1px dashed #e2ecea'
                  : !hasSpend
                    ? '1px dashed #d4e4e0'
                    : '1px solid transparent',
                boxShadow: isToday ? '0 0 0 1.5px #00352e' : 'none',
              }}
            >
              {day}
            </motion.button>
          )
        })}
      </div>

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

      {/* Tap a day → confirm before adding (empty day) or viewing (has entries) */}
      <ConfirmDialog
        open={prompt !== null}
        title={
          prompt?.hasSpend
            ? `View ${prompt ? formatDateLabel(prompt.iso) : ''}?`
            : `No entries on ${prompt ? formatDateLabel(prompt.iso) : ''}`
        }
        message={
          prompt?.hasSpend
            ? 'See the transactions logged on this date in your ledger.'
            : 'Nothing was logged this day. Add a transaction?'
        }
        confirmLabel={prompt?.hasSpend ? 'View' : 'Add Transaction'}
        cancelLabel={prompt?.hasSpend ? 'Cancel' : 'Not now'}
        onConfirm={() => {
          if (!prompt) return
          if (prompt.hasSpend) onViewDate(prompt.iso)
          else onAddForDate(prompt.iso)
        }}
        onClose={() => setPrompt(null)}
      />
    </div>
  )
}

// Local, allocation-free date label for tooltips: "Aug 8".
function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
