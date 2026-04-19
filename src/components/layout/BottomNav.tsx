'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  ChartPieSlice,
  House,
  List,
  PlusCircle,
  UserCircle,
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import SmartEntrySheet from '@/components/entry/SmartEntrySheet'

const TABS = [
  { label: 'Dashboard', icon: House, href: '/' },
  { label: 'Ledger', icon: List, href: '/ledger' },
  { label: 'Add', icon: PlusCircle, href: null }, // FAB — center, opens sheet
  { label: 'Insights', icon: ChartPieSlice, href: '/insights' },
  { label: 'Account', icon: UserCircle, href: '/account' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)

  // Separate the FAB from the regular tabs for layout control
  const leftTabs = TABS.slice(0, 2)
  const rightTabs = TABS.slice(3)
  const fabTab = TABS[2]

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
        aria-label="Primary navigation"
      >
        <div
          className="relative flex items-end justify-around px-2 pb-[env(safe-area-inset-bottom)]"
          style={{
            background: 'rgba(248,250,249,0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(205,224,219,0.6)',
            boxShadow: '0 -8px 32px rgba(0,53,46,0.06)',
          }}
        >
          {/* Left tabs */}
          {leftTabs.map((tab) => {
            const isActive = tab.href ? pathname === tab.href : false
            return (
              <motion.button
                key={tab.href}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => router.push(tab.href!)}
                className="relative flex flex-1 flex-col items-center justify-center gap-1 py-3"
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
                    className="absolute bottom-0 left-1/2 h-0.75 w-6 -translate-x-1/2 rounded-full"
                    style={{ background: '#00352e' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.button>
            )
          })}

          {/* Center FAB — raised above the bar */}
          <div className="relative flex flex-1 flex-col items-center" style={{ marginBottom: '-1px' }}>
            <motion.button
              aria-label="Log transaction"
              onClick={() => setSheetOpen(true)}
              className="flex flex-col items-center justify-center pb-2 pt-1"
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)',
                  boxShadow: '0 6px 20px rgba(0,53,46,0.35)',
                  transform: 'translateY(-10px)',
                }}
              >
                <fabTab.icon size={22} weight="bold" color="#ffffff" aria-hidden="true" />
              </div>
              <span
                className="text-[10px] font-semibold tracking-wide"
                style={{ color: '#6e9990', marginTop: '-4px' }}
              >
                Add
              </span>
            </motion.button>
          </div>

          {/* Right tabs */}
          {rightTabs.map((tab) => {
            const isActive = tab.href ? pathname === tab.href : false
            return (
              <motion.button
                key={tab.href}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => router.push(tab.href!)}
                className="relative flex flex-1 flex-col items-center justify-center gap-1 py-3"
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
                    className="absolute bottom-0 left-1/2 h-0.75 w-6 -translate-x-1/2 rounded-full"
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
