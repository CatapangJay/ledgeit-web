'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { formatCurrency } from '@/lib/formatters'
import type { Category } from '@/types'

interface Props {
  category: Category
  spent: number
  limit: number
}

function getBarColor(ratio: number): string {
  if (ratio > 0.9) return 'bg-rose-500'
  if (ratio > 0.75) return 'bg-amber-400'
  return 'bg-ledge-accent'
}

function getLabelColor(ratio: number): string {
  if (ratio > 0.9) return 'text-rose-400'
  if (ratio > 0.75) return 'text-amber-400'
  return 'text-ledge-accent'
}

export default function BudgetBar({ category, spent, limit }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.4 })
  const ratio = limit > 0 ? Math.min(spent / limit, 1) : 0
  const pct = Math.round(ratio * 100)

  return (
    <div ref={ref} className="border-t border-ledge-border py-4">
      {/* Row 1: Category + amounts */}
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-ledge-data">{category.label}</span>
        <div className="flex items-baseline gap-1 shrink-0">
          <span className={`font-mono text-sm font-semibold ${getLabelColor(ratio)}`}>
            {formatCurrency(spent)}
          </span>
          <span className="font-mono text-[11px] text-ledge-muted">
            / {formatCurrency(limit)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-ledge-border">
        <motion.div
          className={`absolute left-0 top-0 h-full rounded-full ${getBarColor(ratio)}`}
          initial={{ width: 0 }}
          animate={{ width: isInView ? `${pct}%` : 0 }}
          transition={{ type: 'spring', stiffness: 70, damping: 18, delay: 0.1 }}
        />
      </div>

      {/* Percentage */}
      <div className="mt-1 flex justify-end">
        <span className={`font-mono text-[10px] ${getLabelColor(ratio)}`}>{pct}%</span>
      </div>
    </div>
  )
}
