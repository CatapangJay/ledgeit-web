'use client'

import { useMotionValue, motion, animate } from 'framer-motion'
import { Trash } from '@phosphor-icons/react'
import { PHOSPHOR_ICON_MAP } from '@/lib/iconMap'
import { formatCurrency, formatTime } from '@/lib/formatters'
import type { Transaction } from '@/types'

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
      <div className="absolute inset-0 flex items-center justify-end pr-5 bg-rose-950/40">
        <Trash size={16} weight="fill" className="text-rose-400" aria-hidden="true" />
      </div>

      {/* Draggable row */}
      <motion.div
        style={{ x }}
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
        className="relative flex cursor-grab items-center gap-3 bg-ledge-bg py-3 active:cursor-grabbing"
      >
        {/* Icon */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tx.category.bgColor}`}
        >
          {Icon && (
            <Icon size={16} weight="fill" className={tx.category.color} aria-hidden="true" />
          )}
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-semibold text-ledge-data">{tx.merchant}</span>
            <span
              className={`shrink-0 font-mono text-sm font-medium ${
                isIncome ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isIncome ? '+' : '−'}
              {formatCurrency(tx.amount)}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className={`text-xs ${tx.category.color} opacity-80`}>{tx.category.label}</span>
            <span className="text-ledge-border text-xs">·</span>
            <span className="font-mono text-xs text-ledge-muted">{formatTime(tx.createdAt)}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
