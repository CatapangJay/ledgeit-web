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

const NAV_ITEMS = [
  { label: 'Dashboard', icon: House, href: '/' },
  { label: 'Ledger', icon: List, href: '/ledger' },
  { label: 'Insights', icon: ChartPieSlice, href: '/insights' },
  { label: 'Account', icon: UserCircle, href: '/account' },
]

export default function SideNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <aside
        className="fixed left-0 top-0 hidden h-full w-60 flex-col md:flex"
        style={{
          background: 'rgba(248,250,249,0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(205,224,219,0.6)',
          boxShadow: '1px 0 24px rgba(0,53,46,0.04)',
          zIndex: 40,
        }}
      >
        {/* Brand */}
        <div className="px-6 pb-5 pt-10">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: '#6e9990' }}
          >
            Finance
          </p>
          <span
            className="text-xl font-bold tracking-tight"
            style={{ color: '#00352e' }}
          >
            LedgeIt
          </span>
        </div>

        {/* Log Entry CTA */}
        <div className="px-4 pb-5">
          <motion.button
            onClick={() => setSheetOpen(true)}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="flex w-full items-center gap-2.5 rounded-xl px-4 py-2.5"
            style={{
              background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)',
              boxShadow: '0 4px 16px rgba(0,53,46,0.25)',
              color: '#ffffff',
            }}
          >
            <PlusCircle size={16} weight="bold" aria-hidden="true" />
            <span className="text-sm font-semibold">Log Entry</span>
          </motion.button>
        </div>

        {/* Nav items */}
        <nav
          className="flex flex-1 flex-col gap-0.5 px-3"
          aria-label="Primary navigation"
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            return (
              <motion.button
                key={item.href}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => router.push(item.href)}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left"
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'rgba(0,53,46,0.08)' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon
                  size={18}
                  weight={isActive ? 'fill' : 'regular'}
                  color={isActive ? '#00352e' : '#6e9990'}
                  aria-hidden="true"
                  className="relative shrink-0"
                />
                <span
                  className="relative text-sm font-semibold"
                  style={{ color: isActive ? '#00352e' : '#6e9990' }}
                >
                  {item.label}
                </span>
              </motion.button>
            )
          })}
        </nav>
      </aside>

      <SmartEntrySheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  )
}
