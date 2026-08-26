'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { CaretRight } from '@phosphor-icons/react'
import { useStore } from '@/lib/store'
import { formatCurrencyCompact } from '@/lib/formatters'
import { getIconComponent } from '@/lib/iconMap'
import { walletAccent } from '@/lib/walletColors'
import { walletBalance } from '@/types'

/**
 * A slim, horizontally scrollable row of wallet balance chips shown atop the
 * ledger. Gives quick context on how much is set aside while reviewing activity,
 * and each chip links straight to the Wallets page. Hidden when the user has no
 * active wallets (the dashboard carries the create prompt).
 */
export default function WalletStrip() {
  const wallets = useStore((s) => s.wallets)
  const active = useMemo(() => wallets.filter((w) => !w.isArchived), [wallets])

  if (active.length === 0) return null

  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: '#6e9990' }}>
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
      <div
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
        style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
      >
        {active.map((w) => {
          const Icon = getIconComponent(w.icon)
          const accent = walletAccent(w.color)
          return (
            <Link
              key={w.id}
              href="/wallets"
              className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 transition-transform active:scale-[0.97]"
              style={{ background: '#ffffff', boxShadow: '0 2px 12px rgba(0,53,46,0.05)' }}
            >
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                style={{ background: `${accent}1a` }}
              >
                <Icon size={12} weight="fill" color={accent} aria-hidden="true" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold leading-tight" style={{ color: '#3f4946' }}>
                  {w.name}
                </span>
                <span className="font-mono text-[12px] font-bold leading-tight" style={{ color: '#00352e' }}>
                  {formatCurrencyCompact(walletBalance(w))}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
