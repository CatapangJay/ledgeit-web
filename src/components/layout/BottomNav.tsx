'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  ChartPieSlice,
  House,
  List,
  PlusCircle,
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import SmartEntrySheet from '@/components/entry/SmartEntrySheet'

const TABS = [
  { label: 'Dashboard', icon: House, href: '/' },
  { label: 'Ledger', icon: List, href: '/ledger' },
  { label: 'Add', icon: PlusCircle, href: null }, // FAB — opens sheet
  { label: 'Insights', icon: ChartPieSlice, href: '/insights' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40"
        aria-label="Primary navigation"
      >
        {/* Frosted glass bar */}
        <div
          className="flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]"
          style={{
            background: 'rgba(17,17,22,0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(31,31,39,0.8)',
          }}
        >
          {TABS.map((tab) => {
            const isFAB = tab.href === null
            const isActive = tab.href ? pathname === tab.href : false

            if (isFAB) {
              return (
                <motion.button
                  key="add"
                  aria-label="Log transaction"
                  onClick={() => setSheetOpen(true)}
                  className="flex flex-col items-center justify-center py-3 px-5"
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ledge-accent shadow-[0_0_16px_rgba(16,185,129,0.3)]">
                    <tab.icon size={22} weight="bold" color="#0A0A0F" aria-hidden="true" />
                  </div>
                </motion.button>
              )
            }

            return (
              <motion.button
                key={tab.href}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => router.push(tab.href!)}
                className="relative flex flex-col items-center justify-center gap-1 py-3 px-5"
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <tab.icon
                  size={22}
                  weight={isActive ? 'fill' : 'regular'}
                  color={isActive ? '#10B981' : '#6B7280'}
                  aria-hidden="true"
                />
                <span
                  className="text-[10px] tracking-wide"
                  style={{ color: isActive ? '#10B981' : '#6B7280' }}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute top-0 left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full bg-ledge-accent"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.button>
            )
          })}
        </div>
      </nav>

      <SmartEntrySheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  )
}
