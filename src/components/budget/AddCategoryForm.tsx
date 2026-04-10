'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from '@phosphor-icons/react'
import { CUSTOM_ICON_OPTIONS, CUSTOM_COLOR_OPTIONS, getIconComponent } from '@/lib/iconMap'

interface Props {
  onConfirm: (name: string, icon: string, textColor: string, bgColor: string) => void | Promise<void>
  onCancel: () => void
  saving?: boolean
}

export default function AddCategoryForm({ onConfirm, onCancel, saving }: Props) {
  const [name, setName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState(CUSTOM_ICON_OPTIONS[0])
  const [selectedColor, setSelectedColor] = useState<typeof CUSTOM_COLOR_OPTIONS[number]>(CUSTOM_COLOR_OPTIONS[0])

  function handleConfirm() {
    if (!name.trim()) return
    onConfirm(name.trim(), selectedIcon, selectedColor.textColor, selectedColor.bgColor)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      className="mt-3 rounded-2xl p-4"
      style={{ background: '#e7edeb', border: '1.5px solid #cde0db' }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
          New Category
        </span>
        <motion.button
          aria-label="Cancel"
          whileTap={{ scale: 0.88 }}
          onClick={onCancel}
          className="flex h-6 w-6 items-center justify-center rounded-full"
          style={{ background: '#f0f4f2' }}
        >
          <X size={11} weight="bold" style={{ color: '#6e9990' }} aria-hidden="true" />
        </motion.button>
      </div>

      {/* Name input */}
      <input
        type="text"
        maxLength={32}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="E.g. Childcare, Hobbies…"
        autoFocus
        className="mb-3 w-full rounded-xl px-3 py-2.5 text-sm font-semibold outline-none"
        style={{
          background: '#f8faf9',
          color: '#191c1c',
          border: '1.5px solid transparent',
        }}
        onFocus={(e) => (e.currentTarget.style.border = '1.5px solid #1f695d')}
        onBlur={(e) => (e.currentTarget.style.border = '1.5px solid transparent')}
        onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
      />

      {/* Icon picker */}
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
        Icon
      </p>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {CUSTOM_ICON_OPTIONS.map((iconName) => {
          const Icon = getIconComponent(iconName)
          const isSelected = selectedIcon === iconName
          return (
            <motion.button
              key={iconName}
              aria-label={iconName}
              aria-pressed={isSelected}
              whileTap={{ scale: 0.88 }}
              onClick={() => setSelectedIcon(iconName)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: isSelected ? '#1f695d' : '#f0f4f2',
              }}
            >
              <Icon
                size={16}
                weight={isSelected ? 'fill' : 'regular'}
                color={isSelected ? '#fff' : '#3f4946'}
                aria-hidden="true"
              />
            </motion.button>
          )
        })}
      </div>

      {/* Color picker */}
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
        Color
      </p>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {CUSTOM_COLOR_OPTIONS.map((opt) => {
          const isSelected = selectedColor.label === opt.label
          return (
            <motion.button
              key={opt.label}
              aria-label={opt.label}
              aria-pressed={isSelected}
              whileTap={{ scale: 0.88 }}
              onClick={() => setSelectedColor(opt)}
              className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{ background: opt.swatch }}
            >
              {isSelected && (
                <div
                  className="absolute -inset-1 rounded-full"
                  style={{ border: `2px solid ${opt.swatch}`, opacity: 0.5 }}
                />
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Actions */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleConfirm}
        disabled={!name.trim() || saving}
        className="w-full rounded-xl py-2.5 text-sm font-bold disabled:opacity-40"
        style={{
          background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)',
          color: '#ffffff',
        }}
      >
        {saving ? 'Adding…' : 'Add Category'}
      </motion.button>
    </motion.div>
  )
}
