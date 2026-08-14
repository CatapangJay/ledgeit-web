'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ArrowLeft, Check, Trash, HandCoins, ArrowUp, ArrowDown, CalendarBlank, Warning, PencilSimple } from '@phosphor-icons/react'
import { useStore } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/formatters'
import DatePickerSheet from '@/components/ui/DatePickerSheet'
import { debtOutstanding, debtDueStatus } from '@/types'
import type { Debt, DebtDirection } from '@/types'

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Short human label for a debt's due status, e.g. "Due today", "3d overdue". */
function dueLabel(days: number, state: 'overdue' | 'due_soon' | 'upcoming'): string {
  if (state === 'overdue') return days === -1 ? '1d overdue' : `${Math.abs(days)}d overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `Due in ${days}d`
}

/**
 * The full debt ledger UI (summary, lists, add form, repayments) with no modal
 * or page chrome. Rendered directly by the /debts page and reusable elsewhere.
 */
export default function DebtLedger() {
  const debts = useStore((s) => s.debts)
  const addDebt = useStore((s) => s.addDebt)
  const updateDebt = useStore((s) => s.updateDebt)
  const recordDebtRepayment = useStore((s) => s.recordDebtRepayment)
  const toggleDebtSettled = useStore((s) => s.toggleDebtSettled)
  const removeDebt = useStore((s) => s.removeDebt)

  const [view, setView] = useState<'list' | 'add'>('list')
  // Set while editing an existing debt; null when the form is creating a new one.
  const [editingId, setEditingId] = useState<string | null>(null)

  // Add/edit-debt form state
  const [personName, setPersonName] = useState('')
  const [direction, setDirection] = useState<DebtDirection>('owed_to_me')
  const [principal, setPrincipal] = useState('')
  const [note, setNote] = useState('')
  const [dueDate, setDueDate] = useState<string | undefined>(undefined)
  const [duePickerOpen, setDuePickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Per-debt repayment input + delete confirm
  const [repayFor, setRepayFor] = useState<string | null>(null)
  const [repayAmount, setRepayAmount] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { owedToMe, iOwe, totalOwedToMe, totalIOwe } = useMemo(() => {
    const owedToMe = debts.filter((d) => d.direction === 'owed_to_me')
    const iOwe = debts.filter((d) => d.direction === 'i_owe')
    const sumOpen = (list: Debt[]) =>
      list.filter((d) => !d.isSettled).reduce((s, d) => s + debtOutstanding(d), 0)
    return { owedToMe, iOwe, totalOwedToMe: sumOpen(owedToMe), totalIOwe: sumOpen(iOwe) }
  }, [debts])

  function openAdd() {
    setEditingId(null)
    setPersonName('')
    setDirection('owed_to_me')
    setPrincipal('')
    setNote('')
    setDueDate(undefined)
    setView('add')
  }

  function openEdit(debt: Debt) {
    setEditingId(debt.id)
    setPersonName(debt.personName)
    setDirection(debt.direction)
    setPrincipal(String(debt.principal))
    setNote(debt.note ?? '')
    setDueDate(debt.dueDate)
    setView('add')
  }

  async function handleSave() {
    const amount = parseFloat(principal.replace(/[^0-9.]/g, '')) || 0
    if (!personName.trim() || amount <= 0) return
    setSaving(true)
    if (editingId) {
      await updateDebt(editingId, { personName: personName.trim(), direction, principal: amount, note: note.trim() || undefined, dueDate })
    } else {
      await addDebt({ personName: personName.trim(), direction, principal: amount, note: note.trim() || undefined, dueDate, date: todayISO() })
    }
    setSaving(false)
    setEditingId(null)
    setView('list')
  }

  async function handleRepay(debtId: string) {
    const amount = parseFloat(repayAmount.replace(/[^0-9.]/g, '')) || 0
    if (amount <= 0) return
    await recordDebtRepayment(debtId, { amount, date: todayISO() })
    setRepayFor(null)
    setRepayAmount('')
  }

  async function handleDelete(debtId: string) {
    if (deleteConfirm !== debtId) {
      setDeleteConfirm(debtId)
      return
    }
    await removeDebt(debtId)
    setDeleteConfirm(null)
  }

  function DebtRow({ debt }: { debt: Debt }) {
    const outstanding = debtOutstanding(debt)
    const repaid = debt.principal - outstanding
    const pct = debt.principal > 0 ? (repaid / debt.principal) * 100 : 0
    const isRepaying = repayFor === debt.id
    const isDeletePending = deleteConfirm === debt.id
    const accent = debt.direction === 'owed_to_me' ? '#1f6950' : '#b45309'
    const due = debtDueStatus(debt, todayISO())

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="mb-2 rounded-2xl px-4 py-3"
        style={{ background: '#ffffff', boxShadow: '0 2px 12px rgba(0,53,46,0.05)', opacity: debt.isSettled ? 0.7 : 1 }}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold" style={{ color: '#191c1c' }}>{debt.personName}</span>
              {debt.isSettled && (
                <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ background: '#e7edeb', color: '#6e9990' }}>
                  Settled
                </span>
              )}
              {(due.state === 'overdue' || due.state === 'due_soon') && (
                <span
                  className="flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                  style={
                    due.state === 'overdue'
                      ? { background: 'rgba(186,26,26,0.1)', color: '#ba1a1a' }
                      : { background: 'rgba(180,83,9,0.1)', color: '#b45309' }
                  }
                >
                  <Warning size={9} weight="fill" aria-hidden="true" />
                  {dueLabel(due.days, due.state)}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px]" style={{ color: '#6e9990' }}>
              {debt.isSettled
                ? `${formatCurrency(debt.principal)} · fully paid`
                : `${formatCurrency(outstanding)} of ${formatCurrency(debt.principal)} left`}
              {!debt.isSettled && due.state === 'upcoming' ? ` · due ${formatDate(debt.dueDate!)}` : ''}
              {debt.note ? ` · ${debt.note}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {!debt.isSettled && (
              <motion.button
                aria-label="Record repayment"
                whileTap={{ scale: 0.88 }}
                onClick={() => { setRepayFor(isRepaying ? null : debt.id); setRepayAmount('') }}
                className="flex h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold"
                style={{ background: '#e7edeb', color: accent }}
              >
                <Plus size={11} weight="bold" aria-hidden="true" />
                Repay
              </motion.button>
            )}
            <motion.button
              aria-label="Edit debt"
              whileTap={{ scale: 0.85 }}
              onClick={() => openEdit(debt)}
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: '#e7edeb' }}
            >
              <PencilSimple size={13} weight="bold" color="#3f4946" aria-hidden="true" />
            </motion.button>
            <motion.button
              aria-label={debt.isSettled ? 'Reopen debt' : 'Mark settled'}
              whileTap={{ scale: 0.85 }}
              onClick={() => toggleDebtSettled(debt.id)}
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: debt.isSettled ? '#e7edeb' : accent }}
            >
              <Check size={13} weight="bold" color={debt.isSettled ? '#6e9990' : '#fff'} aria-hidden="true" />
            </motion.button>
            <motion.button
              aria-label={isDeletePending ? 'Confirm delete' : 'Delete debt'}
              whileTap={{ scale: 0.85 }}
              onClick={() => handleDelete(debt.id)}
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: isDeletePending ? '#ba1a1a' : '#e7edeb' }}
            >
              <Trash size={13} weight="bold" color={isDeletePending ? '#fff' : '#ba1a1a'} aria-hidden="true" />
            </motion.button>
          </div>
        </div>

        {!debt.isSettled && debt.principal > 0 && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: '#eef2f1' }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: accent }} />
          </div>
        )}

        <AnimatePresence>
          {isRepaying && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="flex items-center gap-2 overflow-hidden"
            >
              <div className="flex flex-1 items-center gap-1 rounded-lg px-3 py-2" style={{ background: '#f8faf9', border: '1px solid #cde0db' }}>
                <span className="font-mono text-sm font-semibold" style={{ color: '#6e9990' }}>₱</span>
                <input
                  type="number"
                  inputMode="numeric"
                  autoFocus
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRepay(debt.id)}
                  placeholder={`Up to ${formatCurrency(outstanding)}`}
                  className="w-full bg-transparent font-mono text-sm font-semibold outline-none"
                  style={{ color: '#191c1c' }}
                />
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleRepay(debt.id)}
                className="rounded-lg px-4 py-2 text-[12px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)' }}
              >
                Record
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  // ── Add form ─────────────────────────────────────────────────────────────────
  if (view === 'add') {
    const amountValid = (parseFloat(principal.replace(/[^0-9.]/g, '')) || 0) > 0
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
          <h2 className="text-base font-bold" style={{ color: '#00352e' }}>{editingId ? 'Edit Debt' : 'Track a Debt'}</h2>
        </div>

        <div className="mb-4 flex rounded-xl p-1" style={{ background: '#f0f4f2' }}>
          {([
            { id: 'owed_to_me' as const, label: 'I lent out' },
            { id: 'i_owe' as const, label: 'I borrowed' },
          ]).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setDirection(opt.id)}
              className="flex-1 rounded-lg py-2 text-xs font-bold transition-colors"
              style={{
                background: direction === opt.id ? '#ffffff' : 'transparent',
                color: direction === opt.id ? '#00352e' : '#6e9990',
                boxShadow: direction === opt.id ? '0 1px 4px rgba(0,53,46,0.10)' : 'none',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
          {direction === 'owed_to_me' ? 'Who owes you?' : 'Who did you borrow from?'}
        </label>
        <input
          type="text"
          maxLength={40}
          value={personName}
          onChange={(e) => setPersonName(e.target.value)}
          placeholder="E.g. Juan"
          autoFocus
          className="mb-4 w-full rounded-xl px-4 py-3 text-sm font-semibold outline-none"
          style={{ background: '#f0f4f2', color: '#191c1c', border: '1.5px solid transparent' }}
          onFocus={(e) => (e.currentTarget.style.border = '1.5px solid #1f695d')}
          onBlur={(e) => (e.currentTarget.style.border = '1.5px solid transparent')}
        />

        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>Amount</label>
        <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: '#f0f4f2' }}>
          <span className="font-mono text-sm font-semibold" style={{ color: '#6e9990' }}>₱</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            placeholder="0"
            className="flex-1 bg-transparent font-mono text-sm font-semibold outline-none"
            style={{ color: '#191c1c' }}
          />
        </div>

        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
          Note <span style={{ color: '#cde0db' }}>(optional)</span>
        </label>
        <input
          type="text"
          maxLength={60}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="E.g. lunch, emergency…"
          className="w-full rounded-xl px-4 py-3 text-sm font-semibold outline-none"
          style={{ background: '#f0f4f2', color: '#191c1c', border: '1.5px solid transparent' }}
          onFocus={(e) => (e.currentTarget.style.border = '1.5px solid #1f695d')}
          onBlur={(e) => (e.currentTarget.style.border = '1.5px solid transparent')}
        />

        <label className="mb-1.5 mt-4 block text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
          Expected repayment <span style={{ color: '#cde0db' }}>(optional)</span>
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDuePickerOpen(true)}
            className="flex flex-1 items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-semibold"
            style={{ background: '#f0f4f2', color: dueDate ? '#191c1c' : '#6e9990' }}
          >
            <CalendarBlank size={15} weight="regular" style={{ color: '#6e9990' }} aria-hidden="true" />
            {dueDate ? formatDate(dueDate) : 'Set a due date'}
          </button>
          {dueDate && (
            <button
              type="button"
              onClick={() => setDueDate(undefined)}
              aria-label="Clear due date"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ background: '#f0f4f2', color: '#6e9990' }}
            >
              <Trash size={13} weight="bold" aria-hidden="true" />
            </button>
          )}
        </div>
        <DatePickerSheet
          open={duePickerOpen}
          value={dueDate ?? todayISO()}
          max="2099-12-31"
          onSelect={(d) => setDueDate(d)}
          onClose={() => setDuePickerOpen(false)}
        />

        <p className="mt-4 text-[11px] leading-relaxed" style={{ color: '#6e9990' }}>
          {direction === 'owed_to_me'
            ? 'Logged as money out now; repayments come back as income.'
            : 'Logged as money in now; your repayments go out as expense.'}
          {' '}Set a due date to get a reminder as it approaches.
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
            disabled={!personName.trim() || !amountValid || saving}
            className="flex-1 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)' }}
          >
            {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Save Debt'}
          </motion.button>
        </div>
      </div>
    )
  }

  // ── List ─────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Summary */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(31,105,80,0.08)' }}>
          <div className="flex items-center gap-1">
            <ArrowDown size={11} weight="bold" style={{ color: '#1f6950' }} aria-hidden="true" />
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#1f6950' }}>Owed to me</span>
          </div>
          <p className="mt-0.5 font-mono text-[15px] font-bold" style={{ color: '#00352e' }}>{formatCurrency(totalOwedToMe)}</p>
        </div>
        <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(180,83,9,0.08)' }}>
          <div className="flex items-center gap-1">
            <ArrowUp size={11} weight="bold" style={{ color: '#b45309' }} aria-hidden="true" />
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#b45309' }}>I owe</span>
          </div>
          <p className="mt-0.5 font-mono text-[15px] font-bold" style={{ color: '#00352e' }}>{formatCurrency(totalIOwe)}</p>
        </div>
      </div>

      {debts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-center">
          <HandCoins size={30} weight="duotone" style={{ color: '#cde0db' }} aria-hidden="true" />
          <p className="text-sm font-medium" style={{ color: '#6e9990' }}>No debts tracked yet.</p>
          <p className="text-xs" style={{ color: '#a9c2bd' }}>Track money you lent out or borrowed.</p>
        </div>
      ) : (
        <>
          {owedToMe.length > 0 && (
            <>
              <p className="mb-2 mt-1 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>Owed to me</p>
              <AnimatePresence initial={false}>
                {owedToMe.map((d) => <DebtRow key={d.id} debt={d} />)}
              </AnimatePresence>
            </>
          )}
          {iOwe.length > 0 && (
            <>
              <p className="mb-2 mt-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>I owe</p>
              <AnimatePresence initial={false}>
                {iOwe.map((d) => <DebtRow key={d.id} debt={d} />)}
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
        <span className="text-sm font-semibold">Track a Debt</span>
      </motion.button>
    </div>
  )
}
