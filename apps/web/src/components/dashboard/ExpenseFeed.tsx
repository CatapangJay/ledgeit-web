'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { CaretRight } from '@phosphor-icons/react'
import { formatCurrencyCompact, formatDate } from '@/lib/formatters'
import { useStore } from '@/lib/store'
import { useIsDesktop } from '@/lib/useIsDesktop'
import { PHOSPHOR_ICON_MAP, getIconBg } from '@/lib/iconMap'
import type { Transaction } from '@/types'
import { isSpend, isEarn } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Desktop has vertical room beside the taller left column, so it shows a deeper
// feed; mobile stays compact so the dashboard remains a quick glance.
const MAX_FEED_MOBILE = 5
const MAX_FEED_DESKTOP = 8

/** Amount sign + color per type. Transfers are neutral (money you still own). */
function amountStyle(tx: Transaction): { sign: string; color: string } {
  if (tx.type === 'income') return { sign: '+', color: '#1f6950' }
  if (tx.type === 'transfer') return { sign: '', color: '#6e9990' }
  return { sign: '−', color: '#ba1a1a' }
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

  // ALL activity — income, expenses, transfers, debts — newest date first
  // (ties broken by created time so a back-dated entry can't outrank a newer day).
  const sorted = useMemo(
    () =>
      [...transactions].sort((a, b) =>
        a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)
      ),
    [transactions],
  )
  const recent = useMemo(() => sorted.slice(0, maxFeed), [sorted, maxFeed])
  const totalCount = transactions.length

  // Net this month across income (+) and expense (−); transfers and debts excluded.
  const monthNet = useMemo(() => {
    const now = new Date()
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return transactions
      .filter((t) => t.date.startsWith(ym))
      .reduce((s, t) => (isEarn(t) ? s + t.amount : isSpend(t) ? s - t.amount : s), 0)
  }, [transactions])

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
          {totalCount}
        </span>
      </div>

      {recent.length === 0 ? (
        <div className="px-5 pb-5">
          <p className="text-sm" style={{ color: '#6e9990' }}>
            Nothing recorded yet.
          </p>
        </div>
      ) : (
        <>
          {/* Feed rows */}
          <AnimatePresence initial={false}>
            {recent.map((tx, i) => {
              const Icon = PHOSPHOR_ICON_MAP[tx.category.icon]
              const hex = getIconBg({ id: tx.category.id, color: tx.category.color })
              const { sign, color } = amountStyle(tx)
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
                    style={{ background: `${hex}1f` }}
                  >
                    {Icon && <Icon size={16} weight="fill" color={hex} aria-hidden="true" />}
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
                    style={{ color }}
                  >
                    {sign}{formatCurrencyCompact(tx.amount)}
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Footer — net this month + link to full history */}
          <Link
            href="/history"
            className="flex items-center justify-between px-5 py-3 rounded-b-2xl transition-colors hover:bg-ledge-surface"
            style={{ borderTop: '1px solid #f0f4f2', background: '#fcfefe' }}
          >
            <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#1f695d' }}>
              View all
              <CaretRight size={11} weight="bold" aria-hidden="true" />
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-[11px] font-semibold" style={{ color: '#8eaeaa' }}>Net this month</span>
              <span
                className="font-mono text-[13px] font-bold"
                style={{ color: monthNet >= 0 ? '#1f6950' : '#ba1a1a' }}
              >
                {monthNet >= 0 ? '+' : '−'}{formatCurrencyCompact(Math.abs(monthNet))}
              </span>
            </span>
          </Link>
        </>
      )}
    </div>
  )
}
