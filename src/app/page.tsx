'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Sparkle, UserCircle } from '@phosphor-icons/react'
import BalanceMetric from '@/components/dashboard/BalanceMetric'
import SpendStrip from '@/components/dashboard/SpendStrip'
import MonthBurnRate from '@/components/dashboard/MonthBurnRate'
import TopCategoryBars from '@/components/dashboard/TopCategoryBars'
import RecentFeed from '@/components/dashboard/RecentFeed'
import SmartEntrySheet from '@/components/entry/SmartEntrySheet'

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 240, damping: 26 } },
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <div className="min-h-dvh pb-36" style={{ background: '#f8faf9' }}>
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-14 pb-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: '#6e9990' }}>
              {greeting()}
            </p>
            <span className="text-xl font-bold tracking-tight" style={{ color: '#00352e' }}>
              LedgeIt
            </span>
          </div>
          <button
            aria-label="Account"
            onClick={() => router.push('/account')}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
            style={{ background: '#e7edeb' }}
          >
            <UserCircle size={20} weight="fill" color="#1f695d" aria-hidden="true" />
          </button>
        </div>

        <motion.div variants={stagger} initial="hidden" animate="show" className="mt-2 space-y-3 px-5">
          {/* ── Hero: monthly snapshot ───────────────────────────────────── */}
          <motion.div
            variants={fadeUp}
            className="rounded-3xl p-6"
            style={{
              background: 'linear-gradient(145deg, #00352e 0%, #1f695d 100%)',
              boxShadow: '0 16px 48px rgba(0,53,46,0.22)',
            }}
          >
            <BalanceMetric />

            {/* Smart Entry CTA */}
            <motion.button
              onClick={() => setSheetOpen(true)}
              className="mt-5 flex items-center gap-2 rounded-full px-5 py-2.5"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff' }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <Sparkle size={15} weight="fill" aria-hidden="true" />
              <span className="text-[13px] font-semibold">Log Entry</span>
            </motion.button>
          </motion.div>

          {/* ── Today's activity ─────────────────────────────────────────── */}
          <motion.div variants={fadeUp}>
            <SpendStrip />
          </motion.div>

          {/* ── Budget burn rate ──────────────────────────────────────────── */}
          <motion.div variants={fadeUp}>
            <MonthBurnRate />
          </motion.div>

          {/* ── Top categories ────────────────────────────────────────────── */}
          <motion.div variants={fadeUp}>
            <TopCategoryBars />
          </motion.div>

          {/* ── Recent activity feed ──────────────────────────────────────── */}
          <motion.div variants={fadeUp}>
            <div
              className="rounded-2xl overflow-hidden px-5 pt-4 pb-2"
              style={{
                background: '#ffffff',
                boxShadow: '0 4px 24px rgba(0,53,46,0.07)',
              }}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className="text-[12px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: '#00352e' }}
                >
                  Recent Activity
                </span>
                <button
                  onClick={() => router.push('/ledger')}
                  className="text-[11px] font-semibold"
                  style={{ color: '#1f695d' }}
                >
                  View all
                </button>
              </div>
              <RecentFeed />
            </div>
          </motion.div>
        </motion.div>
      </div>

      <SmartEntrySheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  )
}
