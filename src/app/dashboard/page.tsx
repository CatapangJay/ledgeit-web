'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Bell, UserCircle, Sparkle } from '@phosphor-icons/react'
import BalanceMetric from '@/components/dashboard/BalanceMetric'
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

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getDateLabel() {
  return new Date().toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export default function DashboardPage() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const greeting = useMemo(() => getGreeting(), [])
  const dateLabel = useMemo(() => getDateLabel(), [])

  return (
    <>
      {/* Ambient radial glow — anchored behind the hero card */}
      <div
        className="pb-36 min-h-[100dvh]"
        style={{
          background:
            'radial-gradient(ellipse 110% 32% at 50% 0, rgba(0,53,46,0.07) 0%, transparent 100%), #f8faf9',
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-end justify-between px-5 pt-14 pb-5">
          <div>
            <p
              className="text-[12px] font-medium tracking-wide"
              style={{ color: '#6e9990' }}
            >
              {dateLabel}
            </p>
            <h1
              className="mt-0.5 text-[22px] font-bold tracking-tight leading-tight"
              style={{ color: '#00352e' }}
            >
              {greeting}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-label="Notifications"
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: '#f0f4f2' }}
            >
              <Bell size={17} weight="regular" color="#3f4946" aria-hidden="true" />
            </button>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: '#e7edeb' }}
            >
              <UserCircle size={17} weight="fill" color="#1f695d" aria-hidden="true" />
            </div>
          </div>
        </div>

        <motion.div variants={stagger} initial="hidden" animate="show" className="px-5 space-y-3">
          {/* ── Hero balance card ─────────────────────────────────────────── */}
          <motion.div
            variants={fadeUp}
            className="relative rounded-3xl p-6 overflow-hidden"
            style={{
              background: 'linear-gradient(150deg, #002820 0%, #00352e 45%, #1a6358 100%)',
              boxShadow:
                '0 20px 56px rgba(0,40,32,0.28), 0 4px 16px rgba(0,53,46,0.14)',
            }}
          >
            {/* Premium light refraction line at card edge */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.32) 30%, rgba(255,255,255,0.52) 50%, rgba(255,255,255,0.32) 70%, transparent 95%)',
              }}
            />
            {/* Depth vignette at card bottom */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-20 rounded-b-3xl"
              style={{
                background:
                  'linear-gradient(to top, rgba(0,18,12,0.22) 0%, transparent 100%)',
              }}
            />

            <BalanceMetric />

            {/* Smart Entry CTA */}
            <motion.button
              onClick={() => setSheetOpen(true)}
              className="relative z-10 mt-5 flex items-center gap-2 rounded-full px-4 py-2"
              style={{
                background: 'rgba(255,255,255,0.11)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#ffffff',
              }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <Sparkle size={13} weight="fill" aria-hidden="true" />
              <span className="text-[12px] font-semibold tracking-wide">Smart Entry</span>
            </motion.button>
          </motion.div>

          {/* ── Today's spend strip ───────────────────────────────────────── */}
          <motion.div variants={fadeUp}>
            <SpendStrip />
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
