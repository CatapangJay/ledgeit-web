'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatCurrencyCompact, formatDate } from '@/lib/formatters'
import { useStore } from '@/lib/store'
import { PHOSPHOR_ICON_MAP } from '@/lib/iconMap'
import type { Transaction } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MAX_FEED = 5

const ICON_BG: Record<string, string> = {
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

// ─── Date badge — mirrors the "% change" badge in Live Portfolio Feed ──────────

function DateBadge({ tx }: { tx: Transaction }) {
  const label = formatDate(tx.date)
  return label
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExpenseFeed() {
  const transactions = useStore((s) => s.transactions)

  const recentExpenses = useMemo(
    () => transactions.filter((t) => t.type === 'expense').slice(0, MAX_FEED),
    [transactions],
  )

  const expenseCount = useMemo(
    () => transactions.filter((t) => t.type === 'expense').length,
    [transactions],
  )

  const totalExpenses = useMemo(
    () =>
      transactions
        .filter((t) => t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0),
    [transactions],
  )

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#ffffff',
        boxShadow: '0 4px 24px rgba(0,53,46,0.07)',
      }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <span className="text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: '#00352e' }}>
          Recent Activity
        </span>
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={{ background: '#f0f4f2', color: '#3f4946' }}
        >
          {expenseCount} entries
        </span>
      </div>

      {recentExpenses.length === 0 ? (
        <div className="px-5 pb-5">
          <p className="text-sm" style={{ color: '#6e9990' }}>
            No expenses recorded yet.
          </p>
        </div>
      ) : (
        <>
          {/* Feed rows */}
          <AnimatePresence initial={false}>
            {recentExpenses.map((tx, i) => {
              const Icon = PHOSPHOR_ICON_MAP[tx.category.icon]
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28, delay: i * 0.05 }}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  {/* Category icon */}
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: ICON_BG[tx.category.id] ?? '#6e9990' }}
                  >
                    {Icon && <Icon size={15} weight="fill" color="#ffffff" aria-hidden="true" />}
                  </div>

                  {/* Merchant + category */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" style={{ color: '#191c1c' }}>
                      {tx.merchant}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium" style={{ color: '#6e9990' }}>
                      {tx.category.label} · <DateBadge tx={tx} />
                    </p>
                  </div>

                  {/* Amount */}
                  <span
                    className="shrink-0 font-mono text-sm font-bold tabular-nums"
                    style={{ color: '#ba1a1a' }}
                  >
                    -{formatCurrencyCompact(tx.amount)}
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-5 py-3 rounded-b-2xl"
            style={{ borderTop: '1px solid #f0f4f2' }}
          >
            <span className="text-[11px] font-semibold" style={{ color: '#3f4946' }}>
              Total Expenses
            </span>
            <span className="font-mono text-base font-bold" style={{ color: '#ba1a1a' }}>
              -{formatCurrencyCompact(totalExpenses)}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
