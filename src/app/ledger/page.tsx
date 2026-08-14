'use client'

import { Suspense, useEffect, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import FilterChips from '@/components/ledger/FilterChips'
import DateFilterBar from '@/components/ledger/DateFilterBar'
import DateGroup from '@/components/ledger/DateGroup'
import TransactionRow from '@/components/ledger/TransactionRow'
import CategoryBreakdownBar from '@/components/ledger/CategoryBreakdownBar'
import { useStore } from '@/lib/store'
import { formatCurrency } from '@/lib/formatters'
import type { FilterValue } from '@/components/ledger/FilterChips'
import type { DatePeriod } from '@/components/ledger/DateFilterBar'
import type { Transaction } from '@/types'

function groupByDate(txns: Transaction[]): [string, Transaction[]][] {
  const map = new Map<string, Transaction[]>()
  for (const tx of txns) {
    const list = map.get(tx.date) ?? []
    list.push(tx)
    map.set(tx.date, list)
  }
  return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a))
}

// ─── Local-date helpers for period presets ──────────────────────────────────────

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Inclusive [start, end] ISO bounds for a period, or null for "all time". */
function periodRange(period: DatePeriod, customDate: string | null): { start: string; end: string } | null {
  const now = new Date()
  const today = toISO(now)
  if (period === 'thisMonth') {
    return { start: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), end: today }
  }
  if (period === 'last7' || period === 'last30') {
    const span = period === 'last7' ? 6 : 29 // inclusive of today
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - span)
    return { start: toISO(start), end: today }
  }
  if (period === 'custom' && customDate) {
    return { start: customDate, end: customDate }
  }
  return null
}

function EmptyFiltered({ hasActiveFilters }: { hasActiveFilters: boolean }) {
  return (
    <div className="flex flex-col items-start gap-2 py-14">
      <p className="text-sm font-medium" style={{ color: '#6e9990' }}>
        {hasActiveFilters ? 'No transactions match these filters.' : 'No transactions yet.'}
      </p>
      <p className="text-xs" style={{ color: '#cde0db' }}>
        {hasActiveFilters ? 'Try widening the date range or clearing filters.' : 'Log your first entry to see it here.'}
      </p>
    </div>
  )
}

function LedgerContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Optional day deep-link from the dashboard heatmap (?date=YYYY-MM-DD).
  const rawDate = searchParams.get('date')
  const linkedDate = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null

  const [filter, setFilter] = useState<FilterValue>('all')
  const [period, setPeriod] = useState<DatePeriod>('all')
  const [customDate, setCustomDate] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Seed the custom-day filter when arriving via a heatmap deep-link.
  useEffect(() => {
    if (linkedDate) {
      setPeriod('custom')
      setCustomDate(linkedDate)
      // Strip the query param so it's a normal in-page filter from here on.
      router.replace('/ledger')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedDate])

  const transactions = useStore((s) => s.transactions)
  const deleteTransaction = useStore((s) => s.deleteTransaction)
  const updateTransaction = useStore((s) => s.updateTransaction)
  const customCategories = useStore((s) => s.customCategories)

  const customChips = customCategories.map((c) => ({ value: c.id, label: c.name }))

  const range = useMemo(() => periodRange(period, customDate), [period, customDate])
  const query = search.trim().toLowerCase()
  const hasActiveFilters = filter !== 'all' || period !== 'all' || query !== ''

  function clearAll() {
    setFilter('all')
    setPeriod('all')
    setCustomDate(null)
    setSearch('')
  }

  function handlePeriodChange(next: DatePeriod) {
    setPeriod(next)
    if (next !== 'custom') setCustomDate(null)
  }

  function handleCustomDate(iso: string) {
    setCustomDate(iso)
    setPeriod('custom')
  }

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      // Category / type chip
      if (filter === 'expense' && t.type !== 'expense') return false
      else if (filter === 'income' && t.type !== 'income') return false
      else if (filter === 'transfer' && t.type !== 'transfer') return false
      else if (filter !== 'all' && filter !== 'expense' && filter !== 'income' && filter !== 'transfer' && t.category.id !== filter) return false
      // Date period
      if (range && (t.date < range.start || t.date > range.end)) return false
      // Free-text search across merchant, category, and raw note
      if (query) {
        const haystack = `${t.merchant} ${t.category.label} ${t.raw}`.toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
  }, [transactions, filter, range, query])

  const totalAmount = useMemo(
    () => filtered.reduce((s, t) => s + (t.type === 'expense' ? t.amount : 0), 0),
    [filtered]
  )

  const groups = groupByDate(filtered)

  return (
    <div className="px-5 pb-4 md:px-8 md:max-w-3xl md:mx-auto lg:max-w-4xl lg:px-10" style={{ background: '#f8faf9', minHeight: '100dvh' }}>
      {/* Header */}
      <div className="flex items-baseline justify-between gap-3 pb-4 pt-12 md:pt-8">
        <div className="flex items-baseline gap-3">
          <h1 className="text-base font-bold tracking-tight" style={{ color: '#00352e' }}>
            Activity
          </h1>
          <span className="text-xs font-semibold" style={{ color: '#6e9990' }}>
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        {totalAmount > 0 && (
          <span className="font-mono text-xs font-semibold" style={{ color: '#ba1a1a' }}>
            −{formatCurrency(totalAmount)}
          </span>
        )}
      </div>

      {/* Search */}
      <div
        className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2.5"
        style={{ background: '#ffffff', boxShadow: '0 2px 12px rgba(0,53,46,0.05)' }}
      >
        <MagnifyingGlass size={15} weight="bold" style={{ color: '#6e9990' }} aria-hidden="true" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search merchant, category, or note…"
          aria-label="Search transactions"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          style={{ color: '#191c1c' }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
            style={{ background: '#f0f4f2' }}
          >
            <X size={10} weight="bold" style={{ color: '#6e9990' }} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Date period filter */}
      <div className="mb-2.5">
        <DateFilterBar
          period={period}
          customDate={customDate}
          onPeriodChange={handlePeriodChange}
          onCustomDateChange={handleCustomDate}
        />
      </div>

      {/* Category / type chips */}
      <div className="mb-3">
        <FilterChips active={filter} onChange={setFilter} customChips={customChips} />
      </div>

      {/* Clear-all shortcut when any filter is active */}
      {hasActiveFilters && (
        <div className="mb-3 flex justify-end">
          <button
            onClick={clearAll}
            className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold"
            style={{ background: '#e7edeb', color: '#1f695d' }}
          >
            Clear all filters
            <X size={10} weight="bold" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Category breakdown bar */}
      <CategoryBreakdownBar transactions={filtered} />

      {/* Transaction list */}
      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <EmptyFiltered key="empty" hasActiveFilters={hasActiveFilters} />
        ) : (
          <motion.div
            key={`${filter}-${period}-${customDate ?? ''}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <AnimatePresence initial={false}>
              {groups.map(([date, txns]) => (
                <div key={date} className="mb-4">
                  <DateGroup date={date} transactions={txns} />
                  <div
                    className="overflow-hidden rounded-2xl"
                    style={{ background: '#ffffff', boxShadow: '0 2px 12px rgba(0,53,46,0.06)' }}
                  >
                    <AnimatePresence initial={false}>
                      {txns.map((tx, i) => (
                        <div
                          key={tx.id}
                          style={i > 0 ? { borderTop: '1px solid #f0f4f2' } : undefined}
                        >
                          <TransactionRow
                            tx={tx}
                            onDelete={deleteTransaction}
                            onDateChange={(id, date) => updateTransaction(id, { date })}
                          />
                        </div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function LedgerPage() {
  // useSearchParams() requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <LedgerContent />
    </Suspense>
  )
}
