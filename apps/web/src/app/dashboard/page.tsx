'use client'

import { useState, useMemo, useEffect } from 'react'
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
import WalletSummaryCard from '@/components/dashboard/WalletSummaryCard'
import CoachLine from '@/components/dashboard/CoachLine'
import HeroSideStats from '@/components/dashboard/HeroSideStats'
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton'
import SmartEntrySheet from '@/components/entry/SmartEntrySheet'
import OnboardingBudgetSetup from '@/components/budget/OnboardingBudgetSetup'
import BudgetAllocationSheet from '@/components/budget/BudgetAllocationSheet'
import MonthlyRecapModal from '@/components/dashboard/MonthlyRecapModal'
import { useDeferredMount } from '@/lib/useDeferredMount'
import { useStore } from '@/lib/store'
import { computeMonthlyRecap, previousMonthKey } from '@/lib/monthlyRecap'

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
  // True once the user closes the recap this session — keeps it shut even if the
  // seen-marker write is still in flight or rolls back on error.
  const [recapDismissed, setRecapDismissed] = useState(false)
  // Gates the recap behind a short beat so the dashboard paints first and the
  // modal arrives as an event rather than blocking the page on load.
  const [recapSettled, setRecapSettled] = useState(false)
  const greeting = useMemo(() => getGreeting(), [])
  const dateLabel = useMemo(() => getDateLabel(), [])

  // ── End-of-month recap ──────────────────────────────────────────────────────
  // Celebrate the month that just ended, once, on the user's first dashboard
  // visit of the new month. Derived (not an effect) so it can't flash before we
  // know whether it was already dismissed.
  const transactions = useStore((s) => s.transactions)
  const budgetLimits = useStore((s) => s.budgetLimits)
  const customCategories = useStore((s) => s.customCategories)
  const lastRecapMonth = useStore((s) => s.lastRecapMonth)
  const lastRecapMonthLoaded = useStore((s) => s.lastRecapMonthLoaded)
  const budgetAllocationsLoaded = useStore((s) => s.budgetAllocationsLoaded)
  const markRecapSeen = useStore((s) => s.markRecapSeen)

  const recap = useMemo(() => {
    const key = previousMonthKey(new Date())
    return computeMonthlyRecap(key, transactions, budgetLimits, customCategories)
  }, [transactions, budgetLimits, customCategories])

  // Eligible once we know both whether the recap was already seen AND that the
  // budget/onboarding state has resolved (a first-time user gets onboarding, not
  // a recap — and would have no prior-month data anyway). markRecapSeen flips
  // lastRecapMonth, which closes this naturally; recapDismissed is the belt-and-
  // suspenders guard against a rolled-back write reopening it.
  const recapEligible =
    lastRecapMonthLoaded &&
    budgetAllocationsLoaded &&
    !recapDismissed &&
    lastRecapMonth !== recap.monthKey &&
    !recap.isEmpty

  // Let the page settle for a beat, then present the recap — so it reads as a
  // deliberate arrival, not a blocking interstitial. The timer's setState runs
  // async (allowed), unlike a synchronous set inside the effect body.
  useEffect(() => {
    if (!recapEligible) return
    const t = setTimeout(() => setRecapSettled(true), 900)
    return () => clearTimeout(t)
  }, [recapEligible])

  const recapOpen = recapEligible && recapSettled

  const closeRecap = () => {
    setRecapDismissed(true)
    markRecapSeen(recap.monthKey)
  }
  const reduceMotion = useReducedMotion()
  const item = reduceMotion ? noMotion : fadeIn
  // Defer the heavy card grid one paint so client navigation to /dashboard shows
  // the header + skeleton instantly instead of blocking on the whole render.
  const contentReady = useDeferredMount()

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
        {!contentReady ? (
          <DashboardSkeleton />
        ) : (
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

            {/* ── Wallets — total set aside + top wallets (self-hides when empty) ── */}
            <motion.div variants={item}>
              <WalletSummaryCard />
            </motion.div>

            {/* ── Recurring bills — additional density for desktop right column ── */}
            <motion.div variants={item}>
              <RecurringPaymentsCard />
            </motion.div>
          </motion.div>
        </motion.div>
        )}
      </div>

      <SmartEntrySheet open={sheetOpen} onClose={() => setSheetOpen(false)} initialDate={entryDate} />
      <BudgetAllocationSheet open={budgetSheetOpen} onClose={() => setBudgetSheetOpen(false)} />
      <MonthlyRecapModal recap={recap} open={recapOpen} onClose={closeRecap} />
      <OnboardingBudgetSetup />
    </>
  )
}
