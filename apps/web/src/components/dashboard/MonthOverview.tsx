'use client'

import { useMemo, useRef } from 'react'
import { motion, useReducedMotion, useInView } from 'framer-motion'
import { CaretRight, SlidersHorizontal } from '@phosphor-icons/react'
import { formatCurrency, formatCurrencyCompact } from '@/lib/formatters'
import { useStore } from '@/lib/store'
import { CATEGORIES, isSpend, isEarn, spendAmount } from '@/types'

interface Props {
  /** Opens the budget plan manager (BudgetAllocationSheet). */
  onManageBudget?: () => void
}

// Category color vocabulary — mirrors SpendStrip so a category reads the same
// hue wherever it appears (DESIGN.md: category colors are a fixed vocabulary).
const CATEGORY_HEX: Record<string, string> = {
  restaurants:   '#e05c2a',
  groceries:     '#28a46a',
  transport:     '#0284c7',
  shopping:      '#7c3aed',
  utilities:     '#d97706',
  entertainment: '#db2777',
  health:        '#e91e63',
  savings:       '#0f766e',
  investments:   '#4338ca',
  education:     '#1d4ed8',
  personal_care: '#a21caf',
  income:        '#1f6950',
  other:         '#6e9990',
}

// Budget-usage bar color escalates only as a real signal, never decoration.
function usageColor(ratio: number): string {
  if (ratio > 0.9) return '#ba1a1a'   // over / near — danger crimson
  if (ratio > 0.75) return '#d97706'  // watch — amber
  return '#1f695d'                    // on track — teal
}

const TOP_N = 3

