'use client'

import { formatCurrency, formatDate } from '@/lib/formatters'
import { isReimbursement } from '@/types'
import type { Transaction } from '@/types'

interface Props {
  /** The selected month's transactions already filtered to this category. */
  transactions: Transaction[]
}

/**
 * List of a category's transactions for the selected month, shown inside an
 * expanded BudgetBar accordion. Newest first; shows every transaction.
 */
export default function CategoryBreakdownList({ transactions }: Props) {
  if (transactions.length === 0) {
    return (
      <p className="py-1 text-[12px]" style={{ color: '#a9c2bd' }}>
        No transactions in this category this month.
      </p>
    )
  }

  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((tx) => {
        // A reimbursement is a credit back to the category — show it green with
        // a '+' so it reads as an offset rather than a charge.
        const isRefund = isReimbursement(tx)
        const isCredit = tx.type === 'income' || isRefund
        return (
          <div key={tx.id} className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold" style={{ color: '#191c1c' }}>
                {tx.merchant}
              </p>
              <p className="text-[10px]" style={{ color: '#6e9990' }}>
                {formatDate(tx.date)}{isRefund ? ' · Refund' : ''}
              </p>
            </div>
            <span
              className="shrink-0 font-mono text-[12px] font-semibold"
              style={{ color: isCredit ? '#1f6950' : '#3f4946' }}
            >
              {isCredit ? '+' : ''}{formatCurrency(tx.amount)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
