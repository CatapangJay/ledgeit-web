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
import IncomePanel from '@/components/dashboard/IncomePanel'
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
      <div className="min-h-dvh pb-36 md:pb-10" style={{ background: '#f8faf9' }}>
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-14 pb-2 md:px-8 md:pt-8 lg:px-10">
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
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors md:hidden"
            style={{ background: '#e7edeb' }}
          >
            <UserCircle size={20} weight="fill" color="#1f695d" aria-hidden="true" />
          </button>
        </div>

        <motion.div variants={stagger} initial="hidden" animate="show" className="mt-2 space-y-3 px-5 md:px-8 lg:px-10 lg:grid lg:grid-cols-[1fr_340px] lg:gap-5 lg:items-start lg:space-y-0">
          {/* ── Hero: monthly snapshot ── left col desktop ───────────────── */}
          <motion.div
            variants={fadeUp}
            className="rounded-3xl p-6 lg:col-start-1 lg:row-start-1"
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

          {/* ── Today's activity ── right col desktop row 1 ─────────────── */}
          <motion.div variants={fadeUp} className="lg:col-start-2 lg:row-start-1">
            <SpendStrip />
          </motion.div>

          {/* ── Income ── right col desktop row 2 ───────────────────────── */}
          <motion.div variants={fadeUp} className="lg:col-start-2 lg:row-start-2">
            <IncomePanel />
          </motion.div>

          {/* ── Budget burn rate ── right col desktop row 3 ──────────────────── */}
          <motion.div variants={fadeUp} className="lg:col-start-2 lg:row-start-3">
            <MonthBurnRate />
          </motion.div>

          {/* ── Top categories ── right col desktop row 4 ────────────────────── */}
          <motion.div variants={fadeUp} className="lg:col-start-2 lg:row-start-4">
            <TopCategoryBars />
          </motion.div>

          {/* ── Recent activity feed ── left col desktop rows 2-5 ─────────── */}
          <motion.div variants={fadeUp} className="lg:col-start-1 lg:row-start-2 lg:row-span-4">
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
