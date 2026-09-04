'use client'

import { createElement, useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Plus, ArrowLeft, Trash, Wallet as WalletIcon, ArrowDown, ArrowUp, PencilSimple, Archive, ArrowCounterClockwise, CaretDown, LinkSimple, Pencil, Check, Tag } from '@phosphor-icons/react'
import { useStore } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { getIconComponent, getIconBg, WALLET_ICON_OPTIONS } from '@/lib/iconMap'
import { walletAccent, walletGradient, WALLET_COLOR_HEX, WALLET_COLOR_OPTIONS } from '@/lib/walletColors'
import CategoryPickerSheet from '@/components/ledger/CategoryPickerSheet'
import { WALLET_KINDS, walletBalance, walletGoalProgress } from '@/types'
import type { Wallet, WalletKind, WalletMovement, WalletMovementType, Category } from '@/types'

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const accentFor = walletAccent

/**
 * Shared decorative chrome that makes a wallet's gradient panel read like a real
 * plastic card — soft light blobs, a diagonal gloss sweep, a faint hairline
 * texture, a big faded icon watermark, and the LedgeIt wordmark. Purely visual;
 * sits behind the card content (which is `relative`). `iconName` drives the
 * watermark so it matches the card's chosen icon. (The bronze chip is rendered
 * inline via <CardChip /> so it participates in the card's layout flow.)
 */
function CardDecor({ iconName }: { iconName: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Ambient light blobs */}
      <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full" style={{ background: 'rgba(255,255,255,0.16)', filter: 'blur(2px)' }} />
      <div className="absolute -bottom-14 -left-8 h-36 w-36 rounded-full" style={{ background: 'rgba(0,0,0,0.10)' }} />
      {/* Diagonal gloss sweep */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 42%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.06) 100%)' }} />
      {/* Fine hairline texture */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{ background: 'repeating-linear-gradient(135deg, #fff 0px, #fff 1px, transparent 1px, transparent 7px)' }}
      />
      {/* Large faded icon watermark */}
      <div className="absolute -bottom-4 right-1 opacity-[0.13]">
        {createElement(getIconComponent(iconName), { size: 96, weight: 'fill', color: '#ffffff' })}
      </div>
      {/* Brand wordmark */}
      <span className="absolute bottom-3 right-4 text-[10px] font-black italic tracking-tight text-white opacity-40">LedgeIt</span>
    </div>
  )
}

/**
 * The EMV-style bronze chip plate. Rendered inline in the card body (not as
 * absolute decor) so it sits in the layout flow and shows identically on both
 * the roomy preview card and the shorter list cards.
 */
