'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { CaretLeft, CaretRight, Sliders } from '@phosphor-icons/react'
import MetricStrip from '@/components/insights/MetricStrip'
import BudgetBar from '@/components/insights/BudgetBar'
import SpendDonut from '@/components/insights/SpendDonut'
import BudgetAllocationSheet from '@/components/budget/BudgetAllocationSheet'
import { useStore } from '@/lib/store'
import { formatCurrency, formatMonthLabel } from '@/lib/formatters'
import { CATEGORIES } from '@/types'

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

export default function InsightsPage() {
  const [monthOffset, setMonthOffset] = useState(0)
  const [allocationSheetOpen, setAllocationSheetOpen] = useState(false)
  const transactions = useStore((s) => s.transactions)
  const budgetLimits = useStore((s) => s.budgetLimits)
  const budgetAllocations = useStore((s) => s.budgetAllocations)
  const customCategories = useStore((s) => s.customCategories)

  const activePlan = budgetAllocations.find((a) => a.isActive)

  const { start, end, label } = useMemo(() => getMonthBounds(monthOffset), [monthOffset])

  const monthTxns = useMemo(
    () => transactions.filter((t) => t.date >= start && t.date <= end),
    [transactions, start, end]
  )

  const totalIncome = monthTxns
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0)

  const totalExpense = monthTxns
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)

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
      .filter((t) => t.type === 'expense')
      .reduce<Record<string, number>>((acc, t) => {
        acc[t.category.id] = (acc[t.category.id] ?? 0) + t.amount
        return acc
      }, {})
  }, [monthTxns])

  const metrics = [
    {
      label: 'Net Cashflow',
      value: formatCurrency(Math.abs(netCashflow)),
      color: netCashflow >= 0 ? '#1f6950' : '#ba1a1a',
      sub: netCashflow >= 0 ? 'positive' : 'negative',
    },
    {
      label: 'Avg / Day',
      value: formatCurrency(avgDaySpend),
      sub: 'spending',
    },
    {
      label: 'Proj. EOM',
      value: formatCurrency(projectedEOM),
      sub: 'at this rate',
    },
  ]

  const budgetCategories = useMemo(
    () => [
      ...CATEGORIES.filter((c) => c.id !== 'income' && c.id !== 'other'),
      ...customCategories.map((c) => ({
        id: c.id,
        label: c.name,
        icon: c.icon,
        color: c.textColor,
        bgColor: c.bgColor,
        keywords: [] as string[],
      })),
    ],
    [customCategories]
  )

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
        </div>

        {/* Right col: budget breakdown */}
        <div>
          {/* Section label */}
          <div className="py-4 mt-2">
            <span className="text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: '#00352e' }}>
              Budget Flow
            </span>
          </div>

          {/* Budget bars */}
          {budgetCategories.map((cat) => {
            const limit = budgetLimits.find((b) => b.categoryId === cat.id)?.limit ?? 0
            const spent = categorySpend[cat.id] ?? 0
            if (limit === 0 && spent === 0) return null
            return (
              <BudgetBar
                key={cat.id}
                category={cat}
                spent={spent}
                limit={limit > 0 ? limit : spent * 1.5}
              />
            )
          })}

          {/* Empty state */}
          {Object.keys(categorySpend).length === 0 && (
            <div className="flex flex-col items-start gap-2 py-10">
              <p className="text-sm font-medium" style={{ color: '#6e9990' }}>No spending data for this period.</p>
              <p className="text-xs" style={{ color: '#cde0db' }}>Add transactions to see your patterns.</p>
            </div>
          )}
        </div>
      </div>

      {/* Budget allocation sheet */}
      <BudgetAllocationSheet
        open={allocationSheetOpen}
        onClose={() => setAllocationSheetOpen(false)}
      />
    </div>
  )
}
