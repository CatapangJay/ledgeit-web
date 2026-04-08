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
        {/* Glassmorphism surface — light, blurred */}
        <div
          className="flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]"
          style={{
            background: 'rgba(248,250,249,0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(205,224,219,0.6)',
            boxShadow: '0 -8px 32px rgba(0,53,46,0.06)',
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
                  className="flex flex-col items-center justify-center py-3 px-4"
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{
                      background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)',
                      boxShadow: '0 4px 16px rgba(0,53,46,0.28)',
                    }}
                  >
                    <tab.icon size={20} weight="bold" color="#ffffff" aria-hidden="true" />
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
                className="relative flex flex-col items-center justify-center gap-1 py-3 px-4"
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <tab.icon
                  size={20}
                  weight={isActive ? 'fill' : 'regular'}
                  color={isActive ? '#00352e' : '#6e9990'}
                  aria-hidden="true"
                />
                <span
                  className="text-[10px] font-semibold tracking-wide"
                  style={{ color: isActive ? '#00352e' : '#6e9990' }}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute bottom-0 left-1/2 h-[3px] w-6 -translate-x-1/2 rounded-full"
                    style={{ background: '#00352e' }}
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
