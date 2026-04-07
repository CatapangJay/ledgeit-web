'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import MetricStrip from '@/components/insights/MetricStrip'
import BudgetBar from '@/components/insights/BudgetBar'
import SpendDonut from '@/components/insights/SpendDonut'
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
  const transactions = useStore((s) => s.transactions)
  const budgetLimits = useStore((s) => s.budgetLimits)

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
      color: netCashflow >= 0 ? 'text-emerald-400' : 'text-rose-400',
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

  const budgetCategories = CATEGORIES.filter(
    (c) => c.id !== 'income' && c.id !== 'other'
  )

  return (
    <div className="px-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 pt-12">
        <h1 className="font-mono text-lg font-semibold tracking-tighter text-ledge-data">
          Insights
        </h1>
        <div className="flex items-center gap-3">
          <motion.button
            aria-label="Previous month"
            onClick={() => setMonthOffset((o) => o - 1)}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-ledge-border text-ledge-muted"
          >
            <CaretLeft size={13} weight="bold" aria-hidden="true" />
          </motion.button>
          <span className="font-mono text-[11px] text-ledge-muted uppercase tracking-wide min-w-[96px] text-center">
            {label}
          </span>
          <motion.button
            aria-label="Next month"
            onClick={() => setMonthOffset((o) => Math.min(o + 1, 0))}
            disabled={monthOffset >= 0}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-ledge-border text-ledge-muted disabled:opacity-30"
          >
            <CaretRight size={13} weight="bold" aria-hidden="true" />
          </motion.button>
        </div>
      </div>

      {/* Metric strip */}
      <MetricStrip metrics={metrics} />

      {/* Spend vs Saved donut */}
      <SpendDonut spent={totalExpense} saved={Math.max(totalIncome - totalExpense, 0)} />

      {/* Section label */}
      <div className="border-t border-ledge-border py-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ledge-muted">
          Budget Tracker
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
          <p className="text-sm text-ledge-muted">No spending data for this period.</p>
          <p className="text-xs text-ledge-border">Add transactions to see your patterns.</p>
        </div>
      )}
    </div>
  )
}
