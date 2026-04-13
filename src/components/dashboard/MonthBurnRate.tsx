'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { formatCurrency } from '@/lib/formatters'
import { useStore } from '@/lib/store'

export default function MonthBurnRate() {
  const getMonthlyTotal = useStore((s) => s.getMonthlyTotal)
  const budgetLimits = useStore((s) => s.budgetLimits)

  const { spent, totalBudget, dayOfMonth, daysInMonth, spentPct, dayPct, remaining, pace } =
    useMemo(() => {
      const now = new Date()
      const dayOfMonth = now.getDate()
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const spent = getMonthlyTotal('expense')
      const totalBudget = budgetLimits
        .filter((b) => b.cycle === 'monthly')
        .reduce((s, b) => s + b.limit, 0)
      const spentPct = totalBudget > 0 ? (spent / totalBudget) * 100 : 0
      const dayPct = (dayOfMonth / daysInMonth) * 100
      const pace = spentPct - dayPct // positive = running ahead of budget
      const remaining = Math.max(totalBudget - spent, 0)
      return { spent, totalBudget, dayOfMonth, daysInMonth, spentPct, dayPct, remaining, pace }
    }, [getMonthlyTotal, budgetLimits])

  const barColor =
    spentPct > 90 ? '#ba1a1a' : spentPct > 70 ? '#d97706' : '#1f695d'

  const paceText =
    pace > 15
      ? 'Overspending pace'
      : pace > 5
        ? 'Slightly ahead of pace'
        : pace < -10
          ? 'Well under pace'
          : 'On track'

  const paceColor =
    pace > 15 ? '#ba1a1a' : pace > 5 ? '#d97706' : '#1f6950'

  if (totalBudget === 0) return null

  return (
    <div
      className="rounded-2xl px-5 py-4"
      style={{
        background: '#ffffff',
        boxShadow: '0 4px 24px rgba(0,53,46,0.07)',
      }}
    >
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between">
        <span
          className="text-[12px] font-bold uppercase tracking-[0.12em]"
          style={{ color: '#00352e' }}
        >
          Monthly Budget
        </span>
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={{ color: paceColor, background: `${paceColor}14` }}
        >
          {paceText}
        </span>
      </div>

      {/* Spent vs budget label row */}
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-mono text-base font-bold" style={{ color: '#191c1c' }}>
          {formatCurrency(spent)}
        </span>
        <span className="font-mono text-[13px]" style={{ color: '#6e9990' }}>
          of {formatCurrency(totalBudget)}
        </span>
      </div>

      {/* Compound bar: day progress (ghost) + spend (fill) */}
      <div
        className="relative h-2.5 w-full overflow-hidden rounded-full"
        style={{ background: '#f0f4f2' }}
      >
        {/* Day-of-month ghost marker */}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${dayPct}%`, background: '#e7edeb' }}
        />
        {/* Spend fill */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(spentPct, 100)}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 18, delay: 0.2 }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: barColor }}
        />
      </div>

      {/* Footer stats */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] font-medium" style={{ color: '#6e9990' }}>
          Day {dayOfMonth} of {daysInMonth}
        </span>
        <span className="font-mono text-[11px] font-semibold" style={{ color: '#1f6950' }}>
          {formatCurrency(remaining)} left
        </span>
      </div>
    </div>
  )
}
