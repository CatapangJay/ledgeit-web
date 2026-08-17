'use client'

import { useState } from 'react'
import { useMotionValue, motion, animate } from 'framer-motion'
import { Trash, CalendarBlank } from '@phosphor-icons/react'
import { PHOSPHOR_ICON_MAP, CUSTOM_COLOR_OPTIONS } from '@/lib/iconMap'
import { formatCurrency, formatDate } from '@/lib/formatters'
import DatePickerSheet from '@/components/ui/DatePickerSheet'
import { resolvePaymentMethod } from '@/types'
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
}

export default function TransactionRow({ tx, onDelete, onDateChange, onEdit }: Props) {
  const x = useMotionValue(0)
  const [pickerOpen, setPickerOpen] = useState(false)
  // Tracks whether the last pointer interaction was a drag (vs. a tap) so a
  // swipe-to-delete gesture doesn't also trigger the edit sheet.
  const [didDrag, setDidDrag] = useState(false)
  const Icon = PHOSPHOR_ICON_MAP[tx.category.icon]
  const isIncome = tx.type === 'income'
  const isTransfer = tx.type === 'transfer'
  // Transfers move money between the user's own pockets — shown neutrally with no
  // +/− since they're neither spending nor income.
  const amountColor = isTransfer ? '#6e9990' : isIncome ? '#1f6950' : '#ba1a1a'
  const amountSign = isTransfer ? '' : isIncome ? '+' : '−'
  const method = resolvePaymentMethod(tx.paymentMethod)
  const MethodIcon = PHOSPHOR_ICON_MAP[method.icon]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -32, transition: { duration: 0.16 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="relative overflow-hidden"
    >
      {/* Swipe-to-delete backdrop */}
      <div className="absolute inset-0 flex items-center justify-end pr-5" style={{ background: 'rgba(186,26,26,0.06)' }}>
        <Trash size={16} weight="fill" style={{ color: '#ba1a1a' }} aria-hidden="true" />
      </div>

      {/* Draggable row */}
      <motion.div
        style={{ x, background: '#ffffff' }}
        drag="x"
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
        onClick={() => { if (!didDrag) onEdit?.(tx) }}
        className={`relative flex items-center gap-3 px-4 py-3.5 ${onEdit ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
      >
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
            {onDateChange ? (
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
