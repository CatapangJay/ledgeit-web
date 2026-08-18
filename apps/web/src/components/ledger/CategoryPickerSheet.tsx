'use client'

import { createElement, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from '@phosphor-icons/react'
import { getIconComponent } from '@/lib/iconMap'
import { CATEGORIES } from '@/types'
import type { Category, CustomCategory } from '@/types'

function Glyph({ name, size = 15, weight = 'regular' }: { name: string; size?: number; weight?: 'bold' | 'fill' | 'regular' }) {
  return createElement(getIconComponent(name), { size, weight, 'aria-hidden': true })
}

interface Props {
  open: boolean
  /** Title shown in the header, e.g. "Move 4 to…". */
  title: string
  customCategories?: CustomCategory[]
  /** Preset ids to exclude (hidden categories). */
  hiddenCategories?: string[]
  onSelect: (category: Category) => void
  onClose: () => void
}

/**
 * Centered modal grid for picking a single category — used by the ledger's bulk
 * "change category" action. Excludes Debts (managed on the Debts page) and any
 * hidden presets; includes custom categories.
 */
export default function CategoryPickerSheet({
  open,
  title,
  customCategories = [],
  hiddenCategories = [],
  onSelect,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  const categories: Category[] = [
    ...CATEGORIES.filter((c) => c.id !== 'debts' && !hiddenCategories.includes(c.id)),
    ...customCategories.map((c) => ({
      id: c.id, label: c.name, icon: c.icon, color: c.textColor, bgColor: c.bgColor, keywords: [] as string[],
    })),
  ]

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[70]"
            style={{ background: 'rgba(0,53,46,0.28)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed left-1/2 top-1/2 z-[71] flex max-h-[80dvh] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl"
            style={{ background: '#f8faf9', boxShadow: '0 24px 80px rgba(0,53,46,0.22), 0 0 0 1px rgba(205,224,219,0.6)' }}
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          >
            <div className="flex shrink-0 items-center justify-between px-5 pt-4 pb-3" style={{ borderBottom: '1px solid #e7edeb' }}>
              <span className="text-[15px] font-bold" style={{ color: '#00352e' }}>{title}</span>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: '#f0f4f2', color: '#3f4946' }}
              >
                <X size={14} weight="bold" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-3 gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => onSelect(cat)}
                    className="flex flex-col items-center gap-1 rounded-xl py-2.5 text-[10px] font-medium transition-colors"
                    style={{ background: '#ffffff', color: '#6e9990', border: '1px solid #e7edeb' }}
                  >
                    <Glyph name={cat.icon} size={16} />
                    <span className="leading-none">{cat.label.split(/[\s&]/)[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
