'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendUp, TrendDown } from '@phosphor-icons/react'
import { formatCurrency } from '@/lib/formatters'
import { useStore } from '@/lib/store'

export default function BalanceMetric() {
  const transactions = useStore((s) => s.transactions)
  const getMonthlyTotal = useStore((s) => s.getMonthlyTotal)

  const totalBalance = transactions.reduce(
    (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount),
    0
  )
  const monthlyIncome = getMonthlyTotal('income')
  const monthlyExpense = getMonthlyTotal('expense')
  const monthlyNet = monthlyIncome - monthlyExpense
  const isPositive = monthlyNet >= 0

  // Count-up animation using rAF
  const [display, setDisplay] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const duration = 1100
    const start = Date.now()
    const from = 0
    const to = totalBalance

    const tick = () => {
      const progress = Math.min((Date.now() - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(from + (to - from) * eased)
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="pb-4 pt-8">
      <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ledge-muted">
        Total Balance
      </p>
      <div className="flex items-end gap-3">
        <span className="font-mono text-[2.6rem] font-semibold leading-none tracking-tight text-ledge-data">
          {formatCurrency(display)}
        </span>
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, type: 'spring', stiffness: 300, damping: 24 }}
          className={`mb-0.5 flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs ${
            isPositive
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-rose-500/10 text-rose-400'
          }`}
        >
          {isPositive ? (
            <TrendUp size={12} weight="bold" aria-hidden="true" />
          ) : (
            <TrendDown size={12} weight="bold" aria-hidden="true" />
          )}
          {formatCurrency(Math.abs(monthlyNet))} this month
        </motion.div>
      </div>
    </div>
  )
}
