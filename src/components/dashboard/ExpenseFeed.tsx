'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatCurrencyCompact, formatDate } from '@/lib/formatters'
import { useStore } from '@/lib/store'
import { useIsDesktop } from '@/lib/useIsDesktop'
import { PHOSPHOR_ICON_MAP } from '@/lib/iconMap'
import type { Transaction } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Desktop has vertical room beside the taller left column, so it shows a deeper
// feed; mobile stays compact so the dashboard remains a quick glance.
const MAX_FEED_MOBILE = 5
const MAX_FEED_DESKTOP = 8

// Light-tinted icon badge backgrounds (iOS-style) + matching icon tint
const ICON_TINT: Record<string, { bg: string; icon: string }> = {
  restaurants:   { bg: 'rgba(224,92,42,0.12)',  icon: '#e05c2a' },
  groceries:     { bg: 'rgba(40,164,106,0.12)', icon: '#1f8a56' },
  transport:     { bg: 'rgba(2,132,199,0.12)',  icon: '#0284c7' },
  shopping:      { bg: 'rgba(124,58,237,0.12)', icon: '#7c3aed' },
  utilities:     { bg: 'rgba(217,119,6,0.12)',  icon: '#d97706' },
  entertainment: { bg: 'rgba(219,39,119,0.12)', icon: '#db2777' },
  health:        { bg: 'rgba(233,30,99,0.12)',  icon: '#e91e63' },
  income:        { bg: 'rgba(31,105,80,0.12)',  icon: '#1f6950' },
  other:         { bg: 'rgba(110,153,144,0.12)',icon: '#6e9990' },
}

// ─── Date badge — mirrors the "% change" badge in Live Portfolio Feed ──────────

function DateBadge({ tx }: { tx: Transaction }) {
  const label = formatDate(tx.date)
  return label
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExpenseFeed() {
  const transactions = useStore((s) => s.transactions)
  const isDesktop = useIsDesktop()
  const maxFeed = isDesktop ? MAX_FEED_DESKTOP : MAX_FEED_MOBILE

  const recentExpenses = useMemo(
    () => transactions.filter((t) => t.type === 'expense').slice(0, maxFeed),
    [transactions, maxFeed],
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
      className="rounded-2xl overflow-hidden flex flex-col h-full"
      style={{
        background: '#ffffff',
        boxShadow: '0 2px 16px rgba(0,53,46,0.06)',
      }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: '#3f4946' }}>
          Recent Activity
        </span>
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
          style={{ background: '#f0f4f2', color: '#6e9990' }}
        >
          {expenseCount}
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
              const tint = ICON_TINT[tx.category.id] ?? { bg: 'rgba(110,153,144,0.12)', icon: '#6e9990' }
              const isIncome = tx.type === 'income'
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28, delay: i * 0.05 }}
                  className="flex items-center gap-3 px-5 py-3"
                  style={{ borderTop: i > 0 ? '1px solid #f7f9f8' : undefined }}
                >
                  {/* Category icon — light tinted */}
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: tint.bg }}
                  >
                    {Icon && <Icon size={16} weight="fill" color={tint.icon} aria-hidden="true" />}
                  </div>

                  {/* Merchant + category */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold" style={{ color: '#191c1c' }}>
                      {tx.merchant}
                    </p>
                    <p className="mt-0.5 text-[11px]" style={{ color: '#8eaeaa' }}>
                      {tx.category.label} · <DateBadge tx={tx} />
                    </p>
                  </div>

                  {/* Amount */}
                  <span
                    className="shrink-0 font-mono text-[13px] font-bold tabular-nums"
                    style={{ color: isIncome ? '#1f6950' : '#ba1a1a' }}
                  >
                    {isIncome ? '+' : '−'}{formatCurrencyCompact(tx.amount)}
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-5 py-3 rounded-b-2xl"
            style={{ borderTop: '1px solid #f0f4f2', background: '#fcfefe' }}
          >
            <span className="text-[11px] font-semibold" style={{ color: '#8eaeaa' }}>
              All-time expenses
            </span>
            <span className="font-mono text-[13px] font-bold" style={{ color: '#ba1a1a' }}>
              −{formatCurrencyCompact(totalExpenses)}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
