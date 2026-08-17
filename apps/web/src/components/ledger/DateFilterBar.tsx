'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarBlank, CaretDown } from '@phosphor-icons/react'
import DatePickerSheet from '@/components/ui/DatePickerSheet'
import { formatDate } from '@/lib/formatters'

export type DatePeriod = 'all' | 'thisMonth' | 'last7' | 'last30' | 'custom'

interface Preset {
  value: Exclude<DatePeriod, 'custom'>
  label: string
}

const PRESETS: Preset[] = [
  { value: 'all', label: 'All time' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
]

interface Props {
  period: DatePeriod
  /** ISO YYYY-MM-DD when period === 'custom'. */
  customDate: string | null
  onPeriodChange: (period: DatePeriod) => void
  onCustomDateChange: (iso: string) => void
}

/**
 * Date-scoping row for the ledger: preset periods + a custom single-day picker.
 * The custom chip doubles as the trigger for the design-system calendar.
 */
export default function DateFilterBar({ period, customDate, onPeriodChange, onCustomDateChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
      style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
      role="group"
      aria-label="Filter by date"
    >
      {PRESETS.map((preset) => {
        const isActive = period === preset.value
        return (
          <motion.button
            key={preset.value}
            onClick={() => onPeriodChange(preset.value)}
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
            {preset.label}
          </motion.button>
        )
      })}

      {/* Custom single-day chip — opens the calendar */}
      <motion.button
        onClick={() => setPickerOpen(true)}
        aria-pressed={period === 'custom'}
        aria-label={period === 'custom' && customDate ? `Date: ${formatDate(customDate)}. Tap to change.` : 'Pick a specific date'}
        whileTap={{ scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="relative flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors"
        style={
          period === 'custom'
            ? { background: '#00352e', color: '#ffffff', boxShadow: '0 2px 8px rgba(0,53,46,0.2)' }
            : { background: '#f0f4f2', color: '#3f4946' }
        }
      >
        <CalendarBlank size={12} weight={period === 'custom' ? 'fill' : 'regular'} aria-hidden="true" />
        {period === 'custom' && customDate ? formatDate(customDate) : 'Pick date'}
        {period !== 'custom' && <CaretDown size={10} weight="bold" aria-hidden="true" />}
      </motion.button>

      <DatePickerSheet
        open={pickerOpen}
        value={customDate ?? new Date().toISOString().split('T')[0]}
        onSelect={(iso) => onCustomDateChange(iso)}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  )
}
