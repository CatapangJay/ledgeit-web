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
    <div className="pb-2 pt-0">
      <p
        className="mb-1 text-[12px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: 'rgba(255,255,255,0.65)' }}
      >
        Total Net Worth
      </p>
      <div className="flex items-end gap-3">
        <span
          className="font-mono text-[2.6rem] font-bold leading-none tracking-tight"
          style={{ color: '#ffffff' }}
        >
          {formatCurrency(display)}
        </span>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85, type: 'spring', stiffness: 300, damping: 24 }}
        className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
        style={{
          background: isPositive ? 'rgba(255,255,255,0.2)' : 'rgba(255,100,100,0.25)',
          color: '#ffffff',
        }}
      >
        {isPositive ? (
          <TrendUp size={12} weight="bold" aria-hidden="true" />
        ) : (
          <TrendDown size={12} weight="bold" aria-hidden="true" />
        )}
        {formatCurrency(Math.abs(monthlyNet))} this month
      </motion.div>
    </div>
  )
}
