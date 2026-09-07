'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CaretLeft, CaretRight, MagnifyingGlass, X } from '@phosphor-icons/react'
import FilterChips from '@/components/ledger/FilterChips'
import DateFilterBar from '@/components/ledger/DateFilterBar'
import DateGroup from '@/components/ledger/DateGroup'
import TransactionRow from '@/components/ledger/TransactionRow'
import TransactionEditSheet from '@/components/ledger/TransactionEditSheet'
import ListSkeleton from '@/components/ledger/ListSkeleton'
import { useStore } from '@/lib/store'
import { useDeferredMount } from '@/lib/useDeferredMount'
import { PAYMENT_METHODS } from '@/types'
import type { FilterValue } from '@/components/ledger/FilterChips'
import type { DatePeriod } from '@/components/ledger/DateFilterBar'
import type { Transaction, PaymentMethodId } from '@/types'

const PAGE_SIZE = 20

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function periodRange(period: DatePeriod, customDate: string | null): { start: string; end: string } | null {
  const now = new Date()
  const today = toISO(now)
  if (period === 'thisMonth') return { start: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), end: today }
  if (period === 'last7' || period === 'last30') {
    const span = period === 'last7' ? 6 : 29
    return { start: toISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - span)), end: today }
  }
  if (period === 'custom' && customDate) return { start: customDate, end: customDate }
  return null
}

function groupByDate(txns: Transaction[]): [string, Transaction[]][] {
  const map = new Map<string, Transaction[]>()
  for (const tx of txns) {
    const list = map.get(tx.date) ?? []
    list.push(tx)
    map.set(tx.date, list)
  }
  return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a))
}

