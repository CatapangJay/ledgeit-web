'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CaretLeft, CaretRight, Sliders, ArrowsDownUp } from '@phosphor-icons/react'
import MetricStrip from '@/components/insights/MetricStrip'
import BudgetBar from '@/components/insights/BudgetBar'
import CategoryBreakdownList from '@/components/insights/CategoryBreakdownList'
import SpendDonut from '@/components/insights/SpendDonut'
import WalletInsightsCard from '@/components/insights/WalletInsightsCard'
import MonthTrendChart from '@/components/dashboard/MonthTrendChart'
// import RecurringPaymentsCard from '@/components/dashboard/RecurringPaymentsCard' // temporarily disabled — see usage below
import BiggestExpenseCard from '@/components/dashboard/BiggestExpenseCard'
import BudgetAllocationSheet from '@/components/budget/BudgetAllocationSheet'
import { useStore } from '@/lib/store'
import { useDeferredMount } from '@/lib/useDeferredMount'
import { formatCurrency, formatMonthLabel } from '@/lib/formatters'
import { CATEGORIES, isSpend, isEarn, spendAmount } from '@/types'

function getMonthBounds(offset: number): { start: string; end: string; label: string } {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const year = d.getFullYear()
  const month = d.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const pad = (n: number) => String(n + 1).padStart(2, '0')
  const start = `${year}-${pad(month)}-01`
  const end = `${year}-${pad(month)}-${String(daysInMonth).padStart(2, '0')}`
  return { start, end, label: formatMonthLabel(start) }
}

type SortMode = 'spent' | 'remaining' | 'name'

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: 'spent', label: 'Most spent' },
  { id: 'remaining', label: 'Closest to limit' },
  { id: 'name', label: 'A–Z' },
]

