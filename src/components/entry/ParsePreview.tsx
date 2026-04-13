'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CalendarBlank, CheckCircle, Circle } from '@phosphor-icons/react'
import CategoryBadge from './CategoryBadge'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { getIconComponent } from '@/lib/iconMap'
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
  /** Bulk mode: whether this entry is selected for logging */
  selected?: boolean
  onToggleSelect?: () => void
  /** Bulk mode: entry already logged */
  logged?: boolean
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

export default function ParsePreview({ draft, category, confidence, customCategories = [], onCategoryChange, onMerchantChange, onDateChange, selected, onToggleSelect, logged = false }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editingMerchant, setEditingMerchant] = useState(false)
  const [merchantInput, setMerchantInput] = useState('')
  const merchantInputRef = useRef<HTMLInputElement>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const isIncome = draft.type === 'income'
  const isBulk = onToggleSelect !== undefined

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
          onClick={() => { if (!logged && onDateChange) dateInputRef.current?.showPicker() }}
          disabled={logged || !onDateChange}
          aria-label="Change date"
          className="flex shrink-0 items-center gap-1 text-[11px] font-medium transition-colors"
          style={{ color: '#6e9990' }}
        >
          <CalendarBlank size={11} weight="regular" aria-hidden="true" />
          {formatDate(draft.date)}
        </button>
        {/* Hidden native date input — triggered programmatically */}
        {onDateChange && (
          <input
            ref={dateInputRef}
            type="date"
            value={draft.date}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => { if (e.target.value) onDateChange(e.target.value) }}
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
          />
        )}
      </motion.div>

      {/* Inline category picker */}
      <AnimatePresence>
        {pickerOpen && onCategoryChange && (
          <div className="mt-2">
            <InlineCategoryPicker
              currentId={category.id}
              customCategories={customCategories}
              onSelect={(cat) => { onCategoryChange(cat); setPickerOpen(false) }}
              onClose={() => setPickerOpen(false)}
            />
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
