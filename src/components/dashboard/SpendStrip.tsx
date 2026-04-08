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
  const today = new Date().toISOString().split('T')[0]
  const todayExpenses = transactions.filter((t) => t.date === today && t.type === 'expense')
  const total = todayExpenses.reduce((sum, t) => sum + t.amount, 0)

  if (todayExpenses.length === 0) return null

  // Aggregate by category
  const breakdown = todayExpenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.category.id] = (acc[t.category.id] ?? 0) + t.amount
    return acc
  }, {})

  return (
    <div
      className="rounded-2xl px-5 py-4"
      style={{
        background: '#ffffff',
        boxShadow: '0 4px 24px rgba(0,53,46,0.07)',
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: '#00352e' }}>
          Today
        </span>
        <span className="font-mono text-sm font-bold" style={{ color: '#ba1a1a' }}>
          −{formatCurrency(total)}
        </span>
      </div>

      {/* Category breakdown bar — rounded pill */}
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
    </div>
  )
}
