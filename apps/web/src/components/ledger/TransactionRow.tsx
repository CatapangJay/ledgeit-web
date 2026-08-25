'use client'

import { useState } from 'react'
import { useMotionValue, motion, animate } from 'framer-motion'
import { Trash, CalendarBlank, Check } from '@phosphor-icons/react'
import { PHOSPHOR_ICON_MAP, CUSTOM_COLOR_OPTIONS } from '@/lib/iconMap'
import { formatCurrency, formatDate } from '@/lib/formatters'
import DatePickerSheet from '@/components/ui/DatePickerSheet'
import { resolvePaymentMethod } from '@/types'
import { useLinkedWallet } from '@/lib/walletLinks'
import type { Transaction } from '@/types'

// Preset icon background colors (saturated shade of each category color)
const PRESET_ICON_BG: Record<string, string> = {
  restaurants:   '#c2410c',
  groceries:     '#4d7c0f',
  transport:     '#0369a1',
  shopping:      '#7c3aed',
  utilities:     '#b45309',
  entertainment: '#be185d',
  health:        '#be123c',
  income:        '#1f6950',
  other:         '#64748b',
}

function getCategoryIconBg(cat: Transaction['category']): string {
  const preset = PRESET_ICON_BG[cat.id]
  if (preset) return preset
  // Custom category — derive swatch from its textColor Tailwind class
  const opt = CUSTOM_COLOR_OPTIONS.find((c) => c.textColor === cat.color)
  return opt?.swatch ?? '#64748b'
}

interface Props {
  tx: Transaction
  onDelete: (id: string) => void
  /** When provided, the date becomes tappable and opens a native date picker. */
  onDateChange?: (id: string, date: string) => void
  /** When provided, tapping the row (not the date) opens the edit sheet. */
  onEdit?: (tx: Transaction) => void
  /** Selection mode: when true, the row shows a checkbox and taps toggle it. */
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}

