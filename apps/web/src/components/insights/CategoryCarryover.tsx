'use client'

import { createElement, useState } from 'react'
import { ArrowBendDownRight, ArrowBendUpLeft, ArrowCounterClockwise, Check, Wallet as WalletIcon } from '@phosphor-icons/react'
import { formatCurrency } from '@/lib/formatters'
import { getIconComponent } from '@/lib/iconMap'
import { useStore } from '@/lib/store'
import type { BudgetCarryover, Wallet } from '@/types'

function shortMonth(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' })
}

/**
 * Always-visible indicators on a Budget Flow row: money that left this
 * category's month (into a wallet or the next month's budget) and money that
 * was carried in from the month before.
 */
export function CarryoverBadges({ outgoing, incoming, wallets }: {
  /** Carryover recorded FROM the viewed month for this category, if any. */
  outgoing?: BudgetCarryover
  /** Carryovers that landed IN the viewed month's budget for this category. */
  incoming: BudgetCarryover[]
  wallets: Wallet[]
}) {
  if (!outgoing && incoming.length === 0) return null

  const pills: { key: string; icon: typeof WalletIcon; text: string; tone: 'gain' | 'danger' }[] = []

  if (outgoing) {
    const amt = formatCurrency(Math.abs(outgoing.amount))
    if (outgoing.destination === 'wallet') {
      const name = wallets.find((w) => w.id === outgoing.walletId)?.name ?? 'a wallet'
      pills.push({
        key: outgoing.id,
        icon: WalletIcon,
        text: outgoing.amount > 0 ? `${amt} moved to ${name}` : `${amt} overage covered by ${name}`,
        tone: outgoing.amount > 0 ? 'gain' : 'danger',
      })
    } else {
      const to = shortMonth(outgoing.toMonth)
      pills.push({
        key: outgoing.id,
        icon: ArrowBendDownRight,
        text: outgoing.amount > 0 ? `${amt} carried over to ${to}` : `${amt} overage taken from ${to}`,
        tone: outgoing.amount > 0 ? 'gain' : 'danger',
      })
    }
  }

  for (const c of incoming) {
    const amt = formatCurrency(Math.abs(c.amount))
    const from = shortMonth(c.fromMonth)
    pills.push({
      key: c.id,
      icon: ArrowBendUpLeft,
      text: c.amount > 0 ? `+${amt} carried in from ${from}` : `−${amt} ${from} overage deducted`,
      tone: c.amount > 0 ? 'gain' : 'danger',
    })
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {pills.map(({ key, icon: Icon, text, tone }) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
          style={tone === 'gain'
            ? { background: 'rgba(31,105,80,0.09)', color: '#1f6950' }
            : { background: 'rgba(186,26,26,0.08)', color: '#ba1a1a' }}
        >
          <Icon size={11} weight="bold" aria-hidden="true" />
          {text}
        </span>
      ))}
    </div>
  )
}

/**
 * Inside an expanded past-month Budget Flow row: move the category's leftover
 * into a wallet, or — for last month only — carry it into the current month's
 * budget. Shows the applied state with an Undo once handled.
 */
