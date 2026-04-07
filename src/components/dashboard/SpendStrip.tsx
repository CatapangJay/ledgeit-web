'use client'

import { useStore } from '@/lib/store'
import { formatCurrency } from '@/lib/formatters'
import { CATEGORIES } from '@/types'

const CATEGORY_HEX: Record<string, string> = {
  restaurants: '#fb923c',
  groceries:   '#a3e635',
  transport:   '#38bdf8',
  shopping:    '#a78bfa',
  utilities:   '#facc15',
  entertainment:'#f472b6',
  health:      '#f87171',
  income:      '#34d399',
  other:       '#9ca3af',
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

  const catCount = Object.keys(breakdown).length

  return (
    <div className="border-t border-ledge-border py-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ledge-muted">
          Today
        </span>
        <span className="font-mono text-sm font-medium text-rose-400">
          −{formatCurrency(total)}
        </span>
      </div>

      {/* Category breakdown bar */}
      <div className="flex h-1.5 w-full overflow-hidden rounded-full gap-[2px]">
        {Object.entries(breakdown).map(([catId, amount], i) => {
          const cat = CATEGORIES.find((c) => c.id === catId)
          return (
            <div
              key={catId}
              title={`${cat?.label ?? catId}: ${formatCurrency(amount)}`}
              style={{
                width: `${(amount / total) * 100}%`,
                backgroundColor: CATEGORY_HEX[catId] ?? '#9ca3af',
                borderRadius:
                  i === 0 ? '9999px 0 0 9999px'
                  : i === catCount - 1 ? '0 9999px 9999px 0'
                  : '0',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
