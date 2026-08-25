'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Wallet as WalletIcon, CaretRight } from '@phosphor-icons/react'
import { formatCurrencyCompact } from '@/lib/formatters'
import { getIconComponent } from '@/lib/iconMap'
import { walletBalance, walletGoalProgress } from '@/types'
import type { Wallet } from '@/types'
import { useStore } from '@/lib/store'

// Wallet-kind accent color key → concrete hex. Mirrors WalletLedger's palette.
const COLOR_HEX: Record<string, string> = {
  teal:   '#0f766e',
  indigo: '#4338ca',
  rose:   '#be123c',
  amber:  '#b45309',
  green:  '#15803d',
  slate:  '#334155',
}
const accentFor = (key: string) => COLOR_HEX[key] ?? COLOR_HEX.teal

/**
 * Dashboard widget: total money set aside across all active wallets, with the
 * top few wallets and their balances/goal progress. Hidden entirely when the
 * user has no active wallets — keeping the dashboard clean for non-users.
 */
export default function WalletSummaryCard() {
  const wallets = useStore((s) => s.wallets)

  const { active, totalStashed, top } = useMemo(() => {
    const active = wallets.filter((w) => !w.isArchived)
    const totalStashed = active.reduce((s, w) => s + walletBalance(w), 0)
    // Surface the fullest wallets first — that's where the money is.
    const top = [...active]
      .sort((a, b) => walletBalance(b) - walletBalance(a))
      .slice(0, 3)
    return { active, totalStashed, top }
  }, [wallets])

  if (active.length === 0) return null

  return (
    <Link href="/wallets" className="block">
      <div
        className="flex h-full flex-col rounded-2xl px-5 py-4 transition-transform active:scale-[0.99]"
        style={{ background: '#ffffff', boxShadow: '0 4px 24px rgba(0,53,46,0.07)' }}
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: '#00352e' }}>
            Wallets
          </span>
          <div className="flex items-center gap-1.5">
            <WalletIcon size={15} weight="fill" color="#a9c2bd" aria-hidden="true" />
            <CaretRight size={12} weight="bold" color="#cde0db" aria-hidden="true" />
          </div>
        </div>

        {/* Total stashed */}
        <div className="mb-3 rounded-xl px-3 py-2.5" style={{ background: 'rgba(31,105,80,0.08)' }}>
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#1f6950' }}>
            Total stashed away
          </span>
          <p className="mt-0.5 font-mono text-[17px] font-bold" style={{ color: '#00352e' }}>
            {formatCurrencyCompact(totalStashed)}
          </p>
        </div>

        {/* Top wallets */}
        <div className="flex flex-col gap-2">
          {top.map((w: Wallet) => {
            const Icon = getIconComponent(w.icon)
            const accent = accentFor(w.color)
            const progress = walletGoalProgress(w)
            return (
              <div key={w.id} className="flex items-center gap-2.5">
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
                      {formatCurrencyCompact(walletBalance(w))}
                    </span>
                  </div>
                  {progress != null && (
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full" style={{ background: '#eef2f1' }}>
                      <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, background: accent }} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {active.length > top.length && (
          <p className="mt-2 text-[11px] font-medium" style={{ color: '#6e9990' }}>
            +{active.length - top.length} more
          </p>
        )}
      </div>
    </Link>
  )
}