function HistoryContent() {
  const router = useRouter()
  const listReady = useDeferredMount()
  const transactions = useStore((s) => s.transactions)
  const ensureFullHistory = useStore((s) => s.ensureFullHistory)
  const deleteTransaction = useStore((s) => s.deleteTransaction)
  const updateTransaction = useStore((s) => s.updateTransaction)
  const customCategories = useStore((s) => s.customCategories)

  // The History page is the all-time browser — load the full history on mount
  // (the initial app load only fetches a recent window).
  useEffect(() => {
    ensureFullHistory()
  }, [ensureFullHistory])

  const [filter, setFilter] = useState<FilterValue>('all')
  const [period, setPeriod] = useState<DatePeriod>('all')
  const [customDate, setCustomDate] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<PaymentMethodId | 'all'>('all')
  const [page, setPage] = useState(0)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)

  const customChips = customCategories.map((c) => ({ value: c.id, label: c.name }))
  const range = useMemo(() => periodRange(period, customDate), [period, customDate])
  const query = search.trim().toLowerCase()
  const hasActiveFilters = filter !== 'all' || period !== 'all' || query !== '' || methodFilter !== 'all'

  // Reset to page 0 whenever the filters change — derived during render (React's
  // "adjust state while rendering" pattern) rather than in an effect.
  const filterSig = `${filter}|${period}|${customDate ?? ''}|${query}|${methodFilter}`
  const [lastSig, setLastSig] = useState(filterSig)
  if (filterSig !== lastSig) {
    setLastSig(filterSig)
    setPage(0)
  }

  function clearAll() {
    setFilter('all')
    setPeriod('all')
    setCustomDate(null)
    setSearch('')
    setMethodFilter('all')
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
    return transactions
      .filter((t) => {
        if (filter === 'expense' && t.type !== 'expense') return false
        else if (filter === 'income' && t.type !== 'income') return false
        else if (filter === 'transfer' && t.type !== 'transfer') return false
        else if (filter !== 'all' && filter !== 'expense' && filter !== 'income' && filter !== 'transfer' && t.category.id !== filter) return false
        if (range && (t.date < range.start || t.date > range.end)) return false
        if (methodFilter !== 'all' && t.paymentMethod !== methodFilter) return false
        if (query) {
          const haystack = `${t.merchant} ${t.category.label} ${t.raw}`.toLowerCase()
          if (!haystack.includes(query)) return false
        }
        return true
      })
      // Newest date first (created time breaks ties).
      .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)))
  }, [transactions, filter, range, query, methodFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)
  const groups = groupByDate(pageItems)

  return (
    <div className="px-5 pb-4 md:px-8 md:max-w-3xl md:mx-auto lg:max-w-4xl lg:px-10" style={{ background: '#f8faf9', minHeight: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 pt-12 md:pt-8">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: '#f0f4f2' }}
        >
          <CaretLeft size={16} weight="bold" style={{ color: '#3f4946' }} aria-hidden="true" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold tracking-tight" style={{ color: '#00352e' }}>
            Transaction History
          </h1>
          <p className="text-[11px]" style={{ color: '#6e9990' }}>
            {filtered.length} {filtered.length === 1 ? 'transaction' : 'transactions'}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: '#ffffff', boxShadow: '0 2px 12px rgba(0,53,46,0.05)' }}>
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
          <button onClick={() => setSearch('')} aria-label="Clear search" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: '#f0f4f2' }}>
            <X size={10} weight="bold" style={{ color: '#6e9990' }} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Date period filter */}
      <div className="mb-2.5">
        <DateFilterBar period={period} customDate={customDate} onPeriodChange={handlePeriodChange} onCustomDateChange={handleCustomDate} />
      </div>

      {/* Category / type chips */}
      <div className="mb-2.5">
        <FilterChips active={filter} onChange={setFilter} customChips={customChips} />
      </div>

      {/* Payment-method chips */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }} role="group" aria-label="Filter by payment method">
        {([{ id: 'all' as const, short: 'Any method' }, ...PAYMENT_METHODS]).map((m) => {
          const active = methodFilter === m.id
          return (
            <button
              key={m.id}
              onClick={() => setMethodFilter(m.id as PaymentMethodId | 'all')}
              aria-pressed={active}
              className="shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors"
              style={active ? { background: '#475569', color: '#ffffff' } : { background: '#f0f4f2', color: '#3f4946' }}
            >
              {m.short}
            </button>
          )
        })}
      </div>

      {hasActiveFilters && (
        <div className="mb-3 flex justify-end">
          <button onClick={clearAll} className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: '#e7edeb', color: '#1f695d' }}>
            Clear all filters
            <X size={10} weight="bold" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* List */}
      {!listReady ? (
        <ListSkeleton />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-start gap-2 py-14">
          <p className="text-sm font-medium" style={{ color: '#6e9990' }}>
            {hasActiveFilters ? 'No transactions match these filters.' : 'No transactions yet.'}
          </p>
          <p className="text-xs" style={{ color: '#cde0db' }}>
            {hasActiveFilters ? 'Try widening the date range or clearing filters.' : 'Log your first entry to see it here.'}
          </p>
        </div>
      ) : (
        <motion.div key={safePage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
          {groups.map(([date, txns]) => (
            <div key={date} className="mb-4">
              <DateGroup date={date} transactions={txns} />
              <div className="overflow-hidden rounded-2xl" style={{ background: '#ffffff', boxShadow: '0 2px 12px rgba(0,53,46,0.06)' }}>
                {txns.map((tx, i) => (
                  <div key={tx.id} style={i > 0 ? { borderTop: '1px solid #f0f4f2' } : undefined}>
                    <TransactionRow tx={tx} onDelete={deleteTransaction} onDateChange={(id, d) => updateTransaction(id, { date: d })} onEdit={setEditingTx} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-2 flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                disabled={safePage === 0}
                className="flex items-center gap-1 rounded-full px-3.5 py-2 text-[12px] font-semibold disabled:opacity-30"
                style={{ background: '#f0f4f2', color: '#3f4946' }}
              >
                <CaretLeft size={12} weight="bold" aria-hidden="true" />
                Prev
              </button>
              <span className="font-mono text-[12px] font-semibold" style={{ color: '#6e9990' }}>
                Page {safePage + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
                disabled={safePage >= totalPages - 1}
                className="flex items-center gap-1 rounded-full px-3.5 py-2 text-[12px] font-semibold disabled:opacity-30"
                style={{ background: '#f0f4f2', color: '#3f4946' }}
              >
                Next
                <CaretRight size={12} weight="bold" aria-hidden="true" />
              </button>
            </div>
          )}
        </motion.div>
      )}

      <TransactionEditSheet
        tx={editingTx}
        customCategories={customCategories}
        onClose={() => setEditingTx(null)}
        onSave={updateTransaction}
        onDelete={deleteTransaction}
      />
    </div>
  )
}

export default function HistoryPage() {
  // Kept in Suspense for parity with the ledger (search-param-free, but future-proof).
  return (
    <Suspense fallback={null}>
      <HistoryContent />
    </Suspense>
  )
}
