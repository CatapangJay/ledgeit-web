'use client'

import { useMotionValue, motion, animate } from 'framer-motion'
import { Trash } from '@phosphor-icons/react'
import { PHOSPHOR_ICON_MAP, CUSTOM_COLOR_OPTIONS } from '@/lib/iconMap'
import { formatCurrency, formatTime } from '@/lib/formatters'
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
}

export default function TransactionRow({ tx, onDelete }: Props) {
  const x = useMotionValue(0)
  const Icon = PHOSPHOR_ICON_MAP[tx.category.icon]
  const isIncome = tx.type === 'income'

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
        onDragEnd={(_, info) => {
          if (info.offset.x < -52) {
            onDelete(tx.id)
          } else {
            animate(x, 0, { type: 'spring', stiffness: 300, damping: 26 })
          }
        }}
        className="relative flex cursor-grab items-center gap-3 px-4 py-3.5 active:cursor-grabbing"
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
              style={{ color: isIncome ? '#1f6950' : '#ba1a1a' }}
            >
              {isIncome ? '+' : '−'}
              {formatCurrency(tx.amount)}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="text-xs" style={{ color: getCategoryIconBg(tx.category), opacity: 0.9 }}>{tx.category.label}</span>
            <span className="text-xs" style={{ color: '#cde0db' }}>·</span>
            <span className="font-mono text-xs" style={{ color: '#6e9990' }}>{formatTime(tx.createdAt)}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
