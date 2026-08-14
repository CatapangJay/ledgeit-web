'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onClose: () => void
}

/**
 * Lightweight yes/no confirmation rendered in a portal so it floats above any
 * parent overflow/scroll container. Matches the app's forest-green sheet style.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (typeof document === 'undefined') return null

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
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            className="fixed left-1/2 top-1/2 z-[71] w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl p-5"
            style={{
              background: '#f8faf9',
              boxShadow: '0 24px 80px rgba(0,53,46,0.22), 0 0 0 1px rgba(205,224,219,0.6)',
            }}
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          >
            <h3 className="text-[15px] font-bold tracking-tight" style={{ color: '#00352e' }}>
              {title}
            </h3>
            {message && (
              <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: '#6e9990' }}>
                {message}
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
                style={{ background: '#f0f4f2', color: '#3f4946' }}
              >
                {cancelLabel}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { onConfirm(); onClose() }}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)', color: '#ffffff' }}
              >
                {confirmLabel}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
