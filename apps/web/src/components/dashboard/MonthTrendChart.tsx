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
import { isSpend, isEarn, spendAmount } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Every ISO date (YYYY-MM-DD) from start to end, inclusive. */
function daysInRange(start: string, end: string): string[] {
  const out: string[] = []
  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)
  const cur = new Date(sy, sm - 1, sd)
  const last = new Date(ey, em - 1, ed)
  while (cur <= last) {
    const y = cur.getFullYear()
    const m = String(cur.getMonth() + 1).padStart(2, '0')
    const d = String(cur.getDate()).padStart(2, '0')
    out.push(`${y}-${m}-${d}`)
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

/** Day-of-month number as the axis label (e.g. "1", "15", "31"). */
function dayLabel(dateStr: string): string {
  return String(Number(dateStr.split('-')[2]))
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
  const [y, m, day] = d.date.split('-').map(Number)
  const dateLabel = new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return (
    <div
      className="rounded-xl px-3 py-2"
      style={{ background: '#00352e', boxShadow: '0 6px 20px rgba(0,53,46,0.28)' }}
    >
      <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wide" style={{ color: '#8fc0b4' }}>
        {dateLabel}
      </p>
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

interface Props {
  /** Inclusive ISO bounds of the month to chart (from the insights page). */
  start: string
  end: string
}

export default function MonthTrendChart({ start, end }: Props) {
  const transactions = useStore((s) => s.transactions)

  const days = useMemo(() => daysInRange(start, end), [start, end])

  const data = useMemo<DayDatum[]>(() => {
    // Bucket the month's transactions by date in one pass, then map days.
    const byDate = new Map<string, { expense: number; income: number }>()
    for (const t of transactions) {
      if (t.date < start || t.date > end) continue
      // Debts + transfers move money between your own pockets — never charted.
      if (!isSpend(t) && !isEarn(t)) continue
      const bucket = byDate.get(t.date) ?? { expense: 0, income: 0 }
      // Reimbursements subtract from category spend (spendAmount).
      if (isSpend(t)) bucket.expense += spendAmount(t)
      else bucket.income += t.amount
      byDate.set(t.date, bucket)
    }
    return days.map((date) => {
      const b = byDate.get(date)
      return { date, expense: b?.expense ?? 0, income: b?.income ?? 0, label: dayLabel(date) }
    })
  }, [days, transactions, start, end])

  const totalMonth = data.reduce((s, d) => s + d.expense, 0)
  const activeDays = data.filter((d) => d.expense > 0).length
  const avgActiveDay = activeDays > 0 ? totalMonth / activeDays : 0
  const isEmpty = totalMonth === 0 && data.every((d) => d.income === 0)

  // Show a tick roughly every 3rd day (≈10 labels across a month) so the axis is
  // detailed but not crowded, and always include the last day of the month.
  const step = 3
  const lastIdx = days.length - 1
  const ticks = data
    .filter((_, i) => i % step === 0 || i === lastIdx)
    .map((d) => d.label)

  return (
    <div
      className="rounded-2xl px-4 py-3"
      style={{
        background: '#ffffff',
        boxShadow: '0 4px 24px rgba(0,53,46,0.07)',
      }}
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <span
          className="text-[11px] font-bold uppercase tracking-[0.12em]"
          style={{ color: '#00352e' }}
        >
          Daily Trend
        </span>
        <span className="font-mono text-[10px] font-semibold" style={{ color: '#6e9990' }}>
          {isEmpty ? 'No activity' : `Avg ${formatCurrencyCompact(avgActiveDay)}/active day`}
        </span>
      </div>

      {/* Line chart */}
      <div style={{ width: '100%', height: 170 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
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
              tick={{ fontSize: 9, fontWeight: 600, fill: '#a9c2bd' }}
              dy={4}
              ticks={ticks}
              interval={0}
            />
            <YAxis
              width={40}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 9, fontWeight: 600, fill: '#a9c2bd' }}
              tickFormatter={(v: number) => (v > 0 ? formatCurrencyCompact(v) : '')}
              domain={[0, (max: number) => (max <= 0 ? 1 : max * 1.15)]}
            />
            <Tooltip
              content={<TrendTooltip />}
              cursor={{ stroke: '#cde0db', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Area
              type="monotone"
              dataKey="expense"
              stroke="#1f695d"
              strokeWidth={2}
              fill="url(#trendFill)"
              dot={false}
              activeDot={{ r: 4, fill: '#00352e', stroke: '#ffffff', strokeWidth: 2 }}
              isAnimationActive
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
