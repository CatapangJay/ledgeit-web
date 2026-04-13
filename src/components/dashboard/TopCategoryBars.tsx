'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ArrowRight } from '@phosphor-icons/react'
import { formatCurrencyCompact } from '@/lib/formatters'
import { getIconComponent } from '@/lib/iconMap'
import { useStore } from '@/lib/store'
import { CATEGORIES } from '@/types'

const CATEGORY_HEX: Record<string, string> = {
  restaurants:   '#c2410c',
  groceries:     '#4d7c0f',
  transport:     '#0369a1',
  shopping:      '#7c3aed',
  utilities:     '#b45309',
  entertainment: '#be185d',
  health:        '#be123c',
  income:        '#1f6950',
  other:         '#64748b',
}

const TOP_N = 4

export default function TopCategoryBars() {
  const router = useRouter()
  const transactions = useStore((s) => s.transactions)
  const budgetLimits = useStore((s) => s.budgetLimits)

  const categories = useMemo(() => {
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const byCategory: Record<string, number> = {}
    for (const tx of transactions) {
      if (tx.type !== 'expense' || !tx.date.startsWith(month)) continue
      byCategory[tx.category.id] = (byCategory[tx.category.id] ?? 0) + tx.amount
    }

    return Object.entries(byCategory)
      .map(([id, spent]) => {
        const limit = budgetLimits.find((b) => b.categoryId === id)?.limit ?? 0
        const cat = CATEGORIES.find((c) => c.id === id)
        const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0
        return {
          id,
          spent,
          limit,
          pct,
          label: cat?.label ?? id,
          icon: cat?.icon ?? 'DotsThree',
        }
      })
      .sort((a, b) => b.spent - a.spent)
      .slice(0, TOP_N)
  }, [transactions, budgetLimits])

  if (categories.length === 0) return null

  return (
    <div
      className="rounded-2xl px-5 py-4"
      style={{
        background: '#ffffff',
        boxShadow: '0 4px 24px rgba(0,53,46,0.07)',
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <span
          className="text-[12px] font-bold uppercase tracking-[0.12em]"
          style={{ color: '#00352e' }}
        >
          Top Spending
        </span>
        <button
          onClick={() => router.push('/insights')}
          className="flex items-center gap-1 text-[11px] font-semibold"
          style={{ color: '#1f695d' }}
        >
          All categories
          <ArrowRight size={11} weight="bold" aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {categories.map((cat, i) => {
          const Icon = getIconComponent(cat.icon)
          const hex = CATEGORY_HEX[cat.id] ?? '#64748b'
          const barColor =
            cat.pct > 90 ? '#ba1a1a' : cat.pct > 70 ? '#d97706' : hex

          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: 'spring',
                stiffness: 260,
                damping: 26,
                delay: i * 0.06,
              }}
            >
              {/* Label row */}
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${hex}18` }}
                  >
                    <Icon size={13} weight="fill" color={hex} aria-hidden="true" />
                  </div>
                  <span className="text-[13px] font-semibold" style={{ color: '#191c1c' }}>
                    {cat.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-[13px] font-bold" style={{ color: '#191c1c' }}>
                    {formatCurrencyCompact(cat.spent)}
                  </span>
                  {cat.limit > 0 && (
                    <span className="font-mono text-[11px]" style={{ color: '#6e9990' }}>
                      / {formatCurrencyCompact(cat.limit)}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div
                className="h-1.5 w-full overflow-hidden rounded-full"
                style={{ background: '#f0f4f2' }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: cat.limit > 0 ? `${cat.pct}%` : '0%' }}
                  transition={{
                    type: 'spring',
                    stiffness: 55,
                    damping: 18,
                    delay: 0.1 + i * 0.06,
                  }}
                  className="h-full rounded-full"
                  style={{ background: barColor }}
                />
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