export default function InsightsPage() {
  const [monthOffset, setMonthOffset] = useState(0)
  const [allocationSheetOpen, setAllocationSheetOpen] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('spent')
  // Which Budget Flow category is expanded to show its breakdown (null = none).
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  // Defer the charts/metrics one paint so the header + month switcher are instant.
  const contentReady = useDeferredMount()
  const transactions = useStore((s) => s.transactions)
  const ensureFullHistory = useStore((s) => s.ensureFullHistory)
  const budgetLimits = useStore((s) => s.budgetLimits)
  const budgetAllocations = useStore((s) => s.budgetAllocations)
  const customCategories = useStore((s) => s.customCategories)
  const hiddenCategories = useStore((s) => s.hiddenCategories)

  // Insights browses arbitrary months and charts multi-week trends that reach
  // past the bounded initial window — load the full history on mount.
  useEffect(() => {
    ensureFullHistory()
  }, [ensureFullHistory])

  const activePlan = budgetAllocations.find((a) => a.isActive)

  const { start, end, label } = useMemo(() => getMonthBounds(monthOffset), [monthOffset])

  const monthTxns = useMemo(
    () => transactions.filter((t) => t.date >= start && t.date <= end),
    [transactions, start, end]
  )

  const totalIncome = monthTxns
    .filter((t) => isEarn(t))
    .reduce((s, t) => s + t.amount, 0)

  // Net category spend — reimbursements subtract (spendAmount).
  const totalExpense = monthTxns
    .filter((t) => isSpend(t))
    .reduce((s, t) => s + spendAmount(t), 0)

  const netCashflow = totalIncome - totalExpense

  // Average daily spend — use days elapsed (capped at today for current month)
  const now = new Date()
  const isCurrentMonth = monthOffset === 0
  const daysElapsed = isCurrentMonth
    ? Math.max(now.getDate(), 1)
    : new Date(
        parseInt(end.split('-')[0]),
        parseInt(end.split('-')[1]) - 1 + 1,
        0
      ).getDate()
  const avgDaySpend = totalExpense / daysElapsed

  const daysInMonth = new Date(
    parseInt(end.split('-')[0]),
    parseInt(end.split('-')[1]),
    0
  ).getDate()
  const projectedEOM = avgDaySpend * daysInMonth

  // Per-category spent
  const categorySpend = useMemo(() => {
    return monthTxns
      .filter((t) => isSpend(t))
      .reduce<Record<string, number>>((acc, t) => {
        // Reimbursements subtract from the category's net spend (spendAmount).
        acc[t.category.id] = (acc[t.category.id] ?? 0) + spendAmount(t)
        return acc
      }, {})
  }, [monthTxns])

  // Plain-language read on cashflow so non-financial users get a clear takeaway.
  // Savings rate = how much of what you earned you kept.
  const savingsRate = totalIncome > 0 ? netCashflow / totalIncome : 0
  let cashflowSub: string
  let cashflowHint: string
  if (totalIncome === 0 && totalExpense === 0) {
    cashflowSub = 'no activity'
    cashflowHint = 'No income or spending logged yet this month.'
  } else if (netCashflow > 0 && savingsRate >= 0.2) {
    cashflowSub = 'looking great'
    cashflowHint = 'You kept more than you spent — great job, keep it up!'
  } else if (netCashflow > 0) {
    cashflowSub = 'in the green'
    cashflowHint = 'You earned more than you spent this month. Nice work.'
  } else if (netCashflow === 0) {
    cashflowSub = 'breaking even'
    cashflowHint = 'You spent exactly what you earned — try to keep a little.'
  } else {
    cashflowSub = 'overspending'
    cashflowHint = 'You spent more than you earned this month. Ease up where you can.'
  }

  const metrics = [
    {
      label: 'Money Left',
      value: formatCurrency(Math.abs(netCashflow)),
      color: netCashflow >= 0 ? '#1f6950' : '#ba1a1a',
      sub: cashflowSub,
      hint: cashflowHint,
    },
    {
      label: 'Daily Spend',
      value: formatCurrency(avgDaySpend),
      sub: 'per day',
      hint: 'On average, this is how much you spend each day this month.',
    },
    {
      label: 'Month Forecast',
      value: formatCurrency(projectedEOM),
      sub: 'est. total',
      hint: isCurrentMonth
        ? 'If you keep spending at this pace, this is your total by month-end.'
        : 'Your total spending for this month.',
    },
  ]

  const budgetCategories = useMemo(
    () => [
      ...CATEGORIES.filter(
        (c) =>
          c.id !== 'income' &&
          c.id !== 'other' &&
          c.id !== 'debts' &&
          c.id !== 'transfers' &&
          !hiddenCategories.includes(c.id)
      ),
      ...customCategories.map((c) => ({
        id: c.id,
        label: c.name,
        icon: c.icon,
        color: c.textColor,
        bgColor: c.bgColor,
        keywords: [] as string[],
      })),
    ],
    [customCategories, hiddenCategories]
  )

  // Categories with an effective limit/spend, filtered to those with activity,
  // then sorted per the selected mode. `limit` mirrors the bar's fallback so
  // "closest to limit" ranks by the same ratio the bar renders.
  const visibleCategories = useMemo(() => {
    const rows = budgetCategories
      .map((cat) => {
        const rawLimit = budgetLimits.find((b) => b.categoryId === cat.id)?.limit ?? 0
        const spent = categorySpend[cat.id] ?? 0
        return { cat, spent, limit: rawLimit > 0 ? rawLimit : spent * 1.5, hasLimit: rawLimit > 0 }
      })
      .filter((r) => !(r.limit === 0 && r.spent === 0))

    const ratio = (r: { spent: number; limit: number }) => (r.limit > 0 ? r.spent / r.limit : 0)
    rows.sort((a, b) => {
      if (sortMode === 'name') return a.cat.label.localeCompare(b.cat.label)
      if (sortMode === 'remaining') return ratio(b) - ratio(a)
      return b.spent - a.spent // 'spent'
    })
    return rows
  }, [budgetCategories, budgetLimits, categorySpend, sortMode])

  // This month's transactions grouped by category id, for the expanded breakdown.
  const txnsByCategory = useMemo(() => {
    return monthTxns.reduce<Record<string, typeof monthTxns>>((acc, t) => {
      (acc[t.category.id] ??= []).push(t)
      return acc
    }, {})
  }, [monthTxns])

  function toggleCategory(categoryId: string) {
    setExpandedCategory((prev) => (prev === categoryId ? null : categoryId))
  }

  return (
    <div className="px-5 pb-4 md:px-8 lg:px-10" style={{ background: '#f8faf9', minHeight: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 pt-12 md:pt-8">
        <h1 className="text-base font-bold tracking-tight" style={{ color: '#00352e' }}>
          Your Financial Breath
        </h1>
        <div className="flex items-center gap-3">
          <motion.button
            aria-label="Previous month"
            onClick={() => setMonthOffset((o) => o - 1)}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: '#f0f4f2', color: '#3f4946' }}
          >
            <CaretLeft size={13} weight="bold" aria-hidden="true" />
          </motion.button>
          <span className="min-w-24 text-center text-[11px] font-semibold" style={{ color: '#3f4946' }}>
            {label}
          </span>
          <motion.button
            aria-label="Next month"
            onClick={() => setMonthOffset((o) => Math.min(o + 1, 0))}
            disabled={monthOffset >= 0}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-30"
            style={{ background: '#f0f4f2', color: '#3f4946' }}
          >
            <CaretRight size={13} weight="bold" aria-hidden="true" />
          </motion.button>
        </div>
      </div>

      {/* Active budget plan row */}
      <motion.button
        aria-label={activePlan ? `Budget plan: ${activePlan.name}. Tap to change.` : 'Set up a budget plan'}
        whileTap={{ scale: 0.97 }}
        onClick={() => setAllocationSheetOpen(true)}
        className="mb-3 flex w-full items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: '#f0f4f2' }}
      >
        <Sliders size={13} weight="bold" style={{ color: '#1f695d' }} aria-hidden="true" />
        <span className="flex-1 text-left text-xs font-semibold" style={{ color: '#191c1c' }}>
          {activePlan ? activePlan.name : 'No active plan'}
        </span>
        <span className="text-[11px] font-semibold" style={{ color: '#1f695d' }}>
          Change
        </span>
      </motion.button>

      {!contentReady ? (
        <div className="mt-4 flex flex-col gap-4">
          <div className="skeleton h-20 rounded-2xl" />
          <div className="skeleton h-56 rounded-3xl" />
          <div className="skeleton h-40 rounded-3xl" />
        </div>
      ) : (
        <>
      {/* ── Responsive content grid: stacked mobile, 2-col desktop ───────── */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
        {/* Left col: metrics + donut */}
        <div>
          {/* Metric strip */}
          <div className="mt-4">
            <MetricStrip metrics={metrics} />
          </div>

          {/* Spend vs Saved donut */}
          <div className="mt-4">
            <SpendDonut spent={totalExpense} saved={Math.max(totalIncome - totalExpense, 0)} />
          </div>

          {/* Daily spending trend for the selected month */}
          <div className="mt-4">
            <MonthTrendChart start={start} end={end} />
          </div>

          {/* How your wallets grew this month (self-hides when none) */}
          <div className="mt-4">
            <WalletInsightsCard start={start} end={end} />
          </div>

          {/* <RecurringPaymentsCard /> */}
          <div className="mt-4">
            <BiggestExpenseCard />
          </div>
        </div>

        {/* Right col: budget breakdown */}
        <div>
          {/* Section label + sort */}
          <div className="py-4 mt-2 flex items-center justify-between gap-2">
            <span className="text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: '#00352e' }}>
              Budget Flow
            </span>
            {visibleCategories.length > 1 && (
              <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: '#f0f4f2' }}>
                <ArrowsDownUp size={12} weight="bold" style={{ color: '#6e9990' }} aria-hidden="true" />
                <select
                  aria-label="Sort categories"
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="bg-transparent text-[11px] font-semibold outline-none"
                  style={{ color: '#3f4946' }}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Budget bars — click a category to expand its breakdown for the month */}
          {visibleCategories.map(({ cat, spent, limit }) => (
            <BudgetBar
              key={cat.id}
              category={cat}
              spent={spent}
              limit={limit}
              expanded={expandedCategory === cat.id}
              onToggle={toggleCategory}
            >
              <CategoryBreakdownList transactions={txnsByCategory[cat.id] ?? []} />
            </BudgetBar>
          ))}

          {/* Empty state */}
          {Object.keys(categorySpend).length === 0 && (
            <div className="flex flex-col items-start gap-2 py-10">
              <p className="text-sm font-medium" style={{ color: '#6e9990' }}>No spending data for this period.</p>
              <p className="text-xs" style={{ color: '#cde0db' }}>Add transactions to see your patterns.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Spending patterns ─────────────────────────────────────────────── */}
      {/* Recurring bills card temporarily disabled (value under review) — see dashboard/page.tsx. */}
        </>
      )}

      {/* Budget allocation sheet */}
      <BudgetAllocationSheet
        open={allocationSheetOpen}
        onClose={() => setAllocationSheetOpen(false)}
      />
    </div>
  )
}
