'use client'

import { motion } from 'framer-motion'
import { CATEGORIES } from '@/types'

export type FilterValue = 'all' | 'expense' | 'income' | 'transfer' | string

interface Chip {
  value: FilterValue
  label: string
}

const BASE_CHIPS: Chip[] = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfers' },
]

// `transfers` is surfaced via the top-level "Transfers" type chip above, so it's
// excluded here to avoid a duplicate category chip.
const PRESET_CATEGORY_CHIPS: Chip[] = CATEGORIES
  .filter((c) => c.id !== 'other' && c.id !== 'income' && c.id !== 'transfers')
  .map((c) => ({
    value: c.id as FilterValue,
    label: c.label,
  }))

interface Props {
  active: FilterValue
  onChange: (val: FilterValue) => void
  /** Extra chips from user-created custom categories */
  customChips?: Chip[]
  /** Preset category ids the user has hidden — excluded from the chips. */
  hiddenCategories?: string[]
}

export default function FilterChips({ active, onChange, customChips = [], hiddenCategories = [] }: Props) {
  const presetChips = PRESET_CATEGORY_CHIPS.filter((c) => !hiddenCategories.includes(c.value as string))
  const allChips = [...BASE_CHIPS, ...presetChips, ...customChips]

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
