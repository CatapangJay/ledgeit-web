'use client'

import { createElement, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash, ArrowCounterClockwise } from '@phosphor-icons/react'
import { useStore } from '@/lib/store'
import { getIconComponent } from '@/lib/iconMap'
import { CATEGORIES, isHideableCategory } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
}

function Glyph({ name, size = 15 }: { name: string; size?: number }) {
  return createElement(getIconComponent(name), { size, weight: 'duotone', 'aria-hidden': true })
}

// Hideable presets, in declaration order. Structural ones (income, transfers,
// debts, other) are excluded — they're load-bearing and can't be removed.
const HIDEABLE_PRESETS = CATEGORIES.filter((c) => isHideableCategory(c.id))

/**
 * Manage which categories appear across the app. Preset categories can be
 * hidden (reversibly) — historical transactions keep their data and just show
 * as "Other". Custom categories are deleted outright.
 */
export default function CategoryManagerSheet({ open, onClose }: Props) {
  const hiddenCategories = useStore((s) => s.hiddenCategories)
  const customCategories = useStore((s) => s.customCategories)
  const hidePresetCategory = useStore((s) => s.hidePresetCategory)
  const unhidePresetCategory = useStore((s) => s.unhidePresetCategory)
  const removeCustomCategory = useStore((s) => s.removeCustomCategory)

  // Two-step confirm for the destructive custom-category delete.
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setConfirmDelete(null)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  function handleCustomDelete(id: string) {
    if (confirmDelete !== id) { setConfirmDelete(id); return }
    removeCustomCategory(id)
    setConfirmDelete(null)
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60]"
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
            aria-label="Manage categories"
            className="fixed left-1/2 top-1/2 z-[61] flex max-h-[88dvh] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl"
            style={{ background: '#f8faf9', boxShadow: '0 24px 80px rgba(0,53,46,0.22), 0 0 0 1px rgba(205,224,219,0.6)' }}
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between px-5 pt-4 pb-3" style={{ borderBottom: '1px solid #e7edeb' }}>
              <span className="text-[15px] font-bold" style={{ color: '#00352e' }}>Manage Categories</span>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: '#f0f4f2', color: '#3f4946' }}
              >
                <X size={14} weight="bold" aria-hidden="true" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="mb-3 text-[12px] leading-relaxed" style={{ color: '#6e9990' }}>
                Hide categories you don’t use to declutter your pickers and budget.
                Past entries keep their data and reappear if you restore the category. Restore anytime.
              </p>

              {/* Custom categories (deletable) */}
              {customCategories.length > 0 && (
                <>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
                    Your Categories
                  </p>
                  <div className="mb-4 flex flex-col gap-2">
                    {customCategories.map((c) => {
                      const pending = confirmDelete === c.id
                      return (
                        <div
                          key={c.id}
                          className="flex items-center gap-3 rounded-xl px-4 py-2.5"
                          style={{ background: '#ffffff', border: '1px solid #e7edeb' }}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: '#e7edeb' }}>
                            <span className={c.textColor}><Glyph name={c.icon} /></span>
                          </div>
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold" style={{ color: '#191c1c' }}>
                            {c.name}
                          </span>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleCustomDelete(c.id)}
                            aria-label={pending ? `Confirm delete ${c.name}` : `Delete ${c.name}`}
                            className="flex h-8 items-center gap-1 rounded-full px-3 text-[11px] font-bold"
                            style={pending ? { background: '#ba1a1a', color: '#fff' } : { background: '#f0f4f2', color: '#ba1a1a' }}
                          >
                            <Trash size={12} weight="bold" aria-hidden="true" />
                            {pending ? 'Confirm' : 'Delete'}
                          </motion.button>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Preset categories (hideable) */}
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
                Default Categories
              </p>
              <div className="flex flex-col gap-2">
                {HIDEABLE_PRESETS.map((c) => {
                  const hidden = hiddenCategories.includes(c.id)
                  return (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 rounded-xl px-4 py-2.5"
                      style={{ background: '#ffffff', border: '1px solid #e7edeb', opacity: hidden ? 0.55 : 1 }}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: '#e7edeb' }}>
                        <span className={c.color}><Glyph name={c.icon} /></span>
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold" style={{ color: '#191c1c' }}>
                        {c.label}
                        {hidden && <span className="ml-2 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#6e9990' }}>Hidden</span>}
                      </span>
                      {hidden ? (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => unhidePresetCategory(c.id)}
                          aria-label={`Restore ${c.label}`}
                          className="flex h-8 items-center gap-1 rounded-full px-3 text-[11px] font-bold"
                          style={{ background: '#e7edeb', color: '#1f695d' }}
                        >
                          <ArrowCounterClockwise size={12} weight="bold" aria-hidden="true" />
                          Restore
                        </motion.button>
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => hidePresetCategory(c.id)}
                          aria-label={`Hide ${c.label}`}
                          className="flex h-8 items-center gap-1 rounded-full px-3 text-[11px] font-bold"
                          style={{ background: '#f0f4f2', color: '#ba1a1a' }}
                        >
                          <Trash size={12} weight="bold" aria-hidden="true" />
                          Delete
                        </motion.button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