export default function MonthOverview({ onManageBudget }: Props) {
  const transactions = useStore((s) => s.transactions)
  const budgetLimits = useStore((s) => s.budgetLimits)
  const budgetAllocations = useStore((s) => s.budgetAllocations)
  const activePlan = budgetAllocations.find((a) => a.isActive) ?? null
  const reduceMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })

  const now = new Date()
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long' })

  const {
    expense,
    saved,
    budgetTotal,
    budgetLeft,
    usageRatio,
    topCategories,
    isEmpty,
  } = useMemo(() => {
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const monthTxns = transactions.filter((t) => t.date.startsWith(ym))

    let income = 0
    let expense = 0
    const byCategory: Record<string, number> = {}
    for (const t of monthTxns) {
      // Only real earning/spending count — transfers and the debts category move
      // money between your own pockets, so they're excluded from every total.
      if (isEarn(t)) {
        income += t.amount
      } else if (isSpend(t)) {
        // Reimbursements subtract from both the month total and the category
        // (spendAmount), freeing up budget.
        const spend = spendAmount(t)
        expense += spend
        byCategory[t.category.id] = (byCategory[t.category.id] ?? 0) + spend
      }
    }

    const budgetTotal = budgetLimits.reduce((s, b) => s + b.limit, 0)
    const saved = Math.max(income - expense, 0)
    const budgetLeft = Math.max(budgetTotal - expense, 0)
    const usageRatio = budgetTotal > 0 ? expense / budgetTotal : 0

    const topCategories = Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, TOP_N)
      .map(([id, amount]) => {
        const cat = CATEGORIES.find((c) => c.id === id)
        return {
          id,
          label: cat?.label ?? id,
          amount,
          hex: CATEGORY_HEX[id] ?? '#6e9990',
        }
      })

    return {
      expense,
      saved,
      budgetTotal,
      budgetLeft,
      usageRatio,
      topCategories,
      isEmpty: expense === 0 && income === 0,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, budgetLimits])

  const usagePct = Math.round(Math.min(usageRatio, 1) * 100)
  const barColor = usageColor(usageRatio)
  const topMax = topCategories.length > 0 ? topCategories[0].amount : 1

  return (
    <div
      ref={ref}
      className="rounded-2xl px-5 py-4"
      style={{ background: '#ffffff', boxShadow: '0 2px 16px rgba(0,53,46,0.06)' }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className="text-[12px] font-bold uppercase tracking-[0.12em]"
          style={{ color: '#00352e' }}
        >
          This Month
        </span>
        {onManageBudget && activePlan ? (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onManageBudget}
            aria-label={`Active budget plan: ${activePlan.name}. Tap to switch or edit plans.`}
            className="flex min-w-0 items-center gap-1 rounded-full py-1 pl-2.5 pr-1.5"
            style={{ background: '#f0f4f2' }}
          >
            <span className="truncate text-[11px] font-semibold" style={{ color: '#1f695d' }}>
              {activePlan.name}
            </span>
            <CaretRight size={11} weight="bold" color="#6e9990" aria-hidden="true" />
          </motion.button>
        ) : (
          <span className="text-[11px] font-medium" style={{ color: '#3f4946' }}>
            {monthLabel}
          </span>
        )}
      </div>

      {isEmpty ? (
        <div className="flex flex-col gap-1">
          <div className="h-2 w-full rounded-full" style={{ background: '#f0f4f2' }} />
          <p className="mt-2 text-[12px]" style={{ color: '#3f4946' }}>
            Nothing logged this month yet. Your overview builds as you add entries.
          </p>
          {onManageBudget && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onManageBudget}
              className="mt-2 flex w-fit items-center gap-1.5 rounded-full py-1.5 pl-3 pr-3.5"
              style={{ background: '#f0f4f2' }}
            >
              <SlidersHorizontal size={12} weight="bold" color="#1f695d" aria-hidden="true" />
              <span className="text-[12px] font-semibold" style={{ color: '#1f695d' }}>
                {activePlan ? 'Adjust budget plan' : 'Set up a budget'}
              </span>
            </motion.button>
          )}
        </div>
      ) : (
        <>
          {/* Budget usage bar */}
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="font-mono text-[13px] font-bold" style={{ color: barColor }}>
              {formatCurrency(expense)}
            </span>
            <span className="font-mono text-[11px] font-medium" style={{ color: '#3f4946' }}>
              of {formatCurrency(budgetTotal)} budget
            </span>
          </div>
          <div
            className="relative h-2 w-full overflow-hidden rounded-full"
            style={{ background: '#f0f4f2' }}
            role="progressbar"
            aria-valuenow={usagePct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Budget used: ${usagePct} percent`}
          >
            <motion.div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{ background: barColor }}
              initial={{ width: reduceMotion ? `${usagePct}%` : 0 }}
              animate={{ width: inView ? `${usagePct}%` : reduceMotion ? `${usagePct}%` : 0 }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 70, damping: 18, delay: 0.1 }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            {onManageBudget ? (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={onManageBudget}
                className="flex items-center gap-1"
                aria-label="Adjust budget plan"
              >
                <SlidersHorizontal size={11} weight="bold" color="#6e9990" aria-hidden="true" />
                <span className="text-[11px] font-semibold" style={{ color: '#6e9990' }}>
                  Adjust
                </span>
              </motion.button>
            ) : (
              <span />
            )}
            <span className="text-[11px] font-semibold" style={{ color: barColor }}>
              {usagePct}% used
            </span>
          </div>

          {/* Spent / Saved / Left trio */}
          <div className="mt-3 grid grid-cols-3 gap-2" style={{ borderTop: '1px solid #f0f4f2', paddingTop: '12px' }}>
            {[
              { label: 'Spent', value: expense, color: '#191c1c' },
              { label: 'Saved', value: saved, color: '#1f6950' },
              { label: 'Left', value: budgetLeft, color: barColor },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col gap-0.5">
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.1em]"
                  style={{ color: '#6e9990' }}
                >
                  {stat.label}
                </span>
                <span className="font-mono text-[14px] font-bold leading-none" style={{ color: stat.color }}>
                  {formatCurrencyCompact(stat.value)}
                </span>
              </div>
            ))}
          </div>

          {/* Top categories — where the money goes */}
          {topCategories.length > 0 && (
            <div className="mt-4 flex flex-col gap-2.5">
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: '#6e9990' }}
              >
                Top Categories
              </span>
              {topCategories.map((cat, i) => {
                const pct = topMax > 0 ? Math.max((cat.amount / topMax) * 100, 4) : 0
                return (
                  <div key={cat.id} className="flex items-center gap-2.5">
                    <span
                      className="w-24 shrink-0 truncate text-[12px] font-medium"
                      style={{ color: '#3f4946' }}
                    >
                      {cat.label}
                    </span>
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: '#f0f4f2' }}>
                      <motion.div
                        className="absolute left-0 top-0 h-full rounded-full"
                        style={{ background: cat.hex }}
                        initial={{ width: reduceMotion ? `${pct}%` : 0 }}
                        animate={{ width: inView ? `${pct}%` : reduceMotion ? `${pct}%` : 0 }}
                        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 70, damping: 18, delay: 0.15 + i * 0.06 }}
                      />
                    </div>
                    <span className="shrink-0 font-mono text-[12px] font-semibold" style={{ color: '#191c1c' }}>
                      {formatCurrencyCompact(cat.amount)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
