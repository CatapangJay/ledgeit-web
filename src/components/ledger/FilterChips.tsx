'use client'

import { motion } from 'framer-motion'
import { CATEGORIES } from '@/types'

export type FilterValue = 'all' | 'expense' | 'income' | string

interface Chip {
  value: FilterValue
  label: string
}

const BASE_CHIPS: Chip[] = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
]

const PRESET_CATEGORY_CHIPS: Chip[] = CATEGORIES.filter((c) => c.id !== 'other' && c.id !== 'income').map((c) => ({
  value: c.id as FilterValue,
  label: c.label,
}))

interface Props {
  active: FilterValue
  onChange: (val: FilterValue) => void
  /** Extra chips from user-created custom categories */
  customChips?: Chip[]
}

export default function FilterChips({ active, onChange, customChips = [] }: Props) {
  const allChips = [...BASE_CHIPS, ...PRESET_CATEGORY_CHIPS, ...customChips]

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
      style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
      role="group"
      aria-label="Filter transactions"
    >
      {allChips.map((chip) => {
        const isActive = chip.value === active
        return (
          <motion.button
            key={chip.value}
            onClick={() => onChange(chip.value)}
            aria-pressed={isActive}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="relative shrink-0 rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors"
            style={
              isActive
                ? { background: '#00352e', color: '#ffffff', boxShadow: '0 2px 8px rgba(0,53,46,0.2)' }
                : { background: '#f0f4f2', color: '#3f4946' }
            }
          >
            {chip.label}
          </motion.button>
        )
      })}
    </div>
  )
}
