'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ArrowLeft, Trash, Wallet as WalletIcon, ArrowDown, ArrowUp, PencilSimple, Archive, ArrowCounterClockwise, CaretDown, LinkSimple, Pencil } from '@phosphor-icons/react'
import { useStore } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { getIconComponent } from '@/lib/iconMap'
import { WALLET_KINDS, walletBalance, walletGoalProgress } from '@/types'
import type { Wallet, WalletKind, WalletMovement, WalletMovementType } from '@/types'

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Wallet-kind accent color key → concrete hex. Mirrors the palette used across
// the app (see iconMap CUSTOM_COLOR_OPTIONS swatches).
const COLOR_HEX: Record<string, string> = {
  teal:   '#0f766e',
  indigo: '#4338ca',
  rose:   '#be123c',
  amber:  '#b45309',
  green:  '#15803d',
  slate:  '#334155',
}

function accentFor(colorKey: string): string {
  return COLOR_HEX[colorKey] ?? COLOR_HEX.teal
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

  const [view, setView] = useState<'list' | 'add'>('list')
  // Set while editing an existing wallet; null when creating a new one.
  const [editingId, setEditingId] = useState<string | null>(null)

  // Add/edit-wallet form state
  const [name, setName] = useState('')
  const [kind, setKind] = useState<WalletKind>('savings')
  const [target, setTarget] = useState('')
  const [note, setNote] = useState('')
  const [initialAmount, setInitialAmount] = useState('')
  const [saving, setSaving] = useState(false)

  // Per-wallet movement input + delete confirm
  const [moveFor, setMoveFor] = useState<string | null>(null)
  const [moveType, setMoveType] = useState<WalletMovementType>('deposit')
  const [moveAmount, setMoveAmount] = useState('')
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

  function openAdd() {
    setEditingId(null)
    setName('')
    setKind('savings')
    setTarget('')
    setNote('')
    setInitialAmount('')
    setView('add')
  }

  function openEdit(wallet: Wallet) {
    setEditingId(wallet.id)
    setName(wallet.name)
    setKind(wallet.kind)
    setTarget(wallet.target != null ? String(wallet.target) : '')
    setNote(wallet.note ?? '')
    setInitialAmount('')
    setView('add')
  }

  async function handleSave() {
    if (!name.trim()) return
    const targetVal = parseFloat(target.replace(/[^0-9.]/g, '')) || 0
    setSaving(true)
    if (editingId) {
      await updateWallet(editingId, {
        name: name.trim(),
        kind,
        target: targetVal > 0 ? targetVal : undefined,
        note: note.trim() || undefined,
      })
    } else {
      const initial = parseFloat(initialAmount.replace(/[^0-9.]/g, '')) || 0
      await addWallet({
        name: name.trim(),
        kind,
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

  async function handleMove(walletId: string) {
    const amount = parseFloat(moveAmount.replace(/[^0-9.]/g, '')) || 0
    if (amount <= 0) return
    await recordWalletMovement(walletId, { type: moveType, amount, date: todayISO() })
    setMoveFor(null)
    setMoveAmount('')
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

  function WalletRow({ wallet }: { wallet: Wallet }) {
    const balance = walletBalance(wallet)
    const progress = walletGoalProgress(wallet)
    const accent = accentFor(wallet.color)
    const isMoving = moveFor === wallet.id
    const isDeletePending = deleteConfirm === wallet.id
    const isHistoryOpen = historyFor === wallet.id
    const movements = [...wallet.movements].reverse() // newest first
    const KindIcon = getIconComponent(wallet.icon)

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="mb-2 rounded-2xl px-4 py-3"
        style={{ background: '#ffffff', boxShadow: '0 2px 12px rgba(0,53,46,0.05)', opacity: wallet.isArchived ? 0.65 : 1 }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ background: `${accent}1a` }}
          >
            <KindIcon size={17} weight="fill" color={accent} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold" style={{ color: '#191c1c' }}>{wallet.name}</span>
              {wallet.isArchived && (
                <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ background: '#e7edeb', color: '#6e9990' }}>
                  Archived
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px]" style={{ color: '#6e9990' }}>
              {progress != null
                ? `${formatCurrency(balance)} of ${formatCurrency(wallet.target!)} · ${Math.round(progress * 100)}%`
                : formatCurrency(balance)}
              {wallet.note ? ` · ${wallet.note}` : ''}
            </p>
            {wallet.movements.length > 0 && (
              <button
                onClick={() => { setHistoryFor(isHistoryOpen ? null : wallet.id); setMovementDeleteConfirm(null) }}
                aria-expanded={isHistoryOpen}
                aria-label={isHistoryOpen ? 'Hide activity' : 'Show activity'}
                className="mt-1 flex items-center gap-1 text-[11px] font-semibold transition-colors"
                style={{ color: accent }}
              >
                {wallet.movements.length} {wallet.movements.length === 1 ? 'movement' : 'movements'}
                <motion.span animate={{ rotate: isHistoryOpen ? 180 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className="inline-flex">
                  <CaretDown size={10} weight="bold" aria-hidden="true" />
                </motion.span>
              </button>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {!wallet.isArchived && (
              <motion.button
                aria-label="Move money"
                whileTap={{ scale: 0.88 }}
                onClick={() => { setMoveFor(isMoving ? null : wallet.id); setMoveType('deposit'); setMoveAmount('') }}
                className="flex h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold"
                style={{ background: '#e7edeb', color: accent }}
              >
                <Plus size={11} weight="bold" aria-hidden="true" />
                Move
              </motion.button>
            )}
            <motion.button
              aria-label="Edit wallet"
              whileTap={{ scale: 0.85 }}
              onClick={() => openEdit(wallet)}
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: '#e7edeb' }}
            >
              <PencilSimple size={13} weight="bold" color="#3f4946" aria-hidden="true" />
            </motion.button>
            <motion.button
              aria-label={wallet.isArchived ? 'Restore wallet' : 'Archive wallet'}
              whileTap={{ scale: 0.85 }}
              onClick={() => toggleWalletArchived(wallet.id)}
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: '#e7edeb' }}
            >
              {wallet.isArchived
                ? <ArrowCounterClockwise size={13} weight="bold" color="#1f6950" aria-hidden="true" />
                : <Archive size={13} weight="bold" color="#6e9990" aria-hidden="true" />}
            </motion.button>
            <motion.button
              aria-label={isDeletePending ? 'Confirm delete' : 'Delete wallet'}
              whileTap={{ scale: 0.85 }}
              onClick={() => handleDelete(wallet.id)}
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: isDeletePending ? '#ba1a1a' : '#e7edeb' }}
            >
              <Trash size={13} weight="bold" color={isDeletePending ? '#fff' : '#ba1a1a'} aria-hidden="true" />
            </motion.button>
          </div>
        </div>

        {progress != null && !wallet.isArchived && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: '#eef2f1' }}>
            <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, background: accent }} />
          </div>
        )}

        <AnimatePresence>
          {isMoving && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="overflow-hidden"
            >
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
              <p className="mt-1 text-[10px]" style={{ color: '#6e9990' }}>
                Logged as a transfer between your pockets — it won’t count as spending or income.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Movement history — each row tagged Manual vs Linked so it's clear
            whether the entry is a direct deposit/withdrawal or mirrors a real
            expense/income logged elsewhere. */}
        <AnimatePresence>
          {isHistoryOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl p-2" style={{ background: '#f8faf9', border: '1px solid #eef2f1' }}>
                {movements.map((m) => {
                  const isDeposit = m.type === 'deposit'
                  const isLinked = m.source === 'linked'
                  const pendingDelete = movementDeleteConfirm === m.id
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
            </motion.div>
          )}
        </AnimatePresence>
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
                onClick={() => setKind(k.id)}
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
              Opening balance <span style={{ color: '#cde0db' }}>(optional)</span>
            </label>
            <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: '#f0f4f2' }}>
              <span className="font-mono text-sm font-semibold" style={{ color: '#6e9990' }}>₱</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                placeholder="How much is already in it"
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
      {/* Summary */}
      <div className="mb-4 rounded-xl px-4 py-3" style={{ background: 'rgba(31,105,80,0.08)' }}>
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#1f6950' }}>Total stashed away</span>
        <p className="mt-0.5 font-mono text-[19px] font-bold" style={{ color: '#00352e' }}>{formatCurrency(totalStashed)}</p>
      </div>

      {wallets.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-center">
          <WalletIcon size={30} weight="duotone" style={{ color: '#cde0db' }} aria-hidden="true" />
          <p className="text-sm font-medium" style={{ color: '#6e9990' }}>No wallets yet.</p>
          <p className="text-xs" style={{ color: '#a9c2bd' }}>Create a savings, investment, or goal wallet to set money aside.</p>
        </div>
      ) : (
        <>
          <AnimatePresence initial={false}>
            {active.map((w) => <WalletRow key={w.id} wallet={w} />)}
          </AnimatePresence>
          {archived.length > 0 && (
            <>
              <p className="mb-2 mt-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>Archived</p>
              <AnimatePresence initial={false}>
                {archived.map((w) => <WalletRow key={w.id} wallet={w} />)}
              </AnimatePresence>
            </>
          )}
        </>
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={openAdd}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3"
        style={{ border: '1.5px dashed #cde0db', background: 'transparent', color: '#1f695d' }}
      >
        <Plus size={14} weight="bold" aria-hidden="true" />
        <span className="text-sm font-semibold">New Wallet</span>
      </motion.button>
    </div>
  )
}