export function CarryoverAction({ categoryId, categoryLabel, fromMonth, leftover, allowBudget, applied }: {
  categoryId: string
  categoryLabel: string
  fromMonth: string
  /** Positive leftover (limit − spent) for the month. */
  leftover: number
  /** Last month only: offer carrying into the current month's budget. */
  allowBudget: boolean
  applied?: BudgetCarryover
}) {
  const storeWallets = useStore((s) => s.wallets)
  const applyCarryover = useStore((s) => s.applyCarryover)
  const removeCarryover = useStore((s) => s.removeCarryover)
  const wallets = storeWallets.filter((w) => !w.isArchived)

  const [mode, setMode] = useState<'category' | 'wallet'>(allowBudget ? 'category' : 'wallet')
  const [walletId, setWalletId] = useState<string | undefined>(undefined)
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try { await fn() } finally { setBusy(false) }
  }

  const box = 'mb-3 rounded-xl p-2.5'
  const boxStyle = { background: '#f0f4f2', border: '1px solid #e7edeb' }

  if (applied) {
    const dest = applied.destination === 'wallet'
      ? storeWallets.find((w) => w.id === applied.walletId)?.name ?? 'a wallet'
      : `${shortMonth(applied.toMonth)} budget`
    return (
      <div className={`${box} flex items-center justify-between gap-2`} style={boxStyle}>
        <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: '#1f6950' }}>
          <Check size={12} weight="bold" aria-hidden="true" className="shrink-0" />
          <span className="truncate">{formatCurrency(Math.abs(applied.amount))} → {dest}</span>
        </span>
        <button
          type="button"
          onClick={() => run(() => removeCarryover(applied.id))}
          disabled={busy}
          className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold disabled:opacity-40"
          style={{ background: '#ffffff', color: '#3f4946' }}
        >
          <ArrowCounterClockwise size={11} weight="bold" aria-hidden="true" />
          Undo
        </button>
      </div>
    )
  }

  const canWallet = wallets.length > 0
  if (!allowBudget && !canWallet) {
    return (
      <p className={`${box} text-[11px]`} style={{ ...boxStyle, color: '#6e9990' }}>
        {formatCurrency(leftover)} left over. Add a wallet to move it somewhere safe.
      </p>
    )
  }

  const [y, m] = fromMonth.split('-').map(Number)
  const nextMonth = shortMonth(`${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}`)
  const ready = mode === 'category' || !!walletId

  return (
    <div className={box} style={boxStyle}>
      <p className="mb-2 text-[11.5px] font-semibold" style={{ color: '#191c1c' }}>
        {formatCurrency(leftover)} left over
        <span className="font-medium" style={{ color: '#6e9990' }}>
          {allowBudget ? ` — carry it into ${nextMonth} or stash it in a wallet.` : ' — move it into a wallet.'}
        </span>
      </p>

      {allowBudget && canWallet && (
        <div className="mb-2 flex gap-0.5 rounded-lg p-0.5" style={{ background: '#ffffff' }}>
          {([
            { id: 'category' as const, icon: ArrowBendDownRight, label: `${nextMonth} budget` },
            { id: 'wallet' as const, icon: WalletIcon, label: 'Wallet' },
          ]).map(({ id, icon: Icon, label }) => {
            const active = mode === id
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => setMode(id)}
                className="flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-bold transition-colors"
                style={active ? { background: '#1f695d', color: '#ffffff' } : { color: '#6e9990' }}
              >
                <Icon size={12} weight="bold" aria-hidden="true" />
                {label}
              </button>
            )
          })}
        </div>
      )}

      {mode === 'wallet' && canWallet && (
        <div className="mb-2 grid grid-cols-2 gap-1.5">
          {wallets.map((w) => {
            const active = w.id === walletId
            return (
              <button
                key={w.id}
                type="button"
                aria-pressed={active}
                onClick={() => setWalletId(w.id)}
                className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-semibold transition-colors"
                style={active ? { background: '#1f695d', color: '#ffffff' } : { background: '#ffffff', color: '#3f4946' }}
              >
                {createElement(getIconComponent(w.icon), { size: 13, weight: active ? 'fill' : 'regular', 'aria-hidden': true })}
                <span className="truncate">{w.name}</span>
              </button>
            )
          })}
        </div>
      )}

      <button
        type="button"
        disabled={busy || !ready}
        onClick={() => run(() => applyCarryover({
          categoryId,
          categoryLabel,
          fromMonth,
          amount: leftover,
          destination: mode,
          walletId: mode === 'wallet' ? walletId : undefined,
        }))}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-bold text-white disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)' }}
      >
        {mode === 'wallet' ? <WalletIcon size={13} weight="bold" aria-hidden="true" /> : <ArrowBendDownRight size={13} weight="bold" aria-hidden="true" />}
        {busy ? 'Moving…' : mode === 'wallet' ? `Move ${formatCurrency(leftover)} to wallet` : `Carry ${formatCurrency(leftover)} to ${nextMonth}`}
      </button>
    </div>
  )
}
