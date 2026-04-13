'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowFatLineUp, ArrowFatLineDown } from '@phosphor-icons/react'
import { formatCurrency } from '@/lib/formatters'
import { useStore } from '@/lib/store'

function useCountUp(target: number, duration = 1000) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef<number | null>(null)
  const prevTarget = useRef(0)

  useEffect(() => {
    const from = prevTarget.current
    prevTarget.current = target
    const start = Date.now()

    const tick = () => {
      const progress = Math.min((Date.now() - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(from + (target - from) * eased)
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return display
}

export default function BalanceMetric() {
  const getMonthlyTotal = useStore((s) => s.getMonthlyTotal)

  const monthlyIncome = getMonthlyTotal('income')
  const monthlyExpense = getMonthlyTotal('expense')
  const monthlyNet = monthlyIncome - monthlyExpense
  const isPositive = monthlyNet >= 0

  const displayNet = useCountUp(monthlyNet)
  const displayIncome = useCountUp(monthlyIncome, 900)
  const displayExpense = useCountUp(monthlyExpense, 900)

  const now = new Date()
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="pb-1 pt-0">
      <p
        className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: 'rgba(255,255,255,0.55)' }}
      >
        {monthLabel}
      </p>

      {/* Net figure */}
      <div className="flex items-baseline gap-2">
        <span
          className="font-mono text-[2.6rem] font-bold leading-none tracking-tight"
          style={{ color: isPositive ? '#ffffff' : '#fca5a5' }}
        >
          {isPositive ? '' : '−'}{formatCurrency(Math.abs(displayNet))}
        </span>
      </div>
      <p className="mt-1 text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Net this month
      </p>

      {/* Income / Expense pills */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 24 }}
        className="mt-4 flex gap-2"
      >
        <div
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{ background: 'rgba(255,255,255,0.13)' }}
        >
          <ArrowFatLineUp size={11} weight="fill" color="rgba(255,255,255,0.7)" aria-hidden="true" />
          <span className="font-mono text-[12px] font-semibold" style={{ color: '#ffffff' }}>
            {formatCurrency(displayIncome)}
          </span>
        </div>
        <div
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{ background: 'rgba(255,100,100,0.2)' }}
        >
          <ArrowFatLineDown size={11} weight="fill" color="rgba(255,160,160,0.9)" aria-hidden="true" />
          <span className="font-mono text-[12px] font-semibold" style={{ color: '#fca5a5' }}>
            {formatCurrency(displayExpense)}
          </span>
        </div>
      </motion.div>
    </div>
  )
}
