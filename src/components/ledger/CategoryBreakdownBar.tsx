'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatCurrencyCompact } from '@/lib/formatters'
import { CATEGORIES } from '@/types'
import type { Transaction } from '@/types'

// Muted hex palette — matches the new muted category Tailwind classes
const SEGMENT_HEX: Record<string, string> = {
  restaurants:   '#c2410c',
  groceries:     '#4d7c0f',
  transport:     '#0369a1',
  shopping:      '#7c3aed',
  utilities:     '#b45309',
  entertainment: '#be185d',
  health:        '#be123c',
  other:         '#64748b',
}

interface Props {
  transactions: Transaction[]
}

export default function CategoryBreakdownBar({ transactions }: Props) {
  const [active, setActive] = useState<string | null>(null)

  const { breakdown, total } = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === 'expense')
    const total = expenses.reduce((s, t) => s + t.amount, 0)

    const map = new Map<string, number>()
    for (const t of expenses) {
      map.set(t.category.id, (map.get(t.category.id) ?? 0) + t.amount)
    }

    const breakdown = CATEGORIES
      .filter((c) => c.id !== 'income' && map.has(c.id))
      .map((c) => ({
        id: c.id,
        label: c.label.split(/[\s&]/)[0],
        amount: map.get(c.id)!,
        pct: total > 0 ? (map.get(c.id)! / total) * 100 : 0,
        color: SEGMENT_HEX[c.id] ?? '#64748b',
      }))
      .sort((a, b) => b.amount - a.amount)

    return { breakdown, total }
  }, [transactions])

  if (total === 0 || breakdown.length === 0) return null

  const activeSeg = breakdown.find((s) => s.id === active)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className="rounded-2xl p-4 mb-4"
      style={{ background: '#ffffff', boxShadow: '0 2px 12px rgba(0,53,46,0.06)' }}
    >
      {/* Header */}
      <div className="mb-3 flex items-baseline justify-between">
        <span
          className="text-[11px] font-bold uppercase tracking-[0.12em]"
          style={{ color: '#00352e' }}
        >
          Expense Breakdown
        </span>
        <span className="font-mono text-sm font-bold" style={{ color: '#ba1a1a' }}>
          −{formatCurrencyCompact(total)}
        </span>
      </div>

      {/* Stacked bar — overflow-visible so segments can scale out */}
      <div
        className="relative flex w-full gap-px"
        style={{ height: '12px', overflow: 'visible' }}
      >
        {breakdown.map((seg, i) => {
          const isFirst = i === 0
          const isLast = i === breakdown.length - 1
          const isActive = active === seg.id
          return (
            <motion.div
              key={seg.id}
              className="h-full shrink-0 cursor-pointer"
              style={{
                backgroundColor: seg.color,
                width: `${seg.pct}%`,
                transformOrigin: 'center',
                borderRadius: isFirst
                  ? '9999px 4px 4px 9999px'
                  : isLast
                  ? '4px 9999px 9999px 4px'
                  : '4px',
              }}
              animate={{ scaleY: isActive ? 1.7 : 1, opacity: active && !isActive ? 0.45 : 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
              onPointerEnter={() => setActive(seg.id)}
              onPointerLeave={() => setActive(null)}
              onTap={() => setActive((prev) => (prev === seg.id ? null : seg.id))}
            />
          )
        })}
      </div>

      {/* Tooltip / hint */}
      <div className="mt-3" style={{ minHeight: '22px' }}>
        <AnimatePresence mode="wait">
          {activeSeg ? (
            <motion.div
              key={activeSeg.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="flex items-center gap-1.5"
            >
              <div
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: activeSeg.color }}
              />
              <span className="text-[12px] font-semibold" style={{ color: '#191c1c' }}>
                {activeSeg.label}
              </span>
              <span className="font-mono text-[12px] font-bold" style={{ color: activeSeg.color }}>
                −{formatCurrencyCompact(activeSeg.amount)}
              </span>
              <span className="text-[11px] font-medium" style={{ color: '#6e9990' }}>
                {activeSeg.pct.toFixed(0)}%
              </span>
            </motion.div>
          ) : (
            <motion.p
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[11px]"
              style={{ color: '#cde0db' }}
            >
              Tap a segment to see details
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
