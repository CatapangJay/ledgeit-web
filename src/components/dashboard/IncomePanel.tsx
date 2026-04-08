'use client'

import { useMemo } from 'react'
import { formatCurrencyCompact } from '@/lib/formatters'
import { useStore } from '@/lib/store'

// ─── Component ────────────────────────────────────────────────────────────────

export default function IncomePanel() {
  const transactions = useStore((s) => s.transactions)
  const budgetLimits = useStore((s) => s.budgetLimits)

  const { totalIncome, monthlyBudget } = useMemo(() => {
    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0)

    const monthlyBudget = budgetLimits
      .filter((b) => b.cycle === 'monthly')
      .reduce((s, b) => s + b.limit, 0)

    return { totalIncome, monthlyBudget }
  }, [transactions, budgetLimits])

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#ffffff',
        boxShadow: '0 4px 24px rgba(0,53,46,0.07)',
      }}
    >
      {/* Section label row */}
      <div className="flex items-center justify-between px-5 pt-4 pb-4">
        <span className="text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: '#00352e' }}>
          Income
        </span>
        <span className="text-[11px] font-medium" style={{ color: '#6e9990' }}>
          All Time
        </span>
      </div>

      {/* Two-stat row */}
      <div className="grid grid-cols-2 divide-x pb-5 px-5 gap-4">
        {/* Total Income */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: '#6e9990' }}>
            Total Income
          </span>
          <span className="font-mono text-xl font-bold leading-none" style={{ color: '#1f6950' }}>
            +{formatCurrencyCompact(totalIncome)}
          </span>
        </div>

        {/* Monthly Budget */}
        <div className="flex flex-col gap-1.5 pl-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: '#6e9990' }}>
            Monthly Budget
          </span>
          <span className="font-mono text-xl font-bold leading-none" style={{ color: '#191c1c' }}>
            {formatCurrencyCompact(monthlyBudget)}
          </span>
        </div>
      </div>
    </div>
  )
}
