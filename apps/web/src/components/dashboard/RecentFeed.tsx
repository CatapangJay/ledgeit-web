'use client'

import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import { Trash } from '@phosphor-icons/react'
import { PHOSPHOR_ICON_MAP, CUSTOM_COLOR_OPTIONS } from '@/lib/iconMap'
import { useStore } from '@/lib/store'
import { formatDate, formatCurrency, formatTime } from '@/lib/formatters'
import type { Transaction } from '@/types'

// Preset icon background colors
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
  const opt = CUSTOM_COLOR_OPTIONS.find((c) => c.textColor === cat.color)
  return opt?.swatch ?? '#64748b'
}

// ─── Group by date ────────────────────────────────────────────────────────────

function groupByDate(txns: Transaction[]): [string, Transaction[]][] {
  const map = new Map<string, Transaction[]>()
  for (const tx of txns) {
    const list = map.get(tx.date) ?? []
    list.push(tx)
    map.set(tx.date, list)
  }
  // Sort date groups descending
  return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a))
}

// ─── Swipeable row ────────────────────────────────────────────────────────────

function TxRow({ tx, onDelete }: { tx: Transaction; onDelete: (id: string) => void }) {
  const x = useMotionValue(0)
  const deleteOpacity = useTransform(x, [-72, -20], [1, 0])
  const Icon = PHOSPHOR_ICON_MAP[tx.category.icon]
  const isIncome = tx.type === 'income'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className="relative overflow-hidden"
    >
      {/* Delete swipe backdrop */}
      <div className="absolute inset-0 flex items-center justify-end pr-5" style={{ background: 'rgba(186,26,26,0.06)' }}>
        <motion.div style={{ opacity: deleteOpacity }}>
          <Trash size={17} weight="fill" style={{ color: '#ba1a1a' }} aria-hidden="true" />
        </motion.div>
      </div>

      {/* Draggable row content */}
      <motion.div
        style={{ x, background: '#ffffff' }}
        drag="x"
        dragConstraints={{ right: 0, left: -80 }}
        dragElastic={{ right: 0, left: 0.25 }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -56) {
            onDelete(tx.id)
          } else {
            animate(x, 0, { type: 'spring', stiffness: 300, damping: 26 })
          }
        }}
        className="relative flex cursor-grab items-center gap-3 py-3 active:cursor-grabbing"
      >
        {/* Category icon — rounded-xl */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: getCategoryIconBg(tx.category) }}
        >
          {Icon && (
            <Icon size={16} weight="fill" color="#ffffff" aria-hidden="true" />
          )}
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
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
            <span className="text-xs font-medium" style={{ color: getCategoryIconBg(tx.category) }}>{tx.category.label}</span>
            <span style={{ color: '#cde0db' }}>·</span>
            <span className="font-mono text-xs" style={{ color: '#6e9990' }}>{formatTime(tx.createdAt)}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Date group header ─────────────────────────────────────────────────────────

function DateHeader({ date, transactions }: { date: string; transactions: Transaction[] }) {
  const subtotal = transactions.reduce(
    (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount),
    0
  )
  const isNet = subtotal >= 0
  return (
    <div className="flex items-center justify-between pt-4 pb-1" style={{ borderTop: '1px solid #e7edeb' }}>
      <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: '#6e9990' }}>
        {formatDate(date)}
      </span>
      <span
        className="font-mono text-xs font-medium"
        style={{ color: isNet ? '#1f6950' : '#ba1a1a' }}
      >
        {subtotal >= 0 ? '+' : '−'}
        {formatCurrency(Math.abs(subtotal))}
      </span>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyFeed() {
  return (
    <div className="flex flex-col items-start gap-2 py-10">
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        style={{ color: '#e7edeb' }}
      >
        <rect x="6" y="4" width="20" height="24" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11 10h10M11 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <p className="text-sm font-medium" style={{ color: '#6e9990' }}>Nothing yet.</p>
      <p className="text-xs" style={{ color: '#cde0db' }}>Tap + to log your first entry.</p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const ROW_LIMIT = 8

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

export default function RecentFeed() {
  const transactions = useStore((s) => s.transactions)
  const deleteTransaction = useStore((s) => s.deleteTransaction)

  const recent = transactions.slice(0, ROW_LIMIT)
  const groups = groupByDate(recent)

  if (recent.length === 0) return <EmptyFeed />

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      <AnimatePresence initial={false}>
        {groups.map(([date, txns]) => (
          <div key={date}>
            <DateHeader date={date} transactions={txns} />
            <AnimatePresence>
              {txns.map((tx) => (
                <TxRow key={tx.id} tx={tx} onDelete={deleteTransaction} />
              ))}
            </AnimatePresence>
          </div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
