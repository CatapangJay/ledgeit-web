'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CaretLeft, CaretRight, CaretDown } from '@phosphor-icons/react'
import { formatDate } from '@/lib/formatters'

// ─── Local-date helpers (avoid UTC drift from toISOString) ──────────────────────

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fromISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

interface Props {
  open: boolean
  /** Currently selected date, ISO YYYY-MM-DD. */
  value: string
  onSelect: (date: string) => void
  onClose: () => void
  /** Latest selectable date, ISO. Defaults to today (no future dates). */
  max?: string
}

/**
 * Design-system calendar rendered in a portal so it's never clipped by a
 * parent's `overflow: hidden` (transaction rows) or scroll container (sheets).
 * Centered modal on all breakpoints with a blurred backdrop.
 */
export default function DatePickerSheet({ open, value, onSelect, onClose, max }: Props) {
  const todayISO = useMemo(() => toISO(new Date()), [])
  const maxISO = max ?? todayISO

  // Month currently shown in the grid — seeded from the selected value.
  const [viewMonth, setViewMonth] = useState(() => {
    const d = value ? fromISO(value) : new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  // 'days' → day grid · 'months' → month + year chooser (fast year jumping).
  const [mode, setMode] = useState<'days' | 'months'>('days')

  // Re-seed the visible month + reset to day view whenever the picker (re)opens.
  useEffect(() => {
    if (open) {
      const d = value ? fromISO(value) : new Date()
      setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1))
      setMode('days')
    }
  }, [open, value])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const grid = useMemo(() => {
    const year = viewMonth.getFullYear()
    const month = viewMonth.getMonth()
    const firstWeekday = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (string | null)[] = []
    for (let i = 0; i < firstWeekday; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(toISO(new Date(year, month, d)))
    return cells
  }, [viewMonth])

  // Next-month navigation is disabled once the view reaches the max month.
  const maxDate = fromISO(maxISO)
  const atMaxMonth =
    viewMonth.getFullYear() === maxDate.getFullYear() &&
    viewMonth.getMonth() === maxDate.getMonth()

  function shiftMonth(delta: number) {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))
  }

  const maxYear = maxDate.getFullYear()
  const viewYear = viewMonth.getFullYear()
  // Allow browsing ~120 years back — plenty for any personal ledger history.
  const minYear = maxYear - 120

  function shiftYear(delta: number) {
    setViewMonth((m) => {
      const nextYear = Math.min(maxYear, Math.max(minYear, m.getFullYear() + delta))
      // Clamp the month so we never land on a future month in the max year.
      const maxMonth = nextYear === maxYear ? maxDate.getMonth() : 11
      return new Date(nextYear, Math.min(m.getMonth(), maxMonth), 1)
    })
  }

  function pickMonth(monthIndex: number) {
    setViewMonth((m) => new Date(m.getFullYear(), monthIndex, 1))
    setMode('days')
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60]"
            style={{ background: 'rgba(0,53,46,0.28)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Calendar card */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Choose a date"
            className="fixed left-1/2 top-1/2 z-[61] w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl p-5"
            style={{
              background: '#f8faf9',
              boxShadow: '0 24px 80px rgba(0,53,46,0.22), 0 0 0 1px rgba(205,224,219,0.6)',
            }}
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          >
            {/* Header — tap the label to toggle the month/year chooser */}
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMode((m) => (m === 'days' ? 'months' : 'days'))}
                aria-label={mode === 'days' ? 'Choose month and year' : 'Back to days'}
                aria-expanded={mode === 'months'}
                className="flex items-center gap-1.5 rounded-xl py-0.5 pl-1 pr-2 text-left transition-colors hover:bg-ledge-surface"
              >
                <div className="flex flex-col">
                  <span className="text-base font-bold tracking-tight" style={{ color: '#00352e' }}>
                    {MONTH_NAMES[viewMonth.getMonth()]}
                  </span>
                  <span className="font-mono text-[11px] font-semibold" style={{ color: '#6e9990' }}>
                    {viewMonth.getFullYear()}
                  </span>
                </div>
                <motion.span
                  animate={{ rotate: mode === 'months' ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  className="flex items-center"
                  style={{ color: '#6e9990' }}
                  aria-hidden="true"
                >
                  <CaretDown size={12} weight="bold" />
                </motion.span>
              </button>

              {/* Nav arrows: step months in day view, step years in month view */}
              <div className="flex items-center gap-1.5">
                {mode === 'days' ? (
                  <>
                    <motion.button
                      aria-label="Previous month"
                      whileTap={{ scale: 0.88 }}
                      onClick={() => shiftMonth(-1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full"
                      style={{ background: '#f0f4f2', color: '#3f4946' }}
                    >
                      <CaretLeft size={13} weight="bold" aria-hidden="true" />
                    </motion.button>
                    <motion.button
                      aria-label="Next month"
                      whileTap={{ scale: atMaxMonth ? 1 : 0.88 }}
                      onClick={() => !atMaxMonth && shiftMonth(1)}
                      disabled={atMaxMonth}
                      className="flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-30"
                      style={{ background: '#f0f4f2', color: '#3f4946' }}
                    >
                      <CaretRight size={13} weight="bold" aria-hidden="true" />
                    </motion.button>
                  </>
                ) : (
                  <>
                    <motion.button
                      aria-label="Previous year"
                      whileTap={{ scale: viewYear <= minYear ? 1 : 0.88 }}
                      onClick={() => shiftYear(-1)}
                      disabled={viewYear <= minYear}
                      className="flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-30"
                      style={{ background: '#f0f4f2', color: '#3f4946' }}
                    >
                      <CaretLeft size={13} weight="bold" aria-hidden="true" />
                    </motion.button>
                    <motion.button
                      aria-label="Next year"
                      whileTap={{ scale: viewYear >= maxYear ? 1 : 0.88 }}
                      onClick={() => shiftYear(1)}
                      disabled={viewYear >= maxYear}
                      className="flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-30"
                      style={{ background: '#f0f4f2', color: '#3f4946' }}
                    >
                      <CaretRight size={13} weight="bold" aria-hidden="true" />
                    </motion.button>
                  </>
                )}
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {mode === 'days' ? (
                <motion.div
                  key="days"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.14 }}
                >
                  {/* Weekday labels */}
                  <div className="mb-1 grid grid-cols-7 gap-1">
                    {WEEKDAYS.map((w, i) => (
                      <span
                        key={i}
                        className="flex h-7 items-center justify-center text-[10px] font-bold uppercase tracking-wide"
                        style={{ color: '#cde0db' }}
                      >
                        {w}
                      </span>
                    ))}
                  </div>

                  {/* Day grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {grid.map((iso, i) => {
                      if (!iso) return <span key={`empty-${i}`} />
                      const day = fromISO(iso).getDate()
                      const isSelected = iso === value
                      const isToday = iso === todayISO
                      const isDisabled = iso > maxISO
                      return (
                        <motion.button
                          key={iso}
                          whileTap={{ scale: isDisabled ? 1 : 0.86 }}
                          disabled={isDisabled}
                          aria-label={formatDate(iso)}
                          aria-current={isSelected ? 'date' : undefined}
                          onClick={() => { onSelect(iso); onClose() }}
                          className="relative flex h-9 items-center justify-center rounded-full font-mono text-[13px] font-semibold transition-colors disabled:opacity-25"
                          style={
                            isSelected
                              ? { background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)', color: '#ffffff' }
                              : { background: 'transparent', color: '#191c1c' }
                          }
                        >
                          {day}
                          {isToday && !isSelected && (
                            <span
                              className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                              style={{ background: '#1f695d' }}
                              aria-hidden="true"
                            />
                          )}
                        </motion.button>
                      )
                    })}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="months"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.14 }}
                  className="grid grid-cols-3 gap-2 py-1"
                >
                  {MONTH_ABBR.map((label, m) => {
                    const isSelectedMonth =
                      m === viewMonth.getMonth() &&
                      (!value || viewYear === fromISO(value).getFullYear())
                    // A month is out of range only in the max year, past the max month.
                    const isDisabled = viewYear === maxYear && m > maxDate.getMonth()
                    return (
                      <motion.button
                        key={label}
                        whileTap={{ scale: isDisabled ? 1 : 0.9 }}
                        disabled={isDisabled}
                        aria-label={`${MONTH_NAMES[m]} ${viewYear}`}
                        onClick={() => pickMonth(m)}
                        className="flex h-11 items-center justify-center rounded-xl text-[13px] font-bold transition-colors disabled:opacity-25"
                        style={
                          isSelectedMonth
                            ? { background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)', color: '#ffffff' }
                            : { background: '#f0f4f2', color: '#191c1c' }
                        }
                      >
                        {label}
                      </motion.button>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer — quick "Today" jump */}
            <div className="mt-4 flex justify-end">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => { onSelect(todayISO); onClose() }}
                className="rounded-full px-4 py-1.5 text-[12px] font-bold"
                style={{ background: '#e7edeb', color: '#1f695d' }}
              >
                Today
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
