'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from '@phosphor-icons/react'
import CategoryBadge from './CategoryBadge'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { PHOSPHOR_ICON_MAP } from '@/lib/iconMap'
import { CATEGORIES } from '@/types'
import type { Category, CategoryId, TransactionDraft } from '@/types'

// ─── Re-used inline category picker ──────────────────────────────────────────

function InlineCategoryPicker({
  currentId,
  onSelect,
  onClose,
}: {
  currentId: CategoryId
  onSelect: (cat: Category) => void
  onClose: () => void
}) {
  return (
    <motion.div
      key="cat-picker"
      initial={{ opacity: 0, y: -4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="mb-3 rounded-2xl border border-ledge-border bg-ledge-surface p-3"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-ledge-muted">
          Correct category
        </span>
        <button
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded-full text-ledge-muted transition-colors hover:bg-ledge-surface2 hover:text-ledge-data"
          aria-label="Close category picker"
        >
          <X size={11} weight="bold" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {CATEGORIES.map((cat) => {
          const Icon = PHOSPHOR_ICON_MAP[cat.icon]
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
  /** Called when user manually selects a different category */
  onCategoryChange?: (cat: Category) => void
  /** Called when user edits the merchant name inline */
  onMerchantChange?: (name: string) => void
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

export default function ParsePreview({ draft, category, confidence, onCategoryChange, onMerchantChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editingMerchant, setEditingMerchant] = useState(false)
  const [merchantInput, setMerchantInput] = useState('')
  const merchantInputRef = useRef<HTMLInputElement>(null)
  const isIncome = draft.type === 'income'

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
        {onCategoryChange ? (
          <button
            onClick={() => setPickerOpen((o) => !o)}
            aria-label={`Category: ${category.label}. Tap to change`}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-all ${category.bgColor} ${category.color} ${
              pickerOpen ? 'ring-1 ring-ledge-accent/60' : ''
            }`}
          >
            {(() => {
              const Icon = PHOSPHOR_ICON_MAP[category.icon]
              return Icon ? <Icon size={11} weight="fill" aria-hidden="true" /> : null
            })()}
            {category.label}
            <span className="ml-0.5 opacity-50">▾</span>
          </button>
        ) : (
          <CategoryBadge category={category} size="sm" />
        )}
        <span className="font-mono text-xs text-ledge-muted">{formatDate(draft.date)}</span>
      </motion.div>

      {/* Inline category picker */}
      <AnimatePresence>
        {pickerOpen && onCategoryChange && (
          <InlineCategoryPicker
            currentId={category.id}
            onSelect={(cat) => {
              onCategoryChange(cat)
              setPickerOpen(false)
            }}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Merchant */}
      {(draft.merchant && draft.merchant !== 'Unknown') || onMerchantChange ? (
        <motion.div variants={itemVariants} className="mb-4">
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
              className="w-full rounded-lg border border-ledge-accent/40 bg-ledge-surface px-2 py-1 text-sm text-ledge-data caret-ledge-accent outline-none"
              placeholder="Enter merchant name"
              aria-label="Edit merchant name"
            />
          ) : (
            <button
              onClick={startEditMerchant}
              disabled={!onMerchantChange}
              aria-label={onMerchantChange ? 'Edit merchant name' : undefined}
              className={`group flex items-center gap-1.5 text-left ${
                onMerchantChange ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <span className="text-sm text-ledge-data">
                {draft.merchant && draft.merchant !== 'Unknown' ? draft.merchant : (
                  <span className="text-ledge-muted">Unknown merchant — tap to set</span>
                )}
              </span>
              {onMerchantChange && (
                <span className="opacity-0 transition-opacity group-hover:opacity-40 text-[10px] text-ledge-muted">
                  edit
                </span>
              )}
            </button>
          )}
        </motion.div>
      ) : null}

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
