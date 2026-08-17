'use client'

import { motion } from 'framer-motion'
import { ArrowsLeftRight } from '@phosphor-icons/react'
import { useStore } from '@/lib/store'
import { formatCurrencyCompact } from '@/lib/formatters'
import { useMemo } from 'react'

/**
 * Explains the "transfer" type (credit-card payments, moving to savings) and
 * shows this month's transfer total. Designed to sit beside a half-width card
 * (e.g. Biggest Expense) so keep it compact.
 */
export default function TransferInfoCard() {
  const transactions = useStore((s) => s.transactions)

  const monthTransfers = useMemo(() => {
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return transactions
      .filter((t) => t.type === 'transfer' && t.date.startsWith(month))
      .reduce((s, t) => s + t.amount, 0)
  }, [transactions])

  return (
    <div
      className="flex h-full flex-col rounded-2xl px-5 py-4"
      style={{ background: '#ffffff', boxShadow: '0 4px 24px rgba(0,53,46,0.07)' }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: '#00352e' }}>
          Transfers
        </span>
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full"
          style={{ background: '#eef2f4' }}
        >
          <ArrowsLeftRight size={12} weight="bold" color="#475569" aria-hidden="true" />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="flex flex-1 flex-col justify-between gap-3"
      >
        <p className="text-[12px] leading-relaxed" style={{ color: '#6e9990' }}>
          Paying a credit card or moving money to savings isn&apos;t spending — it&apos;s a{' '}
          <span className="font-semibold" style={{ color: '#3f4946' }}>transfer</span>. Log it as{' '}
          <span className="font-mono" style={{ color: '#475569' }}>&ldquo;cc payment 5000&rdquo;</span>{' '}
          and it stays out of your totals and budgets.
        </p>

        <div
          className="flex items-center justify-between rounded-xl px-3 py-2"
          style={{ background: '#f4f6f7' }}
        >
          <span className="text-[11px] font-semibold" style={{ color: '#6e9990' }}>
            This month
          </span>
          <span className="font-mono text-[13px] font-bold" style={{ color: '#475569' }}>
            {monthTransfers > 0 ? formatCurrencyCompact(monthTransfers) : '—'}
          </span>
        </div>
      </motion.div>
    </div>
  )
}
