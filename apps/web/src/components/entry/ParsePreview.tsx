'use client'

import { createElement, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CalendarBlank, CheckCircle, Circle, Wallet as WalletIcon } from '@phosphor-icons/react'
import CategoryBadge from './CategoryBadge'
import DatePickerSheet from '@/components/ui/DatePickerSheet'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { getIconComponent } from '@/lib/iconMap'
import { useStore } from '@/lib/store'
import { CATEGORIES, PAYMENT_METHODS, resolvePaymentMethod } from '@/types'
import type { Category, TransactionDraft, CustomCategory, PaymentMethodId, DebtDirection, Wallet } from '@/types'

// Renders a Phosphor icon by its string name. Declared at module scope and uses
// createElement (not <Icon/>) so it's a stable component, not one created during render.
function MethodIcon({ name, size = 12, weight = 'bold' }: { name: string; size?: number; weight?: 'bold' | 'fill' | 'regular' }) {
  return createElement(getIconComponent(name), { size, weight, 'aria-hidden': true })
}

// ─── Re-used inline category picker ──────────────────────────────────────────

function InlineCategoryPicker({
  currentId,
  customCategories,
  hiddenCategories = [],
  onSelect,
  onClose,
}: {
  currentId: string
  customCategories: CustomCategory[]
  hiddenCategories?: string[]
  onSelect: (cat: Category) => void
  onClose: () => void
}) {
  // Build full category list: presets (minus hidden, unless currently selected) + custom
  const allCategories: Category[] = [
    ...CATEGORIES.filter((c) => !hiddenCategories.includes(c.id) || c.id === currentId),
    ...customCategories.map((c) => ({
      id: c.id,
      label: c.name,
      icon: c.icon,
      color: c.textColor,
      bgColor: c.bgColor,
      keywords: [] as string[],
    })),
  ]
  return (
    <motion.div
      key="cat-picker"
      initial={{ opacity: 0, y: -4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="mb-3 rounded-2xl p-3"
      style={{ background: '#f0f4f2', border: '1px solid #e7edeb' }}
    >
      <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold" style={{ color: '#3f4946' }}>
          Correct category
        </span>
        <button
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center transition-colors"
          style={{ color: '#6e9990' }}
          aria-label="Close category picker"
        >
          <X size={11} weight="bold" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {allCategories.map((cat) => {
          const Icon = getIconComponent(cat.icon)
          const active = cat.id === currentId
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat)}
              className={`flex flex-col items-center gap-1 rounded-xl py-2.5 text-[10px] font-medium transition-colors ${
                active
                  ? `${cat.bgColor} ${cat.color}`
                  : 'text-ledge-muted hover:bg-ledge-surface2 hover:text-ledge-data'
              }`}
            >
              {Icon && (
                <Icon size={15} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
              )}
              <span className="leading-none">{cat.label.split(/[\s&]/)[0]}</span>
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}

interface Props {
  draft: TransactionDraft
  category: Category
  confidence: number
  customCategories?: CustomCategory[]
  onCategoryChange?: (cat: Category) => void
  onMerchantChange?: (name: string) => void
  onDateChange?: (date: string) => void
  onPaymentMethodChange?: (method: PaymentMethodId) => void
  /** Debt entries only: current lent-out vs borrowed direction. */
  debtDirection?: DebtDirection
  onDebtDirectionChange?: (direction: DebtDirection) => void
  /** Debt entries only: optional expected-repayment date (ISO YYYY-MM-DD). */
  debtDueDate?: string
  onDebtDueDateChange?: (date: string | undefined) => void
  /** Bulk mode: whether this entry is selected for logging */
  selected?: boolean
  onToggleSelect?: () => void
  /** Bulk mode: entry already logged */
  logged?: boolean
  /** Wallets the entry can be paid from / saved into. When provided (and the
   *  entry is an expense or income, not a debt/transfer), a wallet picker shows. */
  wallets?: Wallet[]
  /** Currently chosen wallet id, or undefined for none. */
  walletId?: string
  onWalletChange?: (walletId: string | undefined) => void
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 26 },
  },
}

export default function ParsePreview({ draft, category, confidence, customCategories = [], onCategoryChange, onMerchantChange, onDateChange, onPaymentMethodChange, debtDirection, onDebtDirectionChange, debtDueDate, onDebtDueDateChange, selected, onToggleSelect, logged = false, wallets = [], walletId, onWalletChange }: Props) {
  const hiddenCategories = useStore((s) => s.hiddenCategories)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [duePickerOpen, setDuePickerOpen] = useState(false)
  const [methodPickerOpen, setMethodPickerOpen] = useState(false)
  const [walletPickerOpen, setWalletPickerOpen] = useState(false)
  const [editingMerchant, setEditingMerchant] = useState(false)
  const [merchantInput, setMerchantInput] = useState('')
  const merchantInputRef = useRef<HTMLInputElement>(null)
  const isIncome = draft.type === 'income'
  const isTransfer = draft.type === 'transfer'
  const isDebt = category.id === 'debts'
  const isBulk = onToggleSelect !== undefined
  const method = resolvePaymentMethod(draft.paymentMethod)
  // A wallet link is offered only for plain spending/income (not debts or
  // transfers, which already move money between pockets). Expenses are paid FROM
  // a wallet (a withdrawal); income is saved INTO one (a deposit).
  const canLinkWallet = onWalletChange && wallets.length > 0 && !isDebt && !isTransfer
  const selectedWallet = wallets.find((w) => w.id === walletId)

  function startEditMerchant() {
    if (!onMerchantChange) return
    setMerchantInput(draft.merchant && draft.merchant !== 'Unknown' ? draft.merchant : '')
    setEditingMerchant(true)
    setTimeout(() => merchantInputRef.current?.select(), 40)
  }

  function commitMerchant() {
    const trimmed = merchantInput.trim()
    if (trimmed) onMerchantChange?.(trimmed)
    setEditingMerchant(false)
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, y: 6, transition: { duration: 0.15 } }}
      className="mt-3 rounded-2xl p-4"
      style={{
        background: logged
          ? 'rgba(31,105,93,0.05)'
          : isIncome
            ? 'rgba(31,105,93,0.06)'
            : '#ffffff',
        boxShadow: logged ? 'none' : '0 1px 12px rgba(0,53,46,0.08)',
        border: logged
          ? '1px solid rgba(31,105,93,0.18)'
          : pickerOpen
            ? '1px solid #1f695d'
            : isIncome
              ? '1px solid rgba(31,105,93,0.2)'
              : '1px solid #e7edeb',
        opacity: logged ? 0.55 : 1,
      }}
    >
      {/* Row 1: Amount + category pill + bulk checkbox */}
      <motion.div variants={itemVariants} className="flex items-center gap-2">
        {/* Amount — shrinks font for large numbers */}
        {(() => {
          const formatted = draft.amount !== null ? formatCurrency(draft.amount) : null
          const sizeClass = !formatted
            ? 'text-2xl'
            : formatted.length > 16
              ? 'text-base'
              : formatted.length > 13
                ? 'text-lg'
                : 'text-2xl'
          return (
            <span
              className={`font-mono ${sizeClass} font-bold tracking-tight leading-tight shrink-0 max-w-[48%] truncate`}
              style={{ color: draft.amount === null ? '#6e9990' : isIncome ? '#1f6950' : '#191c1c' }}
            >
              {formatted ?? <span className="text-base">no amount</span>}
            </span>
          )
        })()}

        {/* Category pill */}
        <div className="flex-1 min-w-0">
          {onCategoryChange && !logged ? (
            <button
              onClick={() => { setPickerOpen((o) => !o) }}
              aria-label={`Category: ${category.label}. Tap to change`}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-all ${category.bgColor} ${category.color} ${pickerOpen ? 'ring-1 ring-[#1f695d]/40' : ''}`}
            >
              {category.label}
              <span className="opacity-50">▾</span>
            </button>
          ) : (
            <CategoryBadge category={category} size="sm" />
          )}
        </div>

        {/* Bulk: checkbox only */}
        {isBulk && !logged && (
          <motion.button
            onClick={onToggleSelect}
            aria-label={selected ? 'Deselect entry' : 'Select entry'}
            whileTap={{ scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="flex h-6 w-6 shrink-0 items-center justify-center"
          >
            {selected
              ? <CheckCircle size={20} weight="fill" color="#1f695d" aria-hidden="true" />
              : <Circle size={20} weight="regular" color="#cde0db" aria-hidden="true" />}
          </motion.button>
        )}
        {isBulk && logged && (
          <CheckCircle size={18} weight="fill" color="#1f6950" aria-label="Logged" className="shrink-0" />
        )}
      </motion.div>

      {/* Row 2: Merchant name (left) + Date (right) */}
      <motion.div variants={itemVariants} className="mt-2 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          {editingMerchant ? (
            <input
              ref={merchantInputRef}
              value={merchantInput}
              onChange={(e) => setMerchantInput(e.target.value)}
              onBlur={commitMerchant}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitMerchant()
                if (e.key === 'Escape') setEditingMerchant(false)
              }}
              autoFocus
              className="w-full border-b bg-transparent py-0.5 text-[13px] font-semibold outline-none"
              style={{ borderColor: '#1f695d', color: '#191c1c', caretColor: '#1f695d' }}
              placeholder="Enter merchant name"
              aria-label="Edit merchant name"
            />
          ) : (
            <button
              onClick={startEditMerchant}
              disabled={!onMerchantChange || logged}
              aria-label={onMerchantChange ? 'Tap to edit merchant name' : undefined}
              className={`min-w-0 max-w-full text-left ${onMerchantChange && !logged ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span className="block truncate text-[13px] font-semibold" style={{ color: '#191c1c' }}>
                {draft.merchant && draft.merchant !== 'Unknown'
                  ? draft.merchant
                  : <span style={{ color: '#6e9990' }}>Unknown — tap to set</span>}
              </span>
            </button>
          )}
        </div>
        <button
          onClick={() => { if (!logged && onDateChange) setDatePickerOpen(true) }}
          disabled={logged || !onDateChange}
          aria-label="Change date"
          className="flex shrink-0 items-center gap-1 text-[11px] font-medium transition-colors"
          style={{ color: '#6e9990' }}
        >
          <CalendarBlank size={11} weight="regular" aria-hidden="true" />
          {formatDate(draft.date)}
        </button>
        {onDateChange && (
          <DatePickerSheet
            open={datePickerOpen}
            value={draft.date}
            onSelect={(date) => onDateChange(date)}
            onClose={() => setDatePickerOpen(false)}
          />
        )}
      </motion.div>

      {/* Row 3: Payment method chip */}
      <motion.div variants={itemVariants} className="mt-2 flex items-center gap-2">
        {onPaymentMethodChange && !logged ? (
          <button
            onClick={() => setMethodPickerOpen((o) => !o)}
            aria-label={`Payment method: ${method.label}. Tap to change`}
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold transition-all ${methodPickerOpen ? 'ring-1 ring-[#1f695d]/40' : ''}`}
            style={{ background: '#f0f4f2', color: '#3f4946' }}
          >
            <MethodIcon name={method.icon} />
            {method.label}
            <span className="opacity-50">▾</span>
          </button>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold"
            style={{ background: '#f0f4f2', color: '#6e9990' }}
          >
            <MethodIcon name={method.icon} />
            {method.label}
          </span>
        )}
      </motion.div>

      {/* Inline payment-method picker */}
      <AnimatePresence>
        {methodPickerOpen && onPaymentMethodChange && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="mt-2 grid grid-cols-3 gap-1.5 rounded-2xl p-2"
            style={{ background: '#f0f4f2', border: '1px solid #e7edeb' }}
          >
            {PAYMENT_METHODS.map((m) => {
              const Icon = getIconComponent(m.icon)
              const active = m.id === draft.paymentMethod
              return (
                <button
                  key={m.id}
                  onClick={() => { onPaymentMethodChange(m.id); setMethodPickerOpen(false) }}
                  className="flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-semibold transition-colors"
                  style={
                    active
                      ? { background: '#1f695d', color: '#ffffff' }
                      : { background: '#ffffff', color: '#3f4946' }
                  }
                >
                  <Icon size={13} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
                  {m.short}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wallet link — pay this expense FROM a wallet, or save income INTO one.
          Records a matching wallet movement so the wallet balance stays in sync. */}
      {canLinkWallet && !logged && (
        <motion.div variants={itemVariants} className="mt-2">
          <button
            onClick={() => setWalletPickerOpen((o) => !o)}
            aria-label={selectedWallet ? `Wallet: ${selectedWallet.name}. Tap to change` : 'Link a wallet'}
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold transition-all ${walletPickerOpen ? 'ring-1 ring-[#1f695d]/40' : ''}`}
            style={{ background: '#f0f4f2', color: selectedWallet ? '#1f695d' : '#6e9990' }}
          >
            {selectedWallet
              ? createElement(getIconComponent(selectedWallet.icon), { size: 12, weight: 'fill', 'aria-hidden': true })
              : <WalletIcon size={12} weight="regular" aria-hidden="true" />}
            {selectedWallet
              ? `${isIncome ? 'Into' : 'From'} ${selectedWallet.name}`
              : isIncome ? 'Save into a wallet' : 'Pay from a wallet'}
            <span className="opacity-50">▾</span>
          </button>

          <AnimatePresence>
            {walletPickerOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="mt-2 grid grid-cols-2 gap-1.5 rounded-2xl p-2"
                style={{ background: '#f0f4f2', border: '1px solid #e7edeb' }}
              >
                {/* None option */}
                <button
                  onClick={() => { onWalletChange?.(undefined); setWalletPickerOpen(false) }}
                  className="flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-semibold transition-colors"
                  style={walletId === undefined
                    ? { background: '#1f695d', color: '#ffffff' }
                    : { background: '#ffffff', color: '#3f4946' }}
                >
                  None
                </button>
                {wallets.map((w) => {
                  const Icon = getIconComponent(w.icon)
                  const active = w.id === walletId
                  return (
                    <button
                      key={w.id}
                      onClick={() => { onWalletChange?.(w.id); setWalletPickerOpen(false) }}
                      className="flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-semibold transition-colors"
                      style={active
                        ? { background: '#1f695d', color: '#ffffff' }
                        : { background: '#ffffff', color: '#3f4946' }}
                    >
                      <Icon size={13} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
                      <span className="truncate">{w.name}</span>
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
          {selectedWallet && (
            <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: '#6e9990' }}>
              {isIncome
                ? `Adds to ${selectedWallet.name}'s balance.`
                : `Comes out of ${selectedWallet.name}'s balance.`}
            </p>
          )}
        </motion.div>
      )}

      {/* Debt direction toggle — lets the user confirm/correct the inferred
          lent-out vs borrowed direction before logging. Person = merchant. */}
      {isDebt && onDebtDirectionChange && !logged && (
        <motion.div variants={itemVariants} className="mt-3">
          <div className="flex rounded-xl p-1" style={{ background: '#f0f4f2' }}>
            {([
              { id: 'owed_to_me' as const, label: 'They owe me' },
              { id: 'i_owe' as const, label: 'I owe them' },
            ]).map((opt) => {
              const active = (debtDirection ?? 'owed_to_me') === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => onDebtDirectionChange(opt.id)}
                  className="flex-1 rounded-lg py-1.5 text-[11px] font-bold transition-colors"
                  style={{
                    background: active ? '#ffffff' : 'transparent',
                    color: active ? '#00352e' : '#6e9990',
                    boxShadow: active ? '0 1px 4px rgba(0,53,46,0.10)' : 'none',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: '#6e9990' }}>
            {(debtDirection ?? 'owed_to_me') === 'owed_to_me'
              ? 'Tracked in Debts as money out now; repayments come back as income.'
              : 'Tracked in Debts as money in now; your repayments go out as expense.'}
          </p>

          {/* Optional expected-repayment date — drives the due-soon reminder. */}
          {onDebtDueDateChange && (
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDuePickerOpen(true)}
                className="flex flex-1 items-center gap-1.5 rounded-lg px-3 py-2 text-left text-[11px] font-semibold transition-colors"
                style={{ background: '#f0f4f2', color: debtDueDate ? '#3f4946' : '#6e9990' }}
              >
                <CalendarBlank size={12} weight="regular" style={{ color: '#6e9990' }} aria-hidden="true" />
                {debtDueDate ? `Due ${formatDate(debtDueDate)}` : 'Set a due date'}
              </button>
              {debtDueDate && (
                <button
                  type="button"
                  onClick={() => onDebtDueDateChange(undefined)}
                  aria-label="Clear due date"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{ background: '#f0f4f2', color: '#6e9990' }}
                >
                  <X size={11} weight="bold" aria-hidden="true" />
                </button>
              )}
              <DatePickerSheet
                open={duePickerOpen}
                value={debtDueDate ?? draft.date}
                max="2099-12-31"
                onSelect={(d) => onDebtDueDateChange(d)}
                onClose={() => setDuePickerOpen(false)}
              />
            </div>
          )}
        </motion.div>
      )}

      {/* Transfer hint — clarifies it won't count toward spending */}
      {isTransfer && !logged && (
        <p className="mt-2 text-[11px] font-medium" style={{ color: '#6e9990' }}>
          Transfer — not counted as spending.
        </p>
      )}

      {/* Inline category picker */}
      <AnimatePresence>
        {pickerOpen && onCategoryChange && (
          <div className="mt-2">
            <InlineCategoryPicker
              currentId={category.id}
              customCategories={customCategories}
              hiddenCategories={hiddenCategories}
              onSelect={(cat) => { onCategoryChange(cat); setPickerOpen(false) }}
              onClose={() => setPickerOpen(false)}
            />
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
