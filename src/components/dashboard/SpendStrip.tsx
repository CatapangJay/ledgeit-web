'use client'

import { useStore } from '@/lib/store'
import { formatCurrency } from '@/lib/formatters'
import { CATEGORIES } from '@/types'

const CATEGORY_HEX: Record<string, string> = {
  restaurants:   '#1f695d',
  groceries:     '#2d9a6a',
  transport:     '#0284c7',
  shopping:      '#7c3aed',
  utilities:     '#d97706',
  entertainment: '#db2777',
  health:        '#059669',
  income:        '#1f6950',
  other:         '#6e9990',
}

export default function SpendStrip() {
  const transactions = useStore((s) => s.transactions)
  const getDailyTotal = useStore((s) => s.getDailyTotal)
  const today = new Date().toISOString().split('T')[0]
  const todayExpenses = transactions.filter((t) => t.date === today && t.type === 'expense')
  const total = todayExpenses.reduce((sum, t) => sum + t.amount, 0)
  const todayIncome = getDailyTotal(today, 'income')

  const breakdown = todayExpenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.category.id] = (acc[t.category.id] ?? 0) + t.amount
    return acc
  }, {})

  const now = new Date()
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div
      className="rounded-2xl px-5 py-4"
      style={{
        background: '#ffffff',
        boxShadow: '0 4px 24px rgba(0,53,46,0.07)',
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className="text-[12px] font-bold uppercase tracking-[0.12em]"
          style={{ color: '#00352e' }}
        >
          Today
        </span>
        <span className="font-mono text-[11px]" style={{ color: '#6e9990' }}>
          {dateLabel}
        </span>
      </div>

      {todayExpenses.length === 0 ? (
        <div className="flex flex-col gap-1">
          {/* Empty bar placeholder */}
          <div className="h-2 w-full rounded-full" style={{ background: '#f0f4f2' }} />
          <p className="mt-2 text-[12px]" style={{ color: '#6e9990' }}>
            Nothing logged yet today.
          </p>
        </div>
      ) : (
        <>
          {/* Totals row */}
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-mono text-base font-bold" style={{ color: '#ba1a1a' }}>
              −{formatCurrency(total)}
            </span>
            {todayIncome > 0 && (
              <span className="font-mono text-[13px] font-semibold" style={{ color: '#1f6950' }}>
                +{formatCurrency(todayIncome)}
              </span>
            )}
          </div>

          {/* Category breakdown bar */}
          <div className="flex h-2 w-full overflow-hidden rounded-full gap-0.5">
            {Object.entries(breakdown).map(([catId, amount]) => {
              const cat = CATEGORIES.find((c) => c.id === catId)
              return (
                <div
                  key={catId}
                  title={`${cat?.label ?? catId}: ${formatCurrency(amount)}`}
                  style={{
                    width: `${(amount / total) * 100}%`,
                    backgroundColor: CATEGORY_HEX[catId] ?? '#6e9990',
                  }}
                />
              )
            })}
          </div>

          {/* Category dots */}
          <div className="mt-2.5 flex flex-wrap gap-2">
            {Object.entries(breakdown).map(([catId, amount]) => {
              const cat = CATEGORIES.find((c) => c.id === catId)
              return (
                <div key={catId} className="flex items-center gap-1">
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: CATEGORY_HEX[catId] ?? '#6e9990' }}
                  />
                  <span className="text-[11px] font-medium" style={{ color: '#3f4946' }}>
                    {cat?.label ?? catId}
                  </span>
                  <span className="font-mono text-[11px]" style={{ color: '#6e9990' }}>
                    {formatCurrency(amount)}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
