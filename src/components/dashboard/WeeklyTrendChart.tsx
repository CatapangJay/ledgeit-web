'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { formatCurrencyCompact } from '@/lib/formatters'
import { useStore } from '@/lib/store'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLastNDays(n: number): string[] {
  const days: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    days.push(`${y}-${m}-${day}`)
  }
  return days
}

function weekdayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WeeklyTrendChart() {
  const transactions = useStore((s) => s.transactions)

  const days = useMemo(() => getLastNDays(7), [])
  const todayStr = days[days.length - 1]

  const data = useMemo(() => {
    return days.map((date) => {
      const dayTxns = transactions.filter((t) => t.date === date)
      const expense = dayTxns
        .filter((t) => t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0)
      const income = dayTxns
        .filter((t) => t.type === 'income')
        .reduce((s, t) => s + t.amount, 0)
      return { date, expense, income, label: weekdayLabel(date) }
    })
  }, [days, transactions])

  const totalWeek = data.reduce((s, d) => s + d.expense, 0)
  const avgDay = totalWeek / 7
  const maxExpense = Math.max(...data.map((d) => d.expense), 1)
  const isEmpty = totalWeek === 0 && data.every((d) => d.income === 0)

  return (
    <div
      className="rounded-2xl px-5 py-4"
      style={{
        background: '#ffffff',
        boxShadow: '0 4px 24px rgba(0,53,46,0.07)',
      }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <span
          className="text-[12px] font-bold uppercase tracking-[0.12em]"
          style={{ color: '#00352e' }}
        >
          7-Day Trend
        </span>
        <span className="font-mono text-[11px] font-semibold" style={{ color: '#6e9990' }}>
          {isEmpty ? 'No activity' : `Avg ${formatCurrencyCompact(avgDay)}/day`}
        </span>
      </div>

      {/* Bars */}
      <div className="flex items-end justify-between gap-2" style={{ height: 88 }}>
        {data.map((d, i) => {
          const heightPct =
            d.expense > 0 ? Math.max((d.expense / maxExpense) * 100, 6) : 2
          const isToday = d.date === todayStr

          return (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="relative flex h-full w-full items-end justify-center">
                {d.income > 0 && (
                  <div
                    className="absolute top-0 h-1.5 w-1.5 rounded-full"
                    style={{ background: '#1f6950' }}
                  />
                )}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%` }}
                  transition={{ type: 'spring', stiffness: 80, damping: 18, delay: i * 0.05 }}
                  className="w-full max-w-[22px] rounded-md"
                  style={{
                    background: isToday ? '#00352e' : d.expense > 0 ? '#a9c9c2' : '#f0f4f2',
                  }}
                />
              </div>
              <span
                className="text-[10px] font-semibold"
                style={{ color: isToday ? '#00352e' : '#a9c2bd' }}
              >
                {d.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4" style={{ borderTop: '1px solid #f0f4f2', paddingTop: '10px' }}>
        {isEmpty ? (
          <span className="text-[11px]" style={{ color: '#a9c2bd' }}>
            Log an expense to start your weekly trend.
          </span>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-sm" style={{ background: '#00352e' }} />
              <span className="text-[10px] font-medium" style={{ color: '#6e9990' }}>Spending</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#1f6950' }} />
              <span className="text-[10px] font-medium" style={{ color: '#6e9990' }}>Income day</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
