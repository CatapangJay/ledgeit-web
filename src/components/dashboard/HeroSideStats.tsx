'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendUp, TrendDown, CalendarBlank, ChartLineUp } from '@phosphor-icons/react'
import { formatCurrencyCompact } from '@/lib/formatters'
import { useStore } from '@/lib/store'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ym(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// ─── Component ────────────────────────────────────────────────────────────────
// Renders on the right side of the hero card (md+ only). Surfaces forward-looking
// month context that isn't shown anywhere else on the dashboard.

export default function HeroSideStats() {
  const transactions = useStore((s) => s.transactions)

  const stats = useMemo(() => {
    const now = new Date()
    const thisMonth = ym(now)
    const lastMonth = ym(new Date(now.getFullYear(), now.getMonth() - 1, 1))

    const dayOfMonth = now.getDate()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const daysLeft = daysInMonth - dayOfMonth

    let thisExpense = 0
    let thisIncome = 0
    let lastNet = 0
    for (const tx of transactions) {
      if (tx.date.startsWith(thisMonth)) {
        if (tx.type === 'expense') thisExpense += tx.amount
        else thisIncome += tx.amount
      } else if (tx.date.startsWith(lastMonth)) {
        lastNet += tx.type === 'income' ? tx.amount : -tx.amount
      }
    }

    const thisNet = thisIncome - thisExpense
    const avgDay = thisExpense / Math.max(dayOfMonth, 1)
    const projectedSpend = avgDay * daysInMonth

    // Month-over-month net delta (percentage)
    let deltaPct: number | null = null
    if (lastNet !== 0) {
      deltaPct = ((thisNet - lastNet) / Math.abs(lastNet)) * 100
    }

    return { avgDay, projectedSpend, daysLeft, deltaPct }
  }, [transactions])

  const deltaUp = (stats.deltaPct ?? 0) >= 0

  const rows = [
    {
      key: 'delta',
      icon: deltaUp ? TrendUp : TrendDown,
      label: 'vs Last Month',
      value:
        stats.deltaPct === null
          ? '—'
          : `${deltaUp ? '+' : '−'}${Math.abs(Math.round(stats.deltaPct))}%`,
      tint: stats.deltaPct === null ? 'rgba(255,255,255,0.85)' : deltaUp ? '#7ee2a8' : '#f6a9a4',
    },
    {
      key: 'avg',
      icon: ChartLineUp,
      label: 'Avg / Day',
      value: formatCurrencyCompact(stats.avgDay),
      tint: 'rgba(255,255,255,0.92)',
    },
    {
      key: 'proj',
      icon: CalendarBlank,
      label: 'Proj. Spend',
      value: formatCurrencyCompact(stats.projectedSpend),
      tint: 'rgba(255,255,255,0.92)',
    },
  ]

  return (
    <div
      className="relative z-10 hidden shrink-0 flex-col justify-center gap-4 self-stretch pl-6 md:flex"
      style={{ borderLeft: '1px solid rgba(255,255,255,0.14)', minWidth: 168 }}
    >
      {rows.map((row, i) => {
        const Icon = row.icon
        return (
          <motion.div
            key={row.key}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + i * 0.08, type: 'spring', stiffness: 260, damping: 24 }}
            className="flex flex-col gap-1"
          >
            <div className="flex items-center gap-1.5">
              <Icon size={12} weight="bold" color="rgba(255,255,255,0.5)" aria-hidden="true" />
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                {row.label}
              </span>
            </div>
            <span className="font-mono text-[17px] font-bold leading-none" style={{ color: row.tint }}>
              {row.value}
            </span>
          </motion.div>
        )
      })}

      <div className="mt-1 flex items-center gap-1.5">
        <span
          className="rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold"
          style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.82)' }}
        >
          {stats.daysLeft}d left this month
        </span>
      </div>
    </div>
  )
}