export default function TransactionRow({ tx, onDelete, onDateChange, onEdit, selectMode = false, selected = false, onToggleSelect }: Props) {
  const x = useMotionValue(0)
  const [pickerOpen, setPickerOpen] = useState(false)
  // Tracks whether the last pointer interaction was a drag (vs. a tap) so a
  // swipe-to-delete gesture doesn't also trigger the edit sheet.
  const [didDrag, setDidDrag] = useState(false)
  const Icon = PHOSPHOR_ICON_MAP[tx.category.icon]
  // In select mode a row is selectable only if a toggle handler was provided
  // (debt-linked rows pass none — they can't be bulk-reassigned).
  const selectable = selectMode && !!onToggleSelect
  const isIncome = tx.type === 'income'
  const isTransfer = tx.type === 'transfer'
  // Transfers move money between the user's own pockets — shown neutrally with no
  // +/− since they're neither spending nor income.
  const amountColor = isTransfer ? '#6e9990' : isIncome ? '#1f6950' : '#ba1a1a'
  const amountSign = isTransfer ? '' : isIncome ? '+' : '−'
  const method = resolvePaymentMethod(tx.paymentMethod)
  const MethodIcon = PHOSPHOR_ICON_MAP[method.icon]
  // If this transaction is linked to a wallet (paid from / saved into one via
  // Smart Entry), surface a small wallet chip so the connection is visible from
  // the ledger, not just the Wallets page. Backed by a map memoized on the
  // wallets reference, so all rows share one scan per wallet change.
  const linkedWallet = useLinkedWallet(tx.id)
  const WalletChipIcon = linkedWallet ? PHOSPHOR_ICON_MAP[linkedWallet.icon] : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: selectMode && !selectable ? 0.45 : 1, y: 0 }}
      exit={{ opacity: 0, x: -32, transition: { duration: 0.16 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="relative overflow-hidden"
    >
      {/* Swipe-to-delete backdrop (hidden in select mode) */}
      {!selectMode && (
        <div className="absolute inset-0 flex items-center justify-end pr-5" style={{ background: 'rgba(186,26,26,0.06)' }}>
          <Trash size={16} weight="fill" style={{ color: '#ba1a1a' }} aria-hidden="true" />
        </div>
      )}

      {/* Row — draggable when not selecting; a tap-to-toggle target when selecting */}
      <motion.div
        style={{ x: selectMode ? 0 : x, background: selected ? '#eef5f2' : '#ffffff' }}
        drag={selectMode ? false : 'x'}
        dragConstraints={{ right: 0, left: -80 }}
        dragElastic={{ right: 0, left: 0.2 }}
        onDragStart={() => setDidDrag(true)}
        onDragEnd={(_, info) => {
          if (info.offset.x < -52) {
            onDelete(tx.id)
          } else {
            animate(x, 0, { type: 'spring', stiffness: 300, damping: 26 })
          }
          // Clear the drag flag after the click event would have fired.
          setTimeout(() => setDidDrag(false), 0)
        }}
        onClick={() => {
          if (selectMode) { if (selectable) onToggleSelect!(tx.id); return }
          if (!didDrag) onEdit?.(tx)
        }}
        className={`relative flex items-center gap-3 px-4 py-3.5 ${selectMode ? (selectable ? 'cursor-pointer' : 'cursor-default') : onEdit ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
      >
        {/* Selection checkbox (hidden for non-selectable rows, e.g. debts) */}
        {selectMode && (
          selectable ? (
            <div
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors"
              style={{
                background: selected ? '#1f695d' : '#ffffff',
                border: `1.5px solid ${selected ? '#1f695d' : '#cde0db'}`,
              }}
              aria-hidden="true"
            >
              {selected && <Check size={12} weight="bold" color="#ffffff" />}
            </div>
          ) : (
            // Placeholder keeps alignment; debt rows are dimmed and not selectable.
            <div className="h-5 w-5 shrink-0" aria-hidden="true" />
          )
        )}

        {/* Icon — rounded-xl */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: getCategoryIconBg(tx.category) }}
        >
          {Icon && (
            <Icon size={16} weight="fill" color="#ffffff" aria-hidden="true" />
          )}
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-semibold" style={{ color: '#191c1c' }}>{tx.merchant}</span>
            <span
              className="shrink-0 font-mono text-sm font-medium"
              style={{ color: amountColor }}
            >
              {amountSign}
              {formatCurrency(tx.amount)}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="text-xs" style={{ color: getCategoryIconBg(tx.category), opacity: 0.9 }}>{tx.category.label}</span>
            <span className="text-xs" style={{ color: '#cde0db' }}>·</span>
            {onDateChange && !selectMode ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setPickerOpen(true) }}
                onPointerDownCapture={(e) => e.stopPropagation()}
                aria-label={`Change date — currently ${formatDate(tx.date)}`}
                className="flex items-center gap-1 rounded-md px-1 py-0.5 font-mono text-xs transition-colors hover:bg-ledge-surface"
                style={{ color: '#6e9990' }}
              >
                <CalendarBlank size={11} weight="regular" aria-hidden="true" />
                {formatDate(tx.date)}
              </button>
            ) : (
              <span className="font-mono text-xs" style={{ color: '#6e9990' }}>{formatDate(tx.date)}</span>
            )}
            {/* Payment method tag — cash is the quiet default, so only show a
                distinct label for non-cash methods to keep the line clean. */}
            {tx.paymentMethod !== 'cash' && (
              <>
                <span className="text-xs" style={{ color: '#cde0db' }}>·</span>
                <span className="flex items-center gap-1 text-xs" style={{ color: '#6e9990' }}>
                  {MethodIcon && <MethodIcon size={11} weight="regular" aria-hidden="true" />}
                  {method.short}
                </span>
              </>
            )}
            {/* Wallet link chip — shows which wallet this entry drew from / added to. */}
            {linkedWallet && (
              <span
                className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ background: 'rgba(31,105,93,0.1)', color: '#1f695d' }}
              >
                {WalletChipIcon && <WalletChipIcon size={10} weight="fill" aria-hidden="true" />}
                {linkedWallet.name}
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {onDateChange && (
        <DatePickerSheet
          open={pickerOpen}
          value={tx.date}
          onSelect={(date) => onDateChange(tx.id, date)}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </motion.div>
  )
}
