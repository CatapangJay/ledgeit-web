'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { Bell, UserCircle, Sparkle } from '@phosphor-icons/react'
import BalanceMetric from '@/components/dashboard/BalanceMetric'
import ExpenseFeed from '@/components/dashboard/ExpenseFeed'
import SpendStrip from '@/components/dashboard/SpendStrip'
import MonthOverview from '@/components/dashboard/MonthOverview'
import WeeklyTrendChart from '@/components/dashboard/WeeklyTrendChart'
import SpendingHeatmap from '@/components/dashboard/SpendingHeatmap'
import TopCategoryBars from '@/components/dashboard/TopCategoryBars'
import BiggestExpenseCard from '@/components/dashboard/BiggestExpenseCard'
import TransferInfoCard from '@/components/dashboard/TransferInfoCard'
import RecurringPaymentsCard from '@/components/dashboard/RecurringPaymentsCard'
import DebtSummaryCard from '@/components/dashboard/DebtSummaryCard'
import CoachLine from '@/components/dashboard/CoachLine'
import HeroSideStats from '@/components/dashboard/HeroSideStats'
import SmartEntrySheet from '@/components/entry/SmartEntrySheet'
import OnboardingBudgetSetup from '@/components/budget/OnboardingBudgetSetup'
import BudgetAllocationSheet from '@/components/budget/BudgetAllocationSheet'

// Product register: no page-load choreography. A single fast fade acknowledges
// the load without making the user wait for a spatial reveal sequence.
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}
const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const } },
}
// prefers-reduced-motion: skip the fade entirely, render at rest.
const noMotion = {
  hidden: { opacity: 1 },
  show: { opacity: 1, transition: { duration: 0 } },
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
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)
  // When set, Smart Entry opens pre-dated to this ISO day (from the heatmap).
  const [entryDate, setEntryDate] = useState<string | undefined>(undefined)
  const [budgetSheetOpen, setBudgetSheetOpen] = useState(false)
  const greeting = useMemo(() => getGreeting(), [])
  const dateLabel = useMemo(() => getDateLabel(), [])
  const reduceMotion = useReducedMotion()
  const item = reduceMotion ? noMotion : fadeIn

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
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 pt-10 pb-3 md:px-8 md:pt-7 lg:px-10">
          <div className="flex min-w-0 flex-col">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ledge-muted">
              {dateLabel}
            </p>
            <h1 className="mt-0.5 text-[20px] font-bold tracking-tight leading-tight text-ledge-accent">
              {greeting}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* Desktop-only Log Entry shortcut — mirrors the hero CTA at eye level */}
            <button
              aria-label="Quick log entry"
              onClick={() => { setEntryDate(undefined); setSheetOpen(true) }}
              className="hidden h-11 items-center gap-2 rounded-full px-[18px] text-[12px] font-bold tracking-wide text-white transition-opacity hover:opacity-90 active:scale-95 lg:flex"
              style={{ background: 'linear-gradient(135deg, #1f695d, #00352e)' }}
            >
              <Sparkle size={13} weight="fill" aria-hidden="true" />
              <span>Log Entry</span>
            </button>
            <button
              aria-label="Notifications"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-ledge-surface transition-transform active:scale-90"
            >
              <Bell size={18} weight="regular" color="var(--ledge-data-var)" aria-hidden="true" />
            </button>
            <Link
              href="/account"
              aria-label="Account"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-ledge-surface2 transition-transform active:scale-90"
            >
              <UserCircle size={17} weight="fill" color="var(--ledge-accent-dim)" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* ── Coach line — one calm, data-driven nudge ─────────────────────── */}
        <div className="mx-auto w-full max-w-6xl px-5 pb-4 md:px-8 lg:px-10">
          <CoachLine />
        </div>

        {/*
          Layout: single column on mobile/tablet, a 3-column grid on desktop.
          Left region (2/3) carries the hero + this-month context; right region
          (1/3) carries today + recent activity. The left region's DOM precedes
          the right, so the mobile single-column order is exactly:
          hero → overview → trend → today → activity.
        */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-3 px-5 md:px-8 md:gap-4 lg:grid-cols-3 lg:items-stretch lg:px-10"
        >
          {/* ── Left region: hero + this-month context (2/3 on desktop) ─────── */}
          <motion.div variants={container} className="flex flex-col gap-3 md:gap-4 lg:col-span-2">
            {/* ── Hero balance card ───────────────────────────────────────── */}
            <motion.div
              variants={item}
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

              {/* Split layout: metrics + CTA on the left, month context on the right */}
              <div className="relative z-10 flex items-stretch justify-between gap-6">
                <div className="flex min-w-0 flex-col">
                  <BalanceMetric />

                  {/* Smart Entry CTA */}
                  <motion.button
                    onClick={() => { setEntryDate(undefined); setSheetOpen(true) }}
                    className="mt-5 flex w-fit items-center gap-2 rounded-full px-4 py-2"
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
                </div>

                <HeroSideStats />
              </div>
            </motion.div>

            {/* ── This month overview: budget usage + spent/saved/left + top cats ── */}
            <motion.div variants={item}>
              <MonthOverview onManageBudget={() => setBudgetSheetOpen(true)} />
            </motion.div>

            {/* ── 7-day spending trend (the one chart the dashboard carries) ──── */}
            <motion.div variants={item}>
              <WeeklyTrendChart />
            </motion.div>

            {/* ── Top categories this month — tap a row to filter the ledger ──── */}
            <motion.div variants={item}>
              <TopCategoryBars />
            </motion.div>

            {/* ── Biggest expense + transfers explainer, side by side ─────────── */}
            <motion.div variants={item} className="grid grid-cols-1 gap-3 md:gap-4 sm:grid-cols-2">
              <BiggestExpenseCard />
              <TransferInfoCard />
            </motion.div>
          </motion.div>

          {/* ── Right region: today + recent activity + recurring (1/3 on desktop) ── */}
          <motion.div variants={container} className="flex flex-col gap-3 md:gap-4 lg:min-h-full">
            {/* ── Today's spend ─────────────────────────────────────────────── */}
            <motion.div variants={item}>
              <SpendStrip />
            </motion.div>

            {/* ── Monthly spending heatmap — which days ran hot vs. no entry ──── */}
            <motion.div variants={item}>
              <SpendingHeatmap
                onAddForDate={(iso) => { setEntryDate(iso); setSheetOpen(true) }}
                onViewDate={(iso) => router.push(`/ledger?date=${iso}`)}
              />
            </motion.div>

            {/* ── Recent activity — flex-1 so it stretches to fill vertical space ── */}
            <motion.div variants={item} className="flex flex-col flex-1">
              <ExpenseFeed />
            </motion.div>

            {/* ── Debt position + nearest due reminder (self-hides when empty) ── */}
            <motion.div variants={item}>
              <DebtSummaryCard />
            </motion.div>

            {/* ── Recurring bills — additional density for desktop right column ── */}
            <motion.div variants={item}>
              <RecurringPaymentsCard />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      <SmartEntrySheet open={sheetOpen} onClose={() => setSheetOpen(false)} initialDate={entryDate} />
      <BudgetAllocationSheet open={budgetSheetOpen} onClose={() => setBudgetSheetOpen(false)} />
      <OnboardingBudgetSetup />
    </>
  )
}
