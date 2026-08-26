'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { CaretRight, TrendUp } from '@phosphor-icons/react'
import { useStore } from '@/lib/store'
import { formatCurrency } from '@/lib/formatters'
import { getIconComponent } from '@/lib/iconMap'
import { walletAccent } from '@/lib/walletColors'
import { walletBalance, walletGoalProgress } from '@/types'
import type { Wallet } from '@/types'

interface Props {
  /** Inclusive ISO date bounds (YYYY-MM-DD) of the month being viewed. */
  start: string
  end: string
}

/** Net amount moved into a wallet within [start, end] — deposits minus withdrawals. */
function netContribution(wallet: Wallet, start: string, end: string): number {
  return wallet.movements.reduce((sum, m) => {
    if (m.date < start || m.date > end) return sum
    return m.type === 'deposit' ? sum + m.amount : sum - m.amount
  }, 0)
}

/**
 * Insights widget: how the user's wallets grew (or shrank) over the selected
 * month. Shows total set aside, this month's net contribution across all
 * wallets, and a per-wallet row with balance + goal progress. Hidden when the
 * user has no active wallets.
 */
export default function WalletInsightsCard({ start, end }: Props) {
  const wallets = useStore((s) => s.wallets)

  const { active, totalStashed, monthNet } = useMemo(() => {
    const active = wallets.filter((w) => !w.isArchived)
    const totalStashed = active.reduce((s, w) => s + walletBalance(w), 0)
    const monthNet = active.reduce((s, w) => s + netContribution(w, start, end), 0)
    return { active, totalStashed, monthNet }
  }, [wallets, start, end])

  if (active.length === 0) return null

  return (
    <div
      className="rounded-2xl px-5 py-4"
      style={{ background: '#ffffff', boxShadow: '0 4px 24px rgba(0,53,46,0.07)' }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: '#00352e' }}>
          Wallets
        </span>
        <Link
          href="/wallets"
          className="flex items-center gap-0.5 text-[11px] font-semibold transition-colors"
          style={{ color: '#1f695d' }}
        >
          Manage
          <CaretRight size={11} weight="bold" aria-hidden="true" />
        </Link>
      </div>

      {/* Totals */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(31,105,80,0.08)' }}>
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#1f6950' }}>
            Total set aside
          </span>
          <p className="mt-0.5 font-mono text-[15px] font-bold" style={{ color: '#00352e' }}>
            {formatCurrency(totalStashed)}
          </p>
        </div>
        <div className="rounded-xl px-3 py-2.5" style={{ background: monthNet >= 0 ? 'rgba(31,105,80,0.08)' : 'rgba(186,26,26,0.08)' }}>
          <div className="flex items-center gap-1">
            <TrendUp size={11} weight="bold" style={{ color: monthNet >= 0 ? '#1f6950' : '#ba1a1a' }} aria-hidden="true" />
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: monthNet >= 0 ? '#1f6950' : '#ba1a1a' }}>
              This month
            </span>
          </div>
          <p className="mt-0.5 font-mono text-[15px] font-bold" style={{ color: monthNet >= 0 ? '#00352e' : '#ba1a1a' }}>
            {monthNet >= 0 ? '+' : '−'}{formatCurrency(Math.abs(monthNet))}
          </p>
        </div>
      </div>

      {/* Per-wallet rows */}
      <div className="flex flex-col gap-2.5">
        {active.map((w) => {
          const Icon = getIconComponent(w.icon)
          const accent = walletAccent(w.color)
          const balance = walletBalance(w)
          const progress = walletGoalProgress(w)
          const net = netContribution(w, start, end)
          return (
            <div key={w.id}>
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{ background: `${accent}1a` }}
                >
                  <Icon size={13} weight="fill" color={accent} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[12px] font-semibold" style={{ color: '#191c1c' }}>
                      {w.name}
                    </span>
                    <span className="shrink-0 font-mono text-[12px] font-bold" style={{ color: '#3f4946' }}>
                      {formatCurrency(balance)}
                    </span>
                  </div>
                  {progress != null && (
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full" style={{ background: '#eef2f1' }}>
                      <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, background: accent }} />
                    </div>
                  )}
                </div>
                {/* This month's movement for this wallet — quiet unless nonzero. */}
                {net !== 0 && (
                  <span
                    className="shrink-0 font-mono text-[11px] font-semibold"
                    style={{ color: net > 0 ? '#1f6950' : '#ba1a1a' }}
                  >
                    {net > 0 ? '+' : '−'}{formatCurrency(Math.abs(net))}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