function CardChip() {
  return (
    <div
      className="relative h-7 w-9 overflow-hidden rounded-[6px]"
      style={{ background: 'linear-gradient(135deg, #f7e7ad 0%, #d9b96a 55%, #b8933f 100%)', boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.15)', opacity: 0.9 }}
    >
      <div className="absolute left-1/2 top-0 h-full w-[1px] -translate-x-1/2" style={{ background: 'rgba(0,0,0,0.22)' }} />
      <div className="absolute top-1/2 left-0 h-[1px] w-full -translate-y-1/2" style={{ background: 'rgba(0,0,0,0.22)' }} />
      <div className="absolute left-1 top-1 h-[1px] w-[calc(100%-8px)]" style={{ background: 'rgba(0,0,0,0.14)' }} />
      <div className="absolute bottom-1 left-1 h-[1px] w-[calc(100%-8px)]" style={{ background: 'rgba(0,0,0,0.14)' }} />
    </div>
  )
}

/**
 * The full wallets UI (summary, list, add/edit form, per-wallet deposit/withdraw)
 * with no modal or page chrome. Rendered by the /wallets page.
 */
export default function WalletLedger() {
  const wallets = useStore((s) => s.wallets)
  const addWallet = useStore((s) => s.addWallet)
  const updateWallet = useStore((s) => s.updateWallet)
  const recordWalletMovement = useStore((s) => s.recordWalletMovement)
  const removeWalletMovement = useStore((s) => s.removeWalletMovement)
  const toggleWalletArchived = useStore((s) => s.toggleWalletArchived)
  const removeWallet = useStore((s) => s.removeWallet)
  const customCategories = useStore((s) => s.customCategories)
  const hiddenCategories = useStore((s) => s.hiddenCategories)
  const prefersReducedMotion = useReducedMotion()

  const [view, setView] = useState<'list' | 'add'>('list')
  // Set while editing an existing wallet; null when creating a new one.
  const [editingId, setEditingId] = useState<string | null>(null)

  // Add/edit-wallet form state
  const [name, setName] = useState('')
  const [kind, setKind] = useState<WalletKind>('savings')
  const [icon, setIcon] = useState<string>(WALLET_KINDS[0].icon)
  const [color, setColor] = useState<string>(WALLET_KINDS[0].color)
  // Whether the user has hand-picked an icon/color. Until they do, both track
  // the selected kind's defaults so switching kind feels natural.
  const [iconTouched, setIconTouched] = useState(false)
  const [colorTouched, setColorTouched] = useState(false)
  const [target, setTarget] = useState('')
  const [note, setNote] = useState('')
  const [initialAmount, setInitialAmount] = useState('')
  const [saving, setSaving] = useState(false)

  // Per-wallet movement input + delete confirm
  const [moveFor, setMoveFor] = useState<string | null>(null)
  const [moveType, setMoveType] = useState<WalletMovementType>('deposit')
  const [moveAmount, setMoveAmount] = useState('')
  // Optional category tag for the current move (null = default Transfers).
  const [moveCategory, setMoveCategory] = useState<Category | null>(null)
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  // Wallet whose movement history is expanded, plus which movement is pending delete.
  const [historyFor, setHistoryFor] = useState<string | null>(null)
  const [movementDeleteConfirm, setMovementDeleteConfirm] = useState<string | null>(null)

  const { active, archived, totalStashed } = useMemo(() => {
    const active = wallets.filter((w) => !w.isArchived)
    const archived = wallets.filter((w) => w.isArchived)
    const totalStashed = active.reduce((s, w) => s + walletBalance(w), 0)
    return { active, archived, totalStashed }
  }, [wallets])

  // Movement → tagged category, resolved from the linked transfer transaction so
  // we can show which category the money moved from/to. The "Transfers" preset
  // is the default (untagged), so we only surface a badge for anything else.
  const transactions = useStore((s) => s.transactions)
  const movementCategoryById = useMemo(() => {
    const byTxId = new Map(transactions.map((t) => [t.id, t.category]))
    const map = new Map<string, Category>()
    for (const w of wallets) {
      for (const m of w.movements) {
        if (!m.transactionId) continue
        const cat = byTxId.get(m.transactionId)
        if (cat && cat.id !== 'transfers') map.set(m.id, cat)
      }
    }
    return map
  }, [transactions, wallets])

  function openAdd() {
    const first = WALLET_KINDS[0]
    setEditingId(null)
    setName('')
    setKind(first.id)
    setIcon(first.icon)
    setColor(first.color)
    setIconTouched(false)
    setColorTouched(false)
    setTarget('')
    setNote('')
    setInitialAmount('')
    setView('add')
  }

  function openEdit(wallet: Wallet) {
    setEditingId(wallet.id)
    setName(wallet.name)
    setKind(wallet.kind)
    setIcon(wallet.icon)
    setColor(wallet.color)
    // Existing wallets keep whatever icon/color they were saved with.
    setIconTouched(true)
    setColorTouched(true)
    setTarget(wallet.target != null ? String(wallet.target) : '')
    setNote(wallet.note ?? '')
    setInitialAmount('')
    setView('add')
  }

  // Picking a kind updates icon/color to that kind's defaults, unless the user
  // has already hand-picked one (then we leave their choice alone).
  function chooseKind(k: WalletKind) {
    setKind(k)
    const meta = WALLET_KINDS.find((m) => m.id === k)
    if (meta) {
      if (!iconTouched) setIcon(meta.icon)
      if (!colorTouched) setColor(meta.color)
    }
  }

  async function handleSave() {
    if (!name.trim()) return
    const targetVal = parseFloat(target.replace(/[^0-9.]/g, '')) || 0
    setSaving(true)
    if (editingId) {
      await updateWallet(editingId, {
        name: name.trim(),
        kind,
        icon,
        color,
        target: targetVal > 0 ? targetVal : undefined,
        note: note.trim() || undefined,
      })
    } else {
      const initial = parseFloat(initialAmount.replace(/[^0-9.]/g, '')) || 0
      await addWallet({
        name: name.trim(),
        kind,
        icon,
        color,
        target: targetVal > 0 ? targetVal : undefined,
        note: note.trim() || undefined,
        initialAmount: initial > 0 ? initial : undefined,
        date: todayISO(),
      })
    }
    setSaving(false)
    setEditingId(null)
    setView('list')
  }

  function openMove(walletId: string, isOpen: boolean) {
    setMoveFor(isOpen ? null : walletId)
    setHistoryFor(null)
    setMoveType('deposit')
    setMoveAmount('')
    setMoveCategory(null)
  }

  async function handleMove(walletId: string) {
    const amount = parseFloat(moveAmount.replace(/[^0-9.]/g, '')) || 0
    if (amount <= 0) return
    await recordWalletMovement(walletId, {
      type: moveType,
      amount,
      date: todayISO(),
      category: moveCategory ?? undefined,
    })
    setMoveFor(null)
    setMoveAmount('')
    setMoveCategory(null)
  }

  async function handleDelete(walletId: string) {
    if (deleteConfirm !== walletId) {
      setDeleteConfirm(walletId)
      return
    }
    await removeWallet(walletId)
    setDeleteConfirm(null)
  }

  async function handleMovementDelete(walletId: string, movement: WalletMovement) {
    if (movementDeleteConfirm !== movement.id) {
      setMovementDeleteConfirm(movement.id)
      return
    }
    await removeWalletMovement(walletId, movement.id)
    setMovementDeleteConfirm(null)
  }

  function WalletRow({ wallet, index = 0 }: { wallet: Wallet; index?: number }) {
    const balance = walletBalance(wallet)
    const progress = walletGoalProgress(wallet)
    const accent = accentFor(wallet.color)
    const gradient = walletGradient(wallet.color)
    const kindMeta = WALLET_KINDS.find((k) => k.id === wallet.kind)
    const isMoving = moveFor === wallet.id
    const isDeletePending = deleteConfirm === wallet.id
    const isHistoryOpen = historyFor === wallet.id
    const isDrawerOpen = isMoving || isHistoryOpen
    const movements = [...wallet.movements].reverse() // newest first
    const KindIcon = getIconComponent(wallet.icon)

    // Poker-deal entrance: each card is "thrown" from the dealer's hand (off the
    // top-right corner), gliding and settling into its slot, staggered so they
    // land one after another. A gentle spring (soft, barely-overshooting) keeps
    // the motion smooth rather than snappy. Reduced-motion users get a plain fade.
    const dealInitial = prefersReducedMotion
      ? { opacity: 0 }
      : { opacity: 0, x: 220, y: -150, rotate: 24, scale: 0.86 }
    const dealAnimate = prefersReducedMotion
      ? { opacity: 1 }
      : { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }
    const dealTransition = prefersReducedMotion
      ? { duration: 0.2, delay: index * 0.04 }
      : {
          delay: index * 0.1,
          type: 'spring' as const,
          stiffness: 140,
          damping: 26,
          mass: 1.1,
          opacity: { duration: 0.28, delay: index * 0.1, ease: 'easeOut' as const },
        }

    return (
      <motion.div
        initial={dealInitial}
        animate={dealAnimate}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={dealTransition}
        style={{
          background: gradient,
          boxShadow: '0 16px 36px -10px rgba(0,53,46,0.4)',
          opacity: wallet.isArchived ? 0.72 : 1,
          transformOrigin: 'bottom right',
          willChange: 'transform',
        }}
        className="relative overflow-hidden rounded-3xl p-5"
      >
        <CardDecor iconName={wallet.icon} />

        <div className="relative">
          {/* Top row: icon + name/kind, and action buttons */}
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.22)' }}
            >
              <KindIcon size={22} weight="fill" color="#ffffff" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2">
                <span className="truncate text-base font-bold text-white">{wallet.name}</span>
                {wallet.isArchived && (
                  <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ background: 'rgba(255,255,255,0.25)', color: '#ffffff' }}>
                    Archived
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {kindMeta?.label ?? 'Wallet'}
                {wallet.note ? ` · ${wallet.note}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <motion.button
                aria-label="Edit wallet"
                whileTap={{ scale: 0.85 }}
                onClick={() => openEdit(wallet)}
                className="flex h-7 w-7 items-center justify-center rounded-full"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                <PencilSimple size={12} weight="bold" color="#ffffff" aria-hidden="true" />
              </motion.button>
              <motion.button
                aria-label={wallet.isArchived ? 'Restore wallet' : 'Archive wallet'}
                whileTap={{ scale: 0.85 }}
                onClick={() => toggleWalletArchived(wallet.id)}
                className="flex h-7 w-7 items-center justify-center rounded-full"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                {wallet.isArchived
                  ? <ArrowCounterClockwise size={12} weight="bold" color="#ffffff" aria-hidden="true" />
                  : <Archive size={12} weight="bold" color="#ffffff" aria-hidden="true" />}
              </motion.button>
              <motion.button
                aria-label={isDeletePending ? 'Confirm delete' : 'Delete wallet'}
                whileTap={{ scale: 0.85 }}
                onClick={() => handleDelete(wallet.id)}
                className="flex h-7 w-7 items-center justify-center rounded-full"
                style={{ background: isDeletePending ? '#ffffff' : 'rgba(255,255,255,0.2)' }}
              >
                <Trash size={12} weight="bold" color={isDeletePending ? '#ba1a1a' : '#ffffff'} aria-hidden="true" />
              </motion.button>
            </div>
          </div>

          {/* Bronze chip */}
          <div className="mt-4">
            <CardChip />
          </div>

          {/* Big balance */}
          <div className="mt-4 pr-16">
            <p className="font-mono text-[32px] font-extrabold leading-none tracking-tight text-white sm:text-[36px]">
              {formatCurrency(balance)}
            </p>
            {progress != null && (
              <p className="mt-2 text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {Math.round(progress * 100)}% of {formatCurrency(wallet.target!)} goal
              </p>
            )}
          </div>

          {progress != null && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.22)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: '#ffffff' }}
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 22 }}
              />
            </div>
          )}

          {/* Bottom action row: Move + activity toggle */}
          <div className="mt-4 flex items-center gap-2">
            {!wallet.isArchived && (
              <motion.button
                aria-label="Move money"
                whileTap={{ scale: 0.94 }}
                onClick={() => openMove(wallet.id, isMoving)}
                className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full text-[12px] font-bold"
                style={{ background: '#ffffff', color: accent }}
              >
                <Plus size={12} weight="bold" aria-hidden="true" />
                Move money
              </motion.button>
            )}
            {wallet.movements.length > 0 && (
              <button
                onClick={() => { setHistoryFor(isHistoryOpen ? null : wallet.id); setMoveFor(null); setMovementDeleteConfirm(null) }}
                aria-expanded={isHistoryOpen}
                aria-label={isHistoryOpen ? 'Hide activity' : 'Show activity'}
                className="flex h-8 items-center gap-1 rounded-full px-3 text-[12px] font-bold"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff' }}
              >
                {wallet.movements.length}
                <motion.span animate={{ rotate: isHistoryOpen ? 180 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className="inline-flex">
                  <CaretDown size={11} weight="bold" aria-hidden="true" />
                </motion.span>
              </button>
            )}
          </div>
        </div>

        {/* Drawer wrapper — a white panel sits on the colored card for
            legible inputs and history rows. */}
        <div className="relative">
        <AnimatePresence>
          {isDrawerOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-3 rounded-2xl bg-white p-3"
              style={{ boxShadow: '0 6px 18px rgba(0,0,0,0.14)' }}
            >
        {isMoving && (
            <div>
              {/* Deposit / Withdraw toggle */}
              <div className="mb-2 flex rounded-lg p-1" style={{ background: '#f0f4f2' }}>
                {([
                  { id: 'deposit' as const, label: 'Deposit', icon: ArrowDown },
                  { id: 'withdrawal' as const, label: 'Withdraw', icon: ArrowUp },
                ]).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setMoveType(opt.id)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-bold transition-colors"
                    style={{
                      background: moveType === opt.id ? '#ffffff' : 'transparent',
                      color: moveType === opt.id ? '#00352e' : '#6e9990',
                      boxShadow: moveType === opt.id ? '0 1px 4px rgba(0,53,46,0.10)' : 'none',
                    }}
                  >
                    <opt.icon size={11} weight="bold" aria-hidden="true" />
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center gap-1 rounded-lg px-3 py-2" style={{ background: '#f8faf9', border: '1px solid #cde0db' }}>
                  <span className="font-mono text-sm font-semibold" style={{ color: '#6e9990' }}>₱</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    autoFocus
                    value={moveAmount}
                    onChange={(e) => setMoveAmount(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleMove(wallet.id)}
                    placeholder={moveType === 'withdrawal' ? `Up to ${formatCurrency(balance)}` : '0'}
                    className="w-full bg-transparent font-mono text-sm font-semibold outline-none"
                    style={{ color: '#191c1c' }}
                  />
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleMove(wallet.id)}
                  className="self-stretch rounded-lg px-4 text-[12px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)' }}
                >
                  {moveType === 'deposit' ? 'Deposit' : 'Withdraw'}
                </motion.button>
              </div>

              {/* Optional category tag — which pocket the money came from / went
                  to. Purely for identification; the entry stays a transfer. */}
              <button
                onClick={() => setCategoryPickerOpen(true)}
                className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left"
                style={{ background: '#f8faf9', border: '1px solid #eef2f1' }}
              >
                {moveCategory ? (
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={{ background: getIconBg(moveCategory) }}
                  >
                    {createElement(getIconComponent(moveCategory.icon), { size: 12, weight: 'fill', color: '#ffffff', 'aria-hidden': true })}
                  </span>
                ) : (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: '#e7edeb' }}>
                    <Tag size={12} weight="bold" color="#6e9990" aria-hidden="true" />
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold" style={{ color: moveCategory ? '#191c1c' : '#6e9990' }}>
                  {moveCategory
                    ? moveCategory.label
                    : moveType === 'deposit' ? 'Tag where it came from (optional)' : 'Tag where it went (optional)'}
                </span>
                {moveCategory && (
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Clear category"
                    onClick={(e) => { e.stopPropagation(); setMoveCategory(null) }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setMoveCategory(null) } }}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                    style={{ background: '#e7edeb' }}
                  >
                    <Pencil size={10} weight="bold" color="#6e9990" aria-hidden="true" />
                  </span>
                )}
                <CaretDown size={11} weight="bold" color="#a9c2bd" aria-hidden="true" />
              </button>

              <p className="mt-1.5 text-[10px]" style={{ color: '#6e9990' }}>
                Logged as a transfer between your pockets — it won’t count as spending or income{moveCategory ? `, just tagged ${moveCategory.label} so you can spot it later` : ''}.
              </p>

              <CategoryPickerSheet
                open={categoryPickerOpen}
                title={moveType === 'deposit' ? 'Where did it come from?' : 'Where did it go?'}
                customCategories={customCategories}
                hiddenCategories={hiddenCategories}
                onSelect={(cat) => { setMoveCategory(cat); setCategoryPickerOpen(false) }}
                onClose={() => setCategoryPickerOpen(false)}
              />
            </div>
          )}

        {/* Movement history — each row tagged Manual vs Linked so it's clear
            whether the entry is a direct deposit/withdrawal or mirrors a real
            expense/income logged elsewhere. */}
        {isHistoryOpen && (
            <div>
              <div className="rounded-xl p-2" style={{ background: '#f8faf9', border: '1px solid #eef2f1' }}>
                {movements.map((m) => {
                  const isDeposit = m.type === 'deposit'
                  const isLinked = m.source === 'linked'
                  const pendingDelete = movementDeleteConfirm === m.id
                  const movementCat = movementCategoryById.get(m.id)
                  return (
                    <div key={m.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                      <div
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                        style={{ background: isDeposit ? 'rgba(31,105,80,0.1)' : 'rgba(180,83,9,0.1)' }}
                      >
                        {isDeposit
                          ? <ArrowDown size={11} weight="bold" color="#1f6950" aria-hidden="true" />
                          : <ArrowUp size={11} weight="bold" color="#b45309" aria-hidden="true" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-semibold" style={{ color: isDeposit ? '#1f6950' : '#b45309' }}>
                            {isDeposit ? '+' : '−'}{formatCurrency(m.amount)}
                          </span>
                          {/* Source tag */}
                          <span
                            className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide"
                            style={isLinked
                              ? { background: 'rgba(31,105,93,0.1)', color: '#1f695d' }
                              : { background: '#e7edeb', color: '#6e9990' }}
                          >
                            {isLinked
                              ? <LinkSimple size={8} weight="bold" aria-hidden="true" />
                              : <Pencil size={8} weight="bold" aria-hidden="true" />}
                            {isLinked ? 'Linked' : 'Manual'}
                          </span>
                          {/* Category tag — which pocket the money came from / went to */}
                          {movementCat && (
                            <span
                              className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white"
                              style={{ background: getIconBg(movementCat) }}
                            >
                              {createElement(getIconComponent(movementCat.icon), { size: 8, weight: 'fill', 'aria-hidden': true })}
                              {movementCat.label.split(/[\s&]/)[0]}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px]" style={{ color: '#a9c2bd' }}>
                          {formatDate(m.date)}
                          {m.note ? ` · ${m.note}` : ''}
                        </p>
                      </div>
                      <motion.button
                        aria-label={pendingDelete ? 'Confirm remove movement' : 'Remove movement'}
                        whileTap={{ scale: 0.85 }}
                        onClick={() => handleMovementDelete(wallet.id, m)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                        style={{ background: pendingDelete ? '#ba1a1a' : 'transparent' }}
                      >
                        <Trash size={11} weight="bold" color={pendingDelete ? '#fff' : '#a9c2bd'} aria-hidden="true" />
                      </motion.button>
                    </div>
                  )
                })}
                {/* Explainer for the tags */}
                <div className="mt-1 flex items-start gap-1.5 px-2 pt-1.5" style={{ borderTop: '1px solid #eef2f1' }}>
                  <span className="text-[10px] leading-relaxed" style={{ color: '#6e9990' }}>
                    <span className="font-bold">Linked</span> movements mirror a real expense or income from your ledger — removing one here keeps that entry, it just stops counting toward this wallet. <span className="font-bold">Manual</span> ones are direct deposits/withdrawals.
                  </span>
                </div>
              </div>
            </div>
          )}
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </motion.div>
    )
  }

  // ── Add/edit form ──────────────────────────────────────────────────────────────
  if (view === 'add') {
    const nameValid = name.trim().length > 0
    return (
      <div>
        <div className="mb-4 flex items-center gap-3">
          <motion.button
            aria-label="Back"
            onClick={() => { setView('list'); setEditingId(null) }}
            whileTap={{ scale: 0.88 }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ background: '#f0f4f2' }}
          >
            <ArrowLeft size={16} weight="bold" style={{ color: '#3f4946' }} aria-hidden="true" />
          </motion.button>
          <h2 className="text-base font-bold" style={{ color: '#00352e' }}>{editingId ? 'Edit Wallet' : 'New Wallet'}</h2>
        </div>

        {/* Live card preview — the hero at the top, mirroring how the wallet
            card will actually look: chosen icon + color, big balance, and goal
            progress when set. */}
        {(() => {
          // Balance shown in the preview. New wallets start at the (optional)
          // initial balance, defaulting to 0. When editing, show the wallet's
          // real current balance so the preview matches reality.
          const editingWallet = editingId ? wallets.find((w) => w.id === editingId) : undefined
          const previewBalance = editingWallet
            ? walletBalance(editingWallet)
            : parseFloat(initialAmount.replace(/[^0-9.]/g, '')) || 0
          const targetVal = parseFloat(target.replace(/[^0-9.]/g, '')) || 0
          const previewProgress = targetVal > 0 ? Math.min(Math.max(previewBalance / targetVal, 0), 1) : null
          return (
            <div
              className="relative mx-auto mb-6 flex aspect-[1.586/1] w-full max-w-sm flex-col justify-between overflow-hidden rounded-3xl p-5"
              style={{ background: walletGradient(color), boxShadow: '0 16px 36px -10px rgba(0,53,46,0.4)' }}
            >
              <CardDecor iconName={icon} />
              <div className="relative flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'rgba(255,255,255,0.22)' }}>
                  {createElement(getIconComponent(icon), { size: 22, weight: 'fill', color: '#ffffff', 'aria-hidden': true })}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="truncate text-base font-bold text-white">{name.trim() || 'Wallet name'}</p>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {WALLET_KINDS.find((k) => k.id === kind)?.label ?? 'Wallet'}
                    {note.trim() ? ` · ${note.trim()}` : ''}
                  </p>
                </div>
              </div>
              <div className="relative">
                <CardChip />
              </div>
              <div className="relative pr-16">
                <p className="font-mono text-[32px] font-extrabold leading-none tracking-tight text-white sm:text-[36px]">
                  {formatCurrency(previewBalance)}
                </p>
                {previewProgress != null && (
                  <>
                    <p className="mt-2 text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      {Math.round(previewProgress * 100)}% of {formatCurrency(targetVal)} goal
                    </p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.22)' }}>
                      <div className="h-full rounded-full" style={{ width: `${previewProgress * 100}%`, background: '#ffffff' }} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })()}

        {/* Kind picker */}
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>Type</label>
        <div className="mb-4 grid grid-cols-3 gap-2">
          {WALLET_KINDS.map((k) => {
            const KindIcon = getIconComponent(k.icon)
            const isSel = kind === k.id
            const accent = accentFor(k.color)
            return (
              <button
                key={k.id}
                onClick={() => chooseKind(k.id)}
                className="flex flex-col items-center gap-1 rounded-xl py-2.5 transition-colors"
                style={{
                  background: isSel ? `${accent}14` : '#f0f4f2',
                  border: isSel ? `1.5px solid ${accent}` : '1.5px solid transparent',
                }}
              >
                <KindIcon size={18} weight={isSel ? 'fill' : 'regular'} color={isSel ? accent : '#6e9990'} aria-hidden="true" />
                <span className="text-[10px] font-bold" style={{ color: isSel ? accent : '#6e9990' }}>{k.label}</span>
              </button>
            )
          })}
        </div>

        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>Name</label>
        <input
          type="text"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="E.g. Emergency Fund"
          autoFocus
          className="mb-4 w-full rounded-xl px-4 py-3 text-sm font-semibold outline-none"
          style={{ background: '#f0f4f2', color: '#191c1c', border: '1.5px solid transparent' }}
          onFocus={(e) => (e.currentTarget.style.border = '1.5px solid #1f695d')}
          onBlur={(e) => (e.currentTarget.style.border = '1.5px solid transparent')}
        />

        {/* Icon picker */}
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>Icon</label>
        <div className="mb-4 grid max-h-32 grid-cols-10 gap-1.5 overflow-y-auto pr-0.5" style={{ scrollbarWidth: 'none' }}>
          {WALLET_ICON_OPTIONS.map((iconName) => {
            const Icon = getIconComponent(iconName)
            const isSel = icon === iconName
            const accent = accentFor(color)
            return (
              <motion.button
                key={iconName}
                type="button"
                aria-label={iconName}
                aria-pressed={isSel}
                whileTap={{ scale: 0.88 }}
                onClick={() => { setIcon(iconName); setIconTouched(true) }}
                className="flex aspect-square items-center justify-center rounded-lg"
                style={{ background: isSel ? accent : '#f0f4f2' }}
              >
                <Icon size={14} weight={isSel ? 'fill' : 'regular'} color={isSel ? '#fff' : '#3f4946'} aria-hidden="true" />
              </motion.button>
            )
          })}
        </div>

        {/* Color picker */}
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>Color</label>
        <div className="mb-4 grid grid-cols-9 gap-2">
          {WALLET_COLOR_OPTIONS.map((colorKey) => {
            const hex = WALLET_COLOR_HEX[colorKey]
            const isSel = color === colorKey
            return (
              <motion.button
                key={colorKey}
                type="button"
                aria-label={colorKey}
                aria-pressed={isSel}
                whileTap={{ scale: 0.88 }}
                onClick={() => { setColor(colorKey); setColorTouched(true) }}
                className="flex h-7 w-7 items-center justify-center justify-self-center rounded-full"
                style={{ background: hex }}
              >
                {isSel && <Check size={12} weight="bold" color="#ffffff" aria-hidden="true" />}
              </motion.button>
            )
          })}
        </div>

        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
          Goal <span style={{ color: '#cde0db' }}>(optional)</span>
        </label>
        <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: '#f0f4f2' }}>
          <span className="font-mono text-sm font-semibold" style={{ color: '#6e9990' }}>₱</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Target amount to reach"
            className="flex-1 bg-transparent font-mono text-sm font-semibold outline-none"
            style={{ color: '#191c1c' }}
          />
        </div>

        {!editingId && (
          <>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
              Initial balance <span style={{ color: '#cde0db' }}>(optional)</span>
            </label>
            <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: '#f0f4f2' }}>
              <span className="font-mono text-sm font-semibold" style={{ color: '#6e9990' }}>₱</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                placeholder="0 — how much is already in it"
                className="flex-1 bg-transparent font-mono text-sm font-semibold outline-none"
                style={{ color: '#191c1c' }}
              />
            </div>
          </>
        )}

        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
          Note <span style={{ color: '#cde0db' }}>(optional)</span>
        </label>
        <input
          type="text"
          maxLength={60}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="E.g. house downpayment"
          className="w-full rounded-xl px-4 py-3 text-sm font-semibold outline-none"
          style={{ background: '#f0f4f2', color: '#191c1c', border: '1.5px solid transparent' }}
          onFocus={(e) => (e.currentTarget.style.border = '1.5px solid #1f695d')}
          onBlur={(e) => (e.currentTarget.style.border = '1.5px solid transparent')}
        />

        <p className="mt-4 text-[11px] leading-relaxed" style={{ color: '#6e9990' }}>
          Money you deposit into or withdraw from a wallet is logged as a transfer between your own pockets, so it never counts as spending or income. Set a goal to track progress.
        </p>

        <div className="mt-6 flex gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { setView('list'); setEditingId(null) }}
            className="flex-1 rounded-xl py-3 text-sm font-semibold"
            style={{ background: '#f0f4f2', color: '#3f4946' }}
          >
            Cancel
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            disabled={!nameValid || saving}
            className="flex-1 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)' }}
          >
            {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Wallet'}
          </motion.button>
        </div>
      </div>
    )
  }

  // ── List ─────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Summary — a hero "total balance" card in the ledgeit brand green */}
      <div
        className="relative mb-5 overflow-hidden rounded-3xl px-5 py-4"
        style={{ background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)', boxShadow: '0 12px 30px -10px rgba(0,53,46,0.45)' }}
      >
        <div aria-hidden="true" className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full" style={{ background: 'rgba(255,255,255,0.10)' }} />
        <div className="relative flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.7)' }}>Total stashed away</span>
            <p className="mt-1 font-mono text-[30px] font-extrabold leading-none tracking-tight text-white">{formatCurrency(totalStashed)}</p>
            <p className="mt-1.5 text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.65)' }}>
              across {active.length} {active.length === 1 ? 'wallet' : 'wallets'}
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'rgba(255,255,255,0.18)' }}>
            <WalletIcon size={22} weight="fill" color="#ffffff" aria-hidden="true" />
          </div>
        </div>
      </div>

      {wallets.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-center">
          <WalletIcon size={30} weight="duotone" style={{ color: '#cde0db' }} aria-hidden="true" />
          <p className="text-sm font-medium" style={{ color: '#6e9990' }}>No wallets yet.</p>
          <p className="text-xs" style={{ color: '#a9c2bd' }}>Create a savings, investment, or goal wallet to set money aside.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2" style={{ overflowX: 'clip' }}>
            <AnimatePresence>
              {active.map((w, i) => <WalletRow key={w.id} wallet={w} index={i} />)}
            </AnimatePresence>
          </div>
          {archived.length > 0 && (
            <>
              <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>Archived</p>
              <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2" style={{ overflowX: 'clip' }}>
                <AnimatePresence>
                  {archived.map((w, i) => <WalletRow key={w.id} wallet={w} index={active.length + i} />)}
                </AnimatePresence>
              </div>
            </>
          )}
        </>
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={openAdd}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5"
        style={{ border: '1.5px dashed #cde0db', background: 'transparent', color: '#1f695d' }}
      >
        <Plus size={14} weight="bold" aria-hidden="true" />
        <span className="text-sm font-semibold">New Wallet</span>
      </motion.button>
    </div>
  )
}
