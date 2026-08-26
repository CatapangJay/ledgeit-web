'use client'

import { Suspense, useEffect, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { MagnifyingGlass, X, SlidersHorizontal, CaretDown, ListChecks, Tag, CalendarBlank, Trash } from '@phosphor-icons/react'
import FilterChips from '@/components/ledger/FilterChips'
import DateFilterBar from '@/components/ledger/DateFilterBar'
import DateGroup from '@/components/ledger/DateGroup'
import TransactionRow from '@/components/ledger/TransactionRow'
import TransactionEditSheet from '@/components/ledger/TransactionEditSheet'
import CategoryBreakdownBar from '@/components/ledger/CategoryBreakdownBar'
import CategoryPickerSheet from '@/components/ledger/CategoryPickerSheet'
import WalletStrip from '@/components/ledger/WalletStrip'
import DatePickerSheet from '@/components/ui/DatePickerSheet'
import { useStore } from '@/lib/store'
import { formatCurrency } from '@/lib/formatters'
import { PAYMENT_METHODS, CATEGORIES } from '@/types'
import type { FilterValue } from '@/components/ledger/FilterChips'
import type { DatePeriod } from '@/components/ledger/DateFilterBar'
import type { Transaction, PaymentMethodId, Category } from '@/types'

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
  // Optional category deep-link from the insights breakdown (?category=<id>).
  const linkedCategory = searchParams.get('category')

  const [filter, setFilter] = useState<FilterValue>('all')
  const [period, setPeriod] = useState<DatePeriod>('all')
  const [customDate, setCustomDate] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<PaymentMethodId | 'all'>('all')
  // Whether the filter controls (date, category, method) are expanded. Search
  // stays outside so it's always reachable. Collapsed by default to keep the
  // list the focus; auto-expands below when arriving with an active filter.
  const [filtersOpen, setFiltersOpen] = useState(false)
  // The transaction currently open in the edit sheet, if any.
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  // Bulk selection: whether we're in select mode, and which ids are picked.
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkPickerOpen, setBulkPickerOpen] = useState(false)
  const [bulkDatePickerOpen, setBulkDatePickerOpen] = useState(false)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [bulkError, setBulkError] = useState(false)

  // Seed the custom-day filter when arriving via a heatmap deep-link.
  useEffect(() => {
    if (linkedDate) {
      setPeriod('custom')
      setCustomDate(linkedDate)
      setFiltersOpen(true) // reveal the panel so the active day filter is visible
      // Strip the query param so it's a normal in-page filter from here on.
      router.replace('/ledger')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedDate])

  // Seed the category filter when arriving via an insights deep-link. Only
  // honor ids that map to a visible chip (known + not hidden), so the active
  // filter always has a chip the user can see and clear.
  useEffect(() => {
    if (!linkedCategory) return
    const known =
      CATEGORIES.some((c) => c.id === linkedCategory) ||
      customCategories.some((c) => c.id === linkedCategory)
    if (known && !hiddenCategories.includes(linkedCategory)) {
      setFilter(linkedCategory)
      setFiltersOpen(true) // reveal the panel so the active category filter is visible
    }
    router.replace('/ledger')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedCategory])

  const transactions = useStore((s) => s.transactions)
  const deleteTransaction = useStore((s) => s.deleteTransaction)
  const updateTransaction = useStore((s) => s.updateTransaction)
  const bulkChangeCategory = useStore((s) => s.bulkChangeCategory)
  const bulkChangeDate = useStore((s) => s.bulkChangeDate)
  const bulkDelete = useStore((s) => s.bulkDelete)
  const customCategories = useStore((s) => s.customCategories)
  const hiddenCategories = useStore((s) => s.hiddenCategories)

  const customChips = customCategories.map((c) => ({ value: c.id, label: c.name }))

  const range = useMemo(() => periodRange(period, customDate), [period, customDate])
  const query = search.trim().toLowerCase()
  const hasActiveFilters = filter !== 'all' || period !== 'all' || query !== '' || methodFilter !== 'all'
  // Count of active controls inside the collapsible panel (search excluded — it
  // has its own always-visible field). Surfaced as a badge on the toggle.
  const activePanelFilters = (filter !== 'all' ? 1 : 0) + (period !== 'all' ? 1 : 0) + (methodFilter !== 'all' ? 1 : 0)

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
    return transactions.filter((t) => {
      // Category / type chip
      if (filter === 'expense' && t.type !== 'expense') return false
      else if (filter === 'income' && t.type !== 'income') return false
      else if (filter === 'transfer' && t.type !== 'transfer') return false
      else if (filter !== 'all' && filter !== 'expense' && filter !== 'income' && filter !== 'transfer' && t.category.id !== filter) return false
      // Date period
      if (range && (t.date < range.start || t.date > range.end)) return false
      // Payment method
      if (methodFilter !== 'all' && t.paymentMethod !== methodFilter) return false
      // Free-text search across merchant, category, and raw note
      if (query) {
        const haystack = `${t.merchant} ${t.category.label} ${t.raw}`.toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
  }, [transactions, filter, range, query, methodFilter])

  const totalAmount = useMemo(
    () => filtered.reduce((s, t) => s + (t.type === 'expense' ? t.amount : 0), 0),
    [filtered]
  )

  const groups = groupByDate(filtered)

  // Debt-linked entries can't be recategorized here (managed on the Debts page),
  // so they're excluded from selection and select-all.
  const selectableFiltered = useMemo(
    () => filtered.filter((t) => t.category.id !== 'debts'),
    [filtered]
  )
  // Selection is scoped to what's currently visible: a selected id only counts
  // while its row is in view, so the count always matches what "Change category"
  // will affect. Changing filters naturally narrows/widens the effective set.
  const visibleSelectedIds = useMemo(
    () => selectableFiltered.filter((t) => selectedIds.has(t.id)).map((t) => t.id),
    [selectableFiltered, selectedIds]
  )
  const selectedCount = visibleSelectedIds.length
  const allSelected = selectableFiltered.length > 0 && selectedCount === selectableFiltered.length

  function enterSelectMode() {
    setSelectMode(true)
    setSelectedIds(new Set())
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
    setBulkPickerOpen(false)
    setBulkDatePickerOpen(false)
    setBulkDeleteConfirm(false)
    setBulkError(false)
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    // Operate only on the visible set: clear them if all are selected, else add
    // every visible row (preserving any off-screen selections already made).
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        for (const t of selectableFiltered) next.delete(t.id)
      } else {
        for (const t of selectableFiltered) next.add(t.id)
      }
      return next
    })
  }

  async function handleBulkCategory(category: Category) {
    const ids = visibleSelectedIds
    setBulkPickerOpen(false)
    setBulkError(false)
    const ok = await bulkChangeCategory(ids, category)
    if (ok) {
      exitSelectMode()
    } else {
      // Keep the selection so the user can retry; surface the failure.
      setBulkError(true)
    }
  }

  async function handleBulkDate(date: string) {
    const ids = visibleSelectedIds
    setBulkDatePickerOpen(false)
    setBulkError(false)
    const ok = await bulkChangeDate(ids, date)
    if (ok) exitSelectMode()
    else setBulkError(true)
  }

  async function handleBulkDelete() {
    const ids = visibleSelectedIds
    setBulkDeleteConfirm(false)
    setBulkError(false)
    const ok = await bulkDelete(ids)
    if (ok) exitSelectMode()
    else setBulkError(true)
  }

  return (
    <div className="px-5 pb-4 md:px-8 md:max-w-3xl md:mx-auto lg:max-w-4xl lg:px-10" style={{ background: '#f8faf9', minHeight: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-4 pt-12 md:pt-8">
        <div className="flex items-baseline gap-3">
          <h1 className="text-base font-bold tracking-tight" style={{ color: '#00352e' }}>
            Activity
          </h1>
          <span className="text-xs font-semibold" style={{ color: '#6e9990' }}>
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {totalAmount > 0 && !selectMode && (
            <span className="font-mono text-xs font-semibold" style={{ color: '#ba1a1a' }}>
              −{formatCurrency(totalAmount)}
            </span>
          )}
          {filtered.length > 0 && (
            <button
              onClick={selectMode ? exitSelectMode : enterSelectMode}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors"
              style={selectMode ? { background: '#00352e', color: '#ffffff' } : { background: '#f0f4f2', color: '#3f4946' }}
            >
              <ListChecks size={13} weight="bold" aria-hidden="true" />
              {selectMode ? 'Done' : 'Select'}
            </button>
          )}
        </div>
      </div>

      {/* Bulk selection toolbar */}
      <AnimatePresence initial={false}>
        {selectMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="overflow-hidden"
          >
            <div
              className="mb-3 flex flex-col gap-2 rounded-xl px-3 py-2.5"
              style={{ background: '#ffffff', boxShadow: '0 2px 12px rgba(0,53,46,0.06)' }}
            >
              {/* Row 1: select-all + count */}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold"
                  style={{ background: '#f0f4f2', color: '#1f695d' }}
                >
                  {allSelected ? 'Clear all' : 'Select all'}
                </button>
                <span className="text-[12px] font-semibold" style={{ color: '#3f4946' }}>
                  {selectedCount} selected
                </span>
              </div>

              {/* Row 2: bulk actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBulkPickerOpen(true)}
                  disabled={selectedCount === 0}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-bold text-white disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)' }}
                >
                  <Tag size={13} weight="bold" aria-hidden="true" />
                  Category
                </button>
                <button
                  onClick={() => setBulkDatePickerOpen(true)}
                  disabled={selectedCount === 0}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-bold disabled:opacity-40"
                  style={{ background: '#e7edeb', color: '#1f695d' }}
                >
                  <CalendarBlank size={13} weight="bold" aria-hidden="true" />
                  Date
                </button>
                <button
                  onClick={() => setBulkDeleteConfirm(true)}
                  disabled={selectedCount === 0}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-bold disabled:opacity-40"
                  style={{ background: '#fbeaea', color: '#ba1a1a' }}
                >
                  <Trash size={13} weight="bold" aria-hidden="true" />
                  Delete
                </button>
              </div>
            </div>
            {bulkError && (
              <p className="mb-3 rounded-xl px-3 py-2 text-[12px] font-semibold" style={{ background: '#fbeaea', color: '#ba1a1a' }}>
                Couldn’t update those transactions. Check your connection and try again.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Wallet balances — quick context + link to the Wallets page (hidden in
          select mode to keep the bulk toolbar uncluttered). */}
      {!selectMode && <WalletStrip />}

      {/* Filters toggle — expands the date / category / method controls */}
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          aria-controls="ledger-filters"
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors"
          style={{ background: '#f0f4f2', color: '#3f4946' }}
        >
          <SlidersHorizontal size={13} weight="bold" aria-hidden="true" />
          Filters
          {activePanelFilters > 0 && (
            <span
              className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
              style={{ background: '#1f695d' }}
            >
              {activePanelFilters}
            </span>
          )}
          <motion.span
            animate={{ rotate: filtersOpen ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="flex items-center"
            aria-hidden="true"
          >
            <CaretDown size={12} weight="bold" />
          </motion.span>
        </button>

        {/* Clear-all shortcut when any filter is active */}
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold"
            style={{ background: '#e7edeb', color: '#1f695d' }}
          >
            Clear all
            <X size={10} weight="bold" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Collapsible filter controls */}
      <AnimatePresence initial={false}>
        {filtersOpen && (
          <motion.div
            id="ledger-filters"
            key="ledger-filters"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="overflow-hidden"
          >
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
            <div className="mb-2.5">
              <FilterChips active={filter} onChange={setFilter} customChips={customChips} hiddenCategories={hiddenCategories} />
            </div>

            {/* Payment-method chips */}
            <div
              className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
              style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
              role="group"
              aria-label="Filter by payment method"
            >
              {([{ id: 'all' as const, short: 'Any method' }, ...PAYMENT_METHODS]).map((m) => {
                const active = methodFilter === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => setMethodFilter(m.id as PaymentMethodId | 'all')}
                    aria-pressed={active}
                    className="shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors"
                    style={
                      active
                        ? { background: '#475569', color: '#ffffff' }
                        : { background: '#f0f4f2', color: '#3f4946' }
                    }
                  >
                    {m.short}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                            onEdit={setEditingTx}
                            selectMode={selectMode}
                            selected={selectedIds.has(tx.id)}
                            onToggleSelect={tx.category.id === 'debts' ? undefined : toggleSelect}
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

      <TransactionEditSheet
        tx={editingTx}
        customCategories={customCategories}
        hiddenCategories={hiddenCategories}
        onClose={() => setEditingTx(null)}
        onSave={updateTransaction}
        onDelete={deleteTransaction}
      />

      <CategoryPickerSheet
        open={bulkPickerOpen}
        title={`Move ${selectedCount} to…`}
        customCategories={customCategories}
        hiddenCategories={hiddenCategories}
        onSelect={handleBulkCategory}
        onClose={() => setBulkPickerOpen(false)}
      />

      {/* Bulk date picker */}
      <DatePickerSheet
        open={bulkDatePickerOpen}
        value={toISO(new Date())}
        onSelect={handleBulkDate}
        onClose={() => setBulkDatePickerOpen(false)}
      />

      {/* Bulk delete confirmation */}
      <AnimatePresence>
        {bulkDeleteConfirm && (
          <>
            <motion.div
              className="fixed inset-0 z-[70]"
              style={{ background: 'rgba(0,53,46,0.28)', backdropFilter: 'blur(4px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setBulkDeleteConfirm(false)}
              aria-hidden="true"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Confirm bulk delete"
              className="fixed left-1/2 top-1/2 z-[71] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl p-5"
              style={{ background: '#ffffff', boxShadow: '0 24px 80px rgba(0,53,46,0.24)' }}
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            >
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(186,26,26,0.12)' }}>
                  <Trash size={17} weight="fill" style={{ color: '#ba1a1a' }} aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold" style={{ color: '#00352e' }}>
                  Delete {selectedCount} {selectedCount === 1 ? 'transaction' : 'transactions'}?
                </h3>
              </div>
              <p className="mb-4 text-[13px] leading-relaxed" style={{ color: '#3f4946' }}>
                This permanently removes the selected {selectedCount === 1 ? 'entry' : 'entries'}. This can’t be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setBulkDeleteConfirm(false)}
                  className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold"
                  style={{ background: '#f0f4f2', color: '#3f4946' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white"
                  style={{ background: '#ba1a1a' }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </>
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
