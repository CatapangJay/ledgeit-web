'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ArrowRight } from '@phosphor-icons/react'
import { formatCurrencyCompact } from '@/lib/formatters'
import { getIconComponent, getIconBg } from '@/lib/iconMap'
import { useStore } from '@/lib/store'
import { CATEGORIES } from '@/types'

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

    // Max spend across the tracked categories — used to size bars for entries
    // that have no budget limit, so every row shows a proportional bar.
    const maxSpent = Math.max(...Object.values(byCategory), 1)

    return Object.entries(byCategory)
      .map(([id, spent]) => {
        const limit = budgetLimits.find((b) => b.categoryId === id)?.limit ?? 0
        const cat = CATEGORIES.find((c) => c.id === id)
        // Budget usage % when a limit is set; otherwise spend relative to the
        // biggest category so no-budget rows still render a visible bar.
        const pct = limit > 0
          ? Math.min((spent / limit) * 100, 100)
          : (spent / maxSpent) * 100
        return {
          id,
          spent,
          limit,
          pct,
          label: cat?.label ?? id,
          icon: cat?.icon ?? 'DotsThree',
          color: cat?.color ?? 'text-slate-500',
        }
      })
      .sort((a, b) => b.spent - a.spent)
      .slice(0, TOP_N)
  }, [transactions, budgetLimits])

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

      {categories.length === 0 ? (
        <p className="text-[12px]" style={{ color: '#a9c2bd' }}>
          Nothing logged this month. Your top categories will appear here once you add expenses.
        </p>
      ) : (
      <div className="flex flex-col gap-4">
        {categories.map((cat, i) => {
          const Icon = getIconComponent(cat.icon)
          const hex = getIconBg({ id: cat.id, color: cat.color })
          // Over-budget red/amber only applies when a real budget limit exists.
          // No-budget bars are sized relatively, so keep them the category color.
          const barColor =
            cat.limit > 0 && cat.pct > 90 ? '#ba1a1a'
            : cat.limit > 0 && cat.pct > 70 ? '#d97706'
            : hex

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
                  animate={{ width: `${cat.pct}%` }}
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
      )}
    </div>
  )
}
