'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Trophy } from '@phosphor-icons/react'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { getIconComponent } from '@/lib/iconMap'
import { useStore } from '@/lib/store'
import { isSpend, isReimbursement } from '@/types'

const CATEGORY_HEX: Record<string, string> = {
  restaurants:   '#c2410c',
  groceries:     '#4d7c0f',
  transport:     '#0369a1',
  shopping:      '#7c3aed',
  utilities:     '#b45309',
  entertainment: '#be185d',
  health:        '#be123c',
  savings:       '#0f766e',
  investments:   '#4338ca',
  education:     '#1d4ed8',
  personal_care: '#a21caf',
  other:         '#64748b',
}

interface Props {
  /** Inclusive 'YYYY-MM-DD' bounds to scope the spotlight to a specific month.
   *  When set (e.g. the Insights month switcher), only expenses in this range
   *  are considered — no all-time fallback. Omitted on the dashboard, which
   *  spotlights the current month and falls back to all-time when it's empty. */
  start?: string
  end?: string
}

export default function BiggestExpenseCard({ start, end }: Props = {}) {
  const transactions = useStore((s) => s.transactions)

  const biggest = useMemo(() => {
    // Reimbursements are credits, not purchases — never spotlight one.
    const isCandidate = (t: typeof transactions[number]) => isSpend(t) && !isReimbursement(t)

    let pool: typeof transactions
    if (start && end) {
      // Scoped to an explicit month — no all-time fallback so the card tracks
      // the selected month exactly (empty range → empty state).
      pool = transactions.filter((t) => isCandidate(t) && t.date >= start && t.date <= end)
    } else {
      const now = new Date()
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const thisMonth = transactions.filter((t) => isCandidate(t) && t.date.startsWith(month))
      pool = thisMonth.length > 0 ? thisMonth : transactions.filter(isCandidate)
    }

    return pool.reduce<typeof transactions[number] | null>((max, tx) => {
      if (!max || tx.amount > max.amount) return tx
      return max
    }, null)
  }, [transactions, start, end])

  const hex = biggest ? CATEGORY_HEX[biggest.category.id] ?? '#64748b' : '#64748b'
  const Icon = biggest ? getIconComponent(biggest.category.icon) : Trophy

  return (
    <div
      className="flex h-full flex-col rounded-2xl px-5 py-4"
      style={{
        background: '#ffffff',
        boxShadow: '0 4px 24px rgba(0,53,46,0.07)',
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span
          className="text-[12px] font-bold uppercase tracking-[0.12em]"
          style={{ color: '#00352e' }}
        >
          Biggest Expense
        </span>
        <Trophy size={15} weight="fill" color="#d97706" aria-hidden="true" />
      </div>

      {!biggest ? (
        <p className="text-[12px]" style={{ color: '#a9c2bd' }}>
          No expenses yet — your largest purchase will be spotlighted here.
        </p>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="flex flex-1 flex-col justify-between"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${hex}18` }}
            >
              <Icon size={19} weight="fill" color={hex} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold" style={{ color: '#191c1c' }}>
                {biggest.merchant}
              </p>
              <p className="mt-0.5 text-[11px]" style={{ color: '#8eaeaa' }}>
                {biggest.category.label} · {formatDate(biggest.date)}
              </p>
            </div>
          </div>

          <p className="mt-4 font-mono text-2xl font-bold leading-none" style={{ color: '#191c1c' }}>
            {formatCurrency(biggest.amount)}
          </p>
        </motion.div>
      )}
    </div>
  )
}
