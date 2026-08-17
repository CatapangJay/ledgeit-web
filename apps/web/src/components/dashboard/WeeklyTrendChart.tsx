'use client'

import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency, formatCurrencyCompact } from '@/lib/formatters'
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

interface DayDatum {
  date: string
  expense: number
  income: number
  label: string
}

// ─── Custom tooltip ────────────────────────────────────────────────────────────

interface TooltipProps {
  active?: boolean
  payload?: { payload: DayDatum }[]
}

function TrendTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload
  return (
    <div
      className="rounded-xl px-3 py-2"
      style={{ background: '#00352e', boxShadow: '0 6px 20px rgba(0,53,46,0.28)' }}
    >
      <p className="font-mono text-[13px] font-bold" style={{ color: '#ffffff' }}>
        {formatCurrency(d.expense)}
      </p>
      {d.income > 0 && (
        <p className="font-mono text-[10px] font-semibold" style={{ color: '#8fc0b4' }}>
          +{formatCurrency(d.income)} income
        </p>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WeeklyTrendChart() {
  const transactions = useStore((s) => s.transactions)

  const days = useMemo(() => getLastNDays(7), [])

  const data = useMemo<DayDatum[]>(() => {
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

      {/* Line chart */}
      <div style={{ width: '100%', height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: 6 }}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1f695d" stopOpacity={0.24} />
                <stop offset="100%" stopColor="#1f695d" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fontWeight: 600, fill: '#a9c2bd' }}
              dy={4}
              interval={0}
            />
            {/* Hidden Y axis — used only to give the line vertical headroom */}
            <YAxis hide domain={[0, (max: number) => (max <= 0 ? 1 : max * 1.15)]} />
            <Tooltip
              content={<TrendTooltip />}
              cursor={{ stroke: '#cde0db', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Area
              type="monotone"
              dataKey="expense"
              stroke="#1f695d"
              strokeWidth={2.5}
              fill="url(#trendFill)"
              dot={{ r: 3, fill: '#ffffff', stroke: '#1f695d', strokeWidth: 2 }}
              activeDot={{ r: 5, fill: '#00352e', stroke: '#ffffff', strokeWidth: 2 }}
              isAnimationActive
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4" style={{ borderTop: '1px solid #f0f4f2', paddingTop: '10px' }}>
        {isEmpty ? (
          <span className="text-[11px]" style={{ color: '#a9c2bd' }}>
            Log an expense to start your weekly trend.
          </span>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: '#1f695d' }} />
            <span className="text-[10px] font-medium" style={{ color: '#6e9990' }}>Daily spending</span>
          </div>
        )}
      </div>
    </div>
  )
}
