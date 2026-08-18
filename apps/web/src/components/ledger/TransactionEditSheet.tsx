'use client'

import { createElement, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CalendarBlank, Trash, ArrowsClockwise } from '@phosphor-icons/react'
import DatePickerSheet from '@/components/ui/DatePickerSheet'
import { getIconComponent } from '@/lib/iconMap'
import { formatDate } from '@/lib/formatters'
import { CATEGORIES, PAYMENT_METHODS } from '@/types'
import type { Transaction, Category, CustomCategory, PaymentMethodId, TransactionType } from '@/types'

// Stable icon renderer (createElement, not <Icon/>) so it isn't remounted per render.
function Glyph({ name, size = 14, weight = 'regular' }: { name: string; size?: number; weight?: 'bold' | 'fill' | 'regular' }) {
  return createElement(getIconComponent(name), { size, weight, 'aria-hidden': true })
}

interface Props {
  /** The transaction to edit, or null when the sheet is closed. */
  tx: Transaction | null
  customCategories?: CustomCategory[]
  /** Preset category ids the user has hidden — excluded from the picker. */
  hiddenCategories?: string[]
  onClose: () => void
  onSave: (id: string, patch: Partial<Transaction>) => void
  onDelete: (id: string) => void
}

/** Category id → the transaction type it implies. */
function typeForCategory(catId: string): TransactionType {
  if (catId === 'income') return 'income'
  if (catId === 'transfers') return 'transfer'
  return 'expense'
}

/**
 * Modal editor for an already-logged transaction: amount, merchant, category,
 * date, and payment method. Mirrors DatePickerSheet's portal + centered-card
 * pattern so it's never clipped by the ledger's scroll container.
 *
 * Debt-linked transactions (category "debts") are read-only here — editing them
 * would desync the Debt record, so the user is pointed to the Debts page.
 */
