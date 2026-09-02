'use client'

import { useRef, type ReactNode } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { CaretDown } from '@phosphor-icons/react'
import { formatCurrency } from '@/lib/formatters'
import type { Category } from '@/types'

interface Props {
  category: Category
  spent: number
  limit: number
  /** When set, the bar becomes an accordion toggle showing `children` when open. */
  expanded?: boolean
  onToggle?: (categoryId: string) => void
  /** Breakdown content revealed when expanded. */
  children?: ReactNode
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

export default function BudgetBar({ category, spent, limit, expanded = false, onToggle, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.4 })
  // Clamp at 0 so a net-negative category (refunds exceed spend) shows an empty
  // bar rather than a reversed one; the real spent number is still displayed.
  const ratio = limit > 0 ? Math.max(Math.min(spent / limit, 1), 0) : 0
  const pct = Math.round(ratio * 100)
  const clickable = !!onToggle

  return (
    <div
      ref={ref}
      className="rounded-2xl p-4"
      style={{ background: '#ffffff', boxShadow: '0 2px 12px rgba(0,53,46,0.06)', marginBottom: '8px' }}
    >
      {/* Header row — toggles the accordion when clickable */}
      <div
        className="flex flex-col gap-3"
        style={{ cursor: clickable ? 'pointer' : undefined }}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        aria-expanded={clickable ? expanded : undefined}
        aria-label={clickable ? `${category.label} breakdown` : undefined}
        onClick={clickable ? () => onToggle!(category.id) : undefined}
        onKeyDown={
          clickable
            ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle!(category.id) } }
            : undefined
        }
      >
        {/* Row 1: Category + amounts */}
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {clickable && (
              <motion.span
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="flex items-center"
                aria-hidden="true"
              >
                <CaretDown size={12} weight="bold" color="#6e9990" />
              </motion.span>
            )}
            <span className="text-sm font-semibold" style={{ color: '#191c1c' }}>{category.label}</span>
          </div>
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
        <div className="flex justify-end">
          <span className="text-[11px] font-semibold" style={{ color: getLabelColor(ratio) }}>{pct}%</span>
        </div>
      </div>

      {/* Expandable breakdown */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid #f0f4f2' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
