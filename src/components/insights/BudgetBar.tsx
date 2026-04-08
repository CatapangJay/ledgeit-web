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
  if (ratio > 0.9) return '#ba1a1a'
  if (ratio > 0.75) return '#d97706'
  return '#1f695d'
}

function getLabelColor(ratio: number): string {
  if (ratio > 0.9) return '#ba1a1a'
  if (ratio > 0.75) return '#d97706'
  return '#1f6950'
}

export default function BudgetBar({ category, spent, limit }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.4 })
  const ratio = limit > 0 ? Math.min(spent / limit, 1) : 0
  const pct = Math.round(ratio * 100)

  return (
    <div ref={ref} className="rounded-2xl p-4" style={{ background: '#ffffff', boxShadow: '0 2px 12px rgba(0,53,46,0.06)', marginBottom: '8px' }}>
      {/* Row 1: Category + amounts */}
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold" style={{ color: '#191c1c' }}>{category.label}</span>
        <div className="flex items-baseline gap-1 shrink-0">
          <span className="font-mono text-sm font-bold" style={{ color: getLabelColor(ratio) }}>
            {formatCurrency(spent)}
          </span>
          <span className="font-mono text-[11px] font-medium" style={{ color: '#6e9990' }}>
            / {formatCurrency(limit)}
          </span>
        </div>
      </div>

      {/* Progress bar — rounded pill */}
      <div className="relative h-[6px] w-full overflow-hidden rounded-full" style={{ background: '#f0f4f2' }}>
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{ background: getBarColor(ratio) }}
          initial={{ width: 0 }}
          animate={{ width: isInView ? `${pct}%` : 0 }}
          transition={{ type: 'spring', stiffness: 70, damping: 18, delay: 0.1 }}
        />
      </div>

      {/* Percentage */}
      <div className="mt-2 flex justify-end">
        <span className="text-[11px] font-semibold" style={{ color: getLabelColor(ratio) }}>{pct}%</span>
      </div>
    </div>
  )
}
