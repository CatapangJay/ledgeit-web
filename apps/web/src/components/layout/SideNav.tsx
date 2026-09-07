'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChartPieSliceIcon,
  GridFourIcon,
  HandPalmIcon,
  HouseIcon,
  ListIcon,
  PlusCircleIcon,
  WalletIcon,
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import SmartEntrySheet from '@/components/entry/SmartEntrySheet'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: HouseIcon, href: '/dashboard' },
  { label: 'Ledger', icon: GridFourIcon, href: '/ledger' },
  { label: 'Insights', icon: ChartPieSliceIcon, href: '/insights' },
  { label: 'Wallets', icon: WalletIcon, href: '/wallets' },
  { label: 'Debts', icon: HandPalmIcon, href: '/debts' },
  { label: 'History', icon: ListIcon, href: '/history' },
]

export default function SideNav() {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)
  // Optimistic target: the moment a nav item is tapped we highlight it, before
  // the route commits — so the click feels instant even while the page loads.
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  // Once the real pathname catches up to the tapped route, drop the override.
  useEffect(() => {
    setPendingHref(null)
  }, [pathname])

  const activeHref = pendingHref ?? pathname

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
            <PlusCircleIcon size={16} weight="bold" aria-hidden="true" />
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
              item.href === '/' ? activeHref === '/' : activeHref.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                // Highlight this item instantly on tap — don't wait for the
                // route to commit.
                onClick={() => setPendingHref(item.href)}
                className="relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left active:scale-[0.98]"
                style={{ transition: 'transform 0.1s' }}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'rgba(0,53,46,0.08)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
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
              </Link>
            )
          })}
        </nav>
      </aside>

      <SmartEntrySheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  )
}
