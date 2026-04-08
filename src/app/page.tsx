'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, UserCircle, Sparkle, ArrowRight } from '@phosphor-icons/react'
import BalanceMetric from '@/components/dashboard/BalanceMetric'
import IncomePanel from '@/components/dashboard/IncomePanel'
import ExpenseFeed from '@/components/dashboard/ExpenseFeed'
import SpendStrip from '@/components/dashboard/SpendStrip'
import SmartEntrySheet from '@/components/entry/SmartEntrySheet'

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 240, damping: 26 } },
}

export default function DashboardPage() {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <div className="pb-36 min-h-[100dvh]" style={{ background: '#f8faf9' }}>
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-14 pb-2">
          <span
            className="text-xl font-bold tracking-tight"
            style={{ color: '#00352e' }}
          >
            Sanctuary
          </span>
          <div className="flex items-center gap-2">
            <button
              aria-label="Notifications"
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: '#f0f4f2' }}
            >
              <Bell size={18} weight="regular" color="#3f4946" aria-hidden="true" />
            </button>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: '#e7edeb' }}
            >
              <UserCircle size={18} weight="fill" color="#1f695d" aria-hidden="true" />
            </div>
          </div>
        </div>

        <motion.div variants={stagger} initial="hidden" animate="show" className="px-5 space-y-4 mt-2">
          {/* ── Hero balance card ─────────────────────────────────────────── */}
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
              <span className="text-[13px] font-semibold">Smart Entry</span>
            </motion.button>
          </motion.div>

          {/* ── Today's spend strip ───────────────────────────────────────── */}
          <motion.div variants={fadeUp}>
            <SpendStrip />
          </motion.div>

          {/* ── Income panel ─────────────────────────────────────────────── */}
          <motion.div variants={fadeUp}>
            <IncomePanel />
          </motion.div>

          {/* ── Expense feed ─────────────────────────────────────────────── */}
          <motion.div variants={fadeUp}>
            <ExpenseFeed />
          </motion.div>
        </motion.div>
      </div>

      <SmartEntrySheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  )
}
