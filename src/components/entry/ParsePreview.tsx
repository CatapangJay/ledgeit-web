'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from '@phosphor-icons/react'
import CategoryBadge from './CategoryBadge'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { PHOSPHOR_ICON_MAP, getIconComponent } from '@/lib/iconMap'
import { CATEGORIES } from '@/types'
import type { Category, TransactionDraft, CustomCategory } from '@/types'

// ─── Re-used inline category picker ──────────────────────────────────────────

function InlineCategoryPicker({
  currentId,
  customCategories,
  onSelect,
  onClose,
}: {
  currentId: string
  customCategories: CustomCategory[]
  onSelect: (cat: Category) => void
  onClose: () => void
}) {
  // Build full category list: presets + custom
  const allCategories: Category[] = [
    ...CATEGORIES,
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

export default function ParsePreview({ draft, category, confidence, customCategories = [], onCategoryChange, onMerchantChange }: Props) {
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
      className="mt-4 rounded-2xl p-5"
      style={{
        background: isIncome ? 'rgba(31,105,93,0.06)' : '#ffffff',
        boxShadow: '0 2px 16px rgba(0,53,46,0.08)',
        border: isIncome ? '1px solid rgba(31,105,93,0.2)' : '1px solid #e7edeb',
      }}
    >
      {/* Amount + direction */}
      <motion.div variants={itemVariants} className="mb-3 flex items-baseline justify-between">
        <span
          className="font-mono text-3xl font-bold tracking-tight"
          style={{ color: isIncome ? '#1f6950' : '#191c1c' }}
        >
          {draft.amount !== null ? (
            formatCurrency(draft.amount)
          ) : (
            <span className="text-xl" style={{ color: '#6e9990' }}>no amount</span>
          )}
        </span>
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={{ background: isIncome ? 'rgba(31,105,93,0.1)' : 'rgba(186,26,26,0.08)', color: isIncome ? '#1f6950' : '#ba1a1a' }}
        >
          {isIncome ? '+ income' : '− expense'}
        </span>
      </motion.div>

      {/* Category + date */}
      <motion.div variants={itemVariants} className="mb-3 flex items-center justify-between">
        {onCategoryChange ? (
          <button
            onClick={() => setPickerOpen((o) => !o)}
            aria-label={`Category: ${category.label}. Tap to change`}
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium transition-all ${category.bgColor} ${category.color} ${
              pickerOpen ? 'outline outline-1 outline-[#1f695d]/40' : ''
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
          <span className="text-[12px] font-medium" style={{ color: '#6e9990' }}>{formatDate(draft.date)}</span>
      </motion.div>

      {/* Inline category picker */}
      <AnimatePresence>
        {pickerOpen && onCategoryChange && (
          <InlineCategoryPicker
            currentId={category.id}
            customCategories={customCategories}
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
            className="w-full border-b bg-transparent px-2 py-1 text-sm outline-none"
            style={{ borderColor: '#1f695d', color: '#191c1c', caretColor: '#1f695d' }}
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
              <span className="text-sm font-medium" style={{ color: '#191c1c' }}>
                {draft.merchant && draft.merchant !== 'Unknown' ? draft.merchant : (
                  <span style={{ color: '#6e9990' }}>Unknown merchant — tap to set</span>
                )}
              </span>
              {onMerchantChange && (
                <span className="opacity-0 transition-opacity group-hover:opacity-40 text-[10px]" style={{ color: '#6e9990' }}>
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
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#6e9990' }}>Confidence</span>
          <span className="font-mono text-[10px] font-medium" style={{ color: '#3f4946' }}>
            {Math.round(confidence * 100)}%
          </span>
        </div>
        <div className="relative h-[4px] w-full overflow-hidden rounded-full" style={{ background: '#e7edeb' }}>
          <motion.div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{ background: isIncome ? '#1f6950' : '#1f695d' }}
            initial={{ width: 0 }}
            animate={{ width: `${confidence * 100}%` }}
            transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.25 }}
          />
        </div>
      </motion.div>
    </motion.div>
  )
}
