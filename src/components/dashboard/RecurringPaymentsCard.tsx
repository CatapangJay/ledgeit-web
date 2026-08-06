'use client'

import { useMemo } from 'react'
import { ArrowsClockwise } from '@phosphor-icons/react'
import { formatCurrencyCompact } from '@/lib/formatters'
import { getIconComponent } from '@/lib/iconMap'
import { useStore } from '@/lib/store'

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

const MAX_ROWS = 3

export default function RecurringPaymentsCard() {
  const transactions = useStore((s) => s.transactions)

  const { rows, monthlyTotal } = useMemo(() => {
    // De-dupe recurring bills by merchant, keeping the most recent occurrence.
    const byMerchant = new Map<string, typeof transactions[number]>()
    for (const tx of transactions) {
      if (!tx.isRecurring || tx.type !== 'expense') continue
      const existing = byMerchant.get(tx.merchant)
      if (!existing || tx.date > existing.date) byMerchant.set(tx.merchant, tx)
    }
    const rows = Array.from(byMerchant.values()).sort((a, b) => b.amount - a.amount)
    const monthlyTotal = rows.reduce((s, r) => s + r.amount, 0)
    return { rows, monthlyTotal }
  }, [transactions])

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
          Recurring Bills
        </span>
        <ArrowsClockwise size={15} weight="bold" color="#a9c2bd" aria-hidden="true" />
      </div>

      {rows.length === 0 ? (
        <p className="text-[12px]" style={{ color: '#a9c2bd' }}>
          Mark a transaction as recurring to track subscriptions and bills here.
        </p>
      ) : (
        <>
          <div className="flex flex-1 flex-col gap-3">
            {rows.slice(0, MAX_ROWS).map((tx) => {
              const Icon = getIconComponent(tx.category.icon)
              const hex = CATEGORY_HEX[tx.category.id] ?? '#64748b'
              return (
                <div key={tx.merchant} className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${hex}18` }}
                  >
                    <Icon size={14} weight="fill" color={hex} aria-hidden="true" />
                  </div>
                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold" style={{ color: '#191c1c' }}>
                    {tx.merchant}
                  </span>
                  <span className="shrink-0 font-mono text-[12px] font-semibold" style={{ color: '#3f4946' }}>
                    {formatCurrencyCompact(tx.amount)}
                  </span>
                </div>
              )
            })}
          </div>

          <div
            className="mt-3 flex items-center justify-between"
            style={{ borderTop: '1px solid #f0f4f2', paddingTop: '10px' }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: '#6e9990' }}>
              Est. monthly
            </span>
            <span className="font-mono text-[13px] font-bold" style={{ color: '#191c1c' }}>
              {formatCurrencyCompact(monthlyTotal)}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
