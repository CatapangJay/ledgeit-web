'use client'

import { motion } from 'framer-motion'
import { CATEGORIES } from '@/types'
import type { CategoryId } from '@/types'

export type FilterValue = 'all' | 'expense' | 'income' | CategoryId

interface Chip {
  value: FilterValue
  label: string
}

const BASE_CHIPS: Chip[] = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
]

const CATEGORY_CHIPS: Chip[] = CATEGORIES.filter((c) => c.id !== 'other').map((c) => ({
  value: c.id as FilterValue,
  label: c.label,
}))

const ALL_CHIPS = [...BASE_CHIPS, ...CATEGORY_CHIPS]

interface Props {
  active: FilterValue
  onChange: (val: FilterValue) => void
}

export default function FilterChips({ active, onChange }: Props) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
      style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
      role="group"
      aria-label="Filter transactions"
    >
      {ALL_CHIPS.map((chip) => {
        const isActive = chip.value === active
        return (
          <motion.button
            key={chip.value}
            onClick={() => onChange(chip.value)}
            aria-pressed={isActive}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={`relative shrink-0 rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors ${
              isActive
                ? 'bg-ledge-accent text-[#0A0A0F]'
                : 'border border-ledge-border bg-ledge-surface text-ledge-muted hover:border-ledge-muted hover:text-ledge-data'
            }`}
          >
            {chip.label}
          </motion.button>
        )
      })}
    </div>
  )
}
