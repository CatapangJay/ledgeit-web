'use client'

import { motion } from 'framer-motion'
import CategoryBadge from './CategoryBadge'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { Category, TransactionDraft } from '@/types'

interface Props {
  draft: TransactionDraft
  category: Category
  confidence: number
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

export default function ParsePreview({ draft, category, confidence }: Props) {
  const isIncome = draft.type === 'income'

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, y: 6, transition: { duration: 0.15 } }}
      className={`mt-4 rounded-2xl border p-4 ${
        isIncome
          ? 'border-emerald-500/30 bg-emerald-950/20'
          : 'border-rose-500/20 bg-ledge-surface2'
      }`}
    >
      {/* Amount + direction */}
      <motion.div variants={itemVariants} className="mb-3 flex items-baseline justify-between">
        <span
          className={`font-mono text-3xl font-semibold tracking-tight ${
            isIncome ? 'text-emerald-400' : 'text-ledge-data'
          }`}
        >
          {draft.amount !== null ? (
            formatCurrency(draft.amount)
          ) : (
            <span className="text-xl text-ledge-muted">no amount</span>
          )}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-widest text-ledge-muted">
          {isIncome ? '+ income' : '− expense'}
        </span>
      </motion.div>

      {/* Category + date */}
      <motion.div variants={itemVariants} className="mb-3 flex items-center justify-between">
        <CategoryBadge category={category} size="sm" />
        <span className="font-mono text-xs text-ledge-muted">{formatDate(draft.date)}</span>
      </motion.div>

      {/* Merchant */}
      {draft.merchant && draft.merchant !== 'Unknown' && (
        <motion.div variants={itemVariants} className="mb-4">
          <span className="text-sm text-ledge-data">{draft.merchant}</span>
        </motion.div>
      )}

      {/* Confidence strip */}
      <motion.div variants={itemVariants}>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-ledge-muted">Confidence</span>
          <span className="font-mono text-[10px] text-ledge-muted">
            {Math.round(confidence * 100)}%
          </span>
        </div>
        <div className="relative h-[2px] w-full overflow-hidden rounded-full bg-ledge-border">
          <motion.div
            className={`absolute left-0 top-0 h-full rounded-full ${
              isIncome ? 'bg-emerald-500' : 'bg-ledge-accent'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${confidence * 100}%` }}
            transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.25 }}
          />
        </div>
      </motion.div>
    </motion.div>
  )
}
