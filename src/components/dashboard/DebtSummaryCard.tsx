'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { HandCoins, ArrowDown, ArrowUp, Warning, CaretRight } from '@phosphor-icons/react'
import { formatCurrencyCompact, formatDate } from '@/lib/formatters'
import { debtOutstanding, debtDueStatus } from '@/types'
import type { Debt } from '@/types'
import { useStore } from '@/lib/store'

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Short label for the nearest-due reminder, e.g. "due today", "2d overdue". */
function duePhrase(days: number, overdue: boolean): string {
  if (overdue) return days === -1 ? '1 day overdue' : `${Math.abs(days)} days overdue`
  if (days === 0) return 'due today'
  if (days === 1) return 'due tomorrow'
  return `due in ${days} days`
}

/**
 * Dashboard widget: at-a-glance debt position (owed to me vs. I owe) plus the
 * single most-urgent upcoming/overdue repayment so the user gets a nudge without
 * opening the Debts page. Hidden entirely when the user tracks no debts.
 */
export default function DebtSummaryCard() {
  const debts = useStore((s) => s.debts)

  const { totalOwedToMe, totalIOwe, openCount, nearest } = useMemo(() => {
    const today = todayISO()
    let totalOwedToMe = 0
    let totalIOwe = 0
    let openCount = 0
    // The most urgent unsettled debt with a due date: overdue first, then soonest.
    let nearest: { debt: Debt; days: number; overdue: boolean } | null = null

    for (const d of debts) {
      if (d.isSettled) continue
      openCount++
      const outstanding = debtOutstanding(d)
      if (d.direction === 'owed_to_me') totalOwedToMe += outstanding
      else totalIOwe += outstanding

      const due = debtDueStatus(d, today)
      if (due.state === 'overdue' || due.state === 'due_soon' || due.state === 'upcoming') {
        if (!nearest || due.days < nearest.days) {
          nearest = { debt: d, days: due.days, overdue: due.state === 'overdue' }
        }
      }
    }
    return { totalOwedToMe, totalIOwe, openCount, nearest }
  }, [debts])

  // Nothing to show — keep the dashboard clean for users not tracking debts.
  if (openCount === 0) return null

  // Only surface the reminder banner when it's actually near/overdue.
  const showReminder = nearest !== null && nearest.days <= 7

  return (
    <Link href="/debts" className="block">
      <div
        className="flex h-full flex-col rounded-2xl px-5 py-4 transition-transform active:scale-[0.99]"
        style={{ background: '#ffffff', boxShadow: '0 4px 24px rgba(0,53,46,0.07)' }}
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: '#00352e' }}>
            Debts &amp; Loans
          </span>
          <div className="flex items-center gap-1.5">
            <HandCoins size={15} weight="fill" color="#a9c2bd" aria-hidden="true" />
            <CaretRight size={12} weight="bold" color="#cde0db" aria-hidden="true" />
          </div>
        </div>

        {/* Owed to me / I owe totals */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(31,105,80,0.08)' }}>
            <div className="flex items-center gap-1">
              <ArrowDown size={11} weight="bold" style={{ color: '#1f6950' }} aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#1f6950' }}>Owed to me</span>
            </div>
            <p className="mt-0.5 font-mono text-[15px] font-bold" style={{ color: '#00352e' }}>
              {formatCurrencyCompact(totalOwedToMe)}
            </p>
          </div>
          <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(180,83,9,0.08)' }}>
            <div className="flex items-center gap-1">
              <ArrowUp size={11} weight="bold" style={{ color: '#b45309' }} aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#b45309' }}>I owe</span>
            </div>
            <p className="mt-0.5 font-mono text-[15px] font-bold" style={{ color: '#00352e' }}>
              {formatCurrencyCompact(totalIOwe)}
            </p>
          </div>
        </div>

        {/* Nearest due reminder */}
        {showReminder && nearest && (
          <div
            className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2"
            style={
              nearest.overdue
                ? { background: 'rgba(186,26,26,0.08)' }
                : { background: 'rgba(180,83,9,0.08)' }
            }
          >
            <Warning
              size={13}
              weight="fill"
              color={nearest.overdue ? '#ba1a1a' : '#b45309'}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold" style={{ color: '#3f4946' }}>
              {nearest.debt.direction === 'owed_to_me'
                ? `${nearest.debt.personName} — ${duePhrase(nearest.days, nearest.overdue)}`
                : `Pay ${nearest.debt.personName} — ${duePhrase(nearest.days, nearest.overdue)}`}
            </span>
            <span className="shrink-0 text-[10px] font-medium" style={{ color: '#6e9990' }}>
              {formatDate(nearest.debt.dueDate!)}
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}