export default function TransactionEditSheet({ tx, customCategories = [], hiddenCategories = [], onClose, onSave, onDelete }: Props) {
  const open = tx !== null
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<Category>(CATEGORIES[0])
  const [date, setDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>('cash')
  const [isRecurring, setIsRecurring] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Seed local form state from the transaction whenever a different one opens.
  // Done during render (React's "adjust state while rendering" pattern) rather
  // than in an effect, so the fields are correct on first paint.
  const [seededId, setSeededId] = useState<string | null>(null)
  if (tx && seededId !== tx.id) {
    setSeededId(tx.id)
    setMerchant(tx.merchant === 'Unknown' ? '' : tx.merchant)
    setAmount(String(tx.amount))
    setCategory(tx.category)
    setDate(tx.date)
    setPaymentMethod(tx.paymentMethod)
    setIsRecurring(tx.isRecurring ?? false)
    setConfirmDelete(false)
  }
  if (!tx && seededId !== null) setSeededId(null)

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (typeof document === 'undefined' || !tx) return null

  const isDebt = tx.category.id === 'debts'
  const allCategories: Category[] = [
    ...CATEGORIES.filter(
      (c) =>
        c.id !== 'debts' && // debts are managed on the Debts page
        // Hidden presets are dropped, unless this entry already uses one.
        (!hiddenCategories.includes(c.id) || c.id === tx.category.id)
    ),
    ...customCategories.map((c) => ({
      id: c.id, label: c.name, icon: c.icon, color: c.textColor, bgColor: c.bgColor, keywords: [] as string[],
    })),
  ]

  const amountNum = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0
  const canSave = !isDebt && amountNum > 0

  function handleSave() {
    if (!tx || !canSave) return
    onSave(tx.id, {
      merchant: merchant.trim() || 'Unknown',
      amount: amountNum,
      category,
      date,
      paymentMethod,
      isRecurring,
      type: typeForCategory(category.id),
    })
    onClose()
  }

  function handleDelete() {
    if (!tx) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    onDelete(tx.id)
    onClose()
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60]"
            style={{ background: 'rgba(0,53,46,0.28)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Card */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Edit transaction"
            className="fixed left-1/2 top-1/2 z-[61] flex max-h-[88dvh] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl"
            style={{ background: '#f8faf9', boxShadow: '0 24px 80px rgba(0,53,46,0.22), 0 0 0 1px rgba(205,224,219,0.6)' }}
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between px-5 pt-4 pb-3" style={{ borderBottom: '1px solid #e7edeb' }}>
              <span className="text-[15px] font-bold" style={{ color: '#00352e' }}>Edit Entry</span>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: '#f0f4f2', color: '#3f4946' }}
              >
                <X size={14} weight="bold" aria-hidden="true" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {isDebt ? (
                <p className="rounded-xl px-4 py-3 text-[12px] leading-relaxed" style={{ background: '#f0f4f2', color: '#6e9990' }}>
                  This entry is linked to a tracked debt. Edit it from the{' '}
                  <span className="font-semibold" style={{ color: '#1f695d' }}>Debts&nbsp;&amp;&nbsp;Loans</span> page so its
                  balance and repayments stay in sync.
                </p>
              ) : (
                <>
                  {/* Amount */}
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>Amount</label>
                  <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: '#ffffff', border: '1px solid #e7edeb' }}>
                    <span className="font-mono text-sm font-semibold" style={{ color: '#6e9990' }}>₱</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="flex-1 bg-transparent font-mono text-sm font-semibold outline-none"
                      style={{ color: '#191c1c' }}
                    />
                  </div>

                  {/* Merchant / name */}
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>Name</label>
                  <input
                    type="text"
                    maxLength={60}
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder="Merchant or description"
                    className="mb-4 w-full rounded-xl px-4 py-3 text-sm font-semibold outline-none"
                    style={{ background: '#ffffff', color: '#191c1c', border: '1px solid #e7edeb' }}
                  />

                  {/* Date + payment method row */}
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>Date</label>
                      <button
                        type="button"
                        onClick={() => setDatePickerOpen(true)}
                        className="flex w-full items-center gap-1.5 rounded-xl px-3 py-3 text-left text-[13px] font-semibold"
                        style={{ background: '#ffffff', color: '#191c1c', border: '1px solid #e7edeb' }}
                      >
                        <CalendarBlank size={13} weight="regular" style={{ color: '#6e9990' }} aria-hidden="true" />
                        {formatDate(date)}
                      </button>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodId)}
                        className="w-full rounded-xl px-3 py-3 text-[13px] font-semibold outline-none"
                        style={{ background: '#ffffff', color: '#191c1c', border: '1px solid #e7edeb' }}
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m.id} value={m.id}>{m.short}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Category grid */}
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>Category</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {allCategories.map((cat) => {
                      const active = cat.id === category.id
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setCategory(cat)}
                          className={`flex flex-col items-center gap-1 rounded-xl py-2.5 text-[10px] font-medium transition-colors ${active ? `${cat.bgColor} ${cat.color}` : ''}`}
                          style={active ? undefined : { background: '#ffffff', color: '#6e9990', border: '1px solid #e7edeb' }}
                        >
                          <Glyph name={cat.icon} size={15} weight={active ? 'fill' : 'regular'} />
                          <span className="leading-none">{cat.label.split(/[\s&]/)[0]}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Recurring toggle — expenses only (feeds the Recurring Bills card) */}
                  {typeForCategory(category.id) === 'expense' && (
                    <button
                      type="button"
                      onClick={() => setIsRecurring((v) => !v)}
                      aria-pressed={isRecurring}
                      className="mt-4 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors"
                      style={{
                        background: isRecurring ? 'rgba(31,105,80,0.08)' : '#ffffff',
                        border: `1px solid ${isRecurring ? '#1f695d' : '#e7edeb'}`,
                      }}
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                        style={{ background: isRecurring ? '#1f695d' : '#f0f4f2' }}
                      >
                        <ArrowsClockwise size={15} weight="bold" color={isRecurring ? '#ffffff' : '#6e9990'} aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold" style={{ color: '#191c1c' }}>Recurring bill</p>
                        <p className="text-[11px]" style={{ color: '#6e9990' }}>Subscriptions, rent, and monthly dues</p>
                      </div>
                      {/* Switch */}
                      <div
                        className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
                        style={{ background: isRecurring ? '#1f695d' : '#cde0db' }}
                      >
                        <span
                          className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
                          style={{ left: isRecurring ? '18px' : '2px' }}
                        />
                      </div>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center gap-2 px-5 pt-3 pb-4" style={{ borderTop: '1px solid #e7edeb' }}>
              <button
                onClick={handleDelete}
                className="flex h-11 items-center gap-1.5 rounded-2xl px-4 text-[13px] font-bold transition-colors"
                style={confirmDelete
                  ? { background: '#ba1a1a', color: '#ffffff' }
                  : { background: '#f0f4f2', color: '#ba1a1a' }}
              >
                <Trash size={14} weight="bold" aria-hidden="true" />
                {confirmDelete ? 'Confirm' : 'Delete'}
              </button>
              {!isDebt && (
                <button
                  onClick={handleSave}
                  disabled={!canSave}
                  className="flex-1 rounded-2xl py-3 text-sm font-bold text-white disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)' }}
                >
                  Save Changes
                </button>
              )}
            </div>
          </motion.div>

          <DatePickerSheet
            open={datePickerOpen}
            value={date}
            onSelect={(d) => setDate(d)}
            onClose={() => setDatePickerOpen(false)}
          />
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
