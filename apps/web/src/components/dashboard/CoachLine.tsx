'use client'

import { useMemo } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Sparkle, Flame, Circle, Gauge, PiggyBank } from '@phosphor-icons/react'
import { getCoachMessage, type CoachIcon, type CoachTone } from '@/lib/coach'
import { useStore } from '@/lib/store'
import { useActivePlanMeta } from '@/lib/activePlan'

const ICONS: Record<CoachIcon, typeof Sparkle> = {
  sparkle: Sparkle,
  flame: Flame,
  circle: Circle,
  gauge: Gauge,
  piggy: PiggyBank,
}

// Tone → tint. Warnings use amber (watch), never crimson (alarm) — the brand
// must never amplify money stress. Positive uses the teal/gain family.
const TONE: Record<CoachTone, { fg: string; bg: string }> = {
  positive: { fg: '#1f6950', bg: 'rgba(31,105,80,0.10)' },
  neutral:  { fg: '#3f4946', bg: 'rgba(110,153,144,0.12)' },
  warn:     { fg: '#b45309', bg: 'rgba(217,119,6,0.12)' },
}

export default function CoachLine() {
  const transactions = useStore((s) => s.transactions)
  const budgetLimits = useStore((s) => s.budgetLimits)
  const hasSetup = useStore((s) => s.hasSetupBudget())
  const plan = useActivePlanMeta()
  const reduceMotion = useReducedMotion()

  const message = useMemo(
    () =>
      getCoachMessage({
        transactions,
        budgetLimits,
        hasSetupBudget: hasSetup,
        now: new Date(),
        activePlanName: plan.name,
        activePlanDays: plan.activeDays,
      }),
    [transactions, budgetLimits, hasSetup, plan.name, plan.activeDays]
  )

  if (!message) return null

  const Icon = ICONS[message.icon]
  const tone = TONE[message.tone]

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={message.id}
        role="status"
        aria-live="polite"
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full py-1.5 pl-2.5 pr-3.5"
        style={{ background: tone.bg }}
      >
        <Icon size={14} weight="fill" color={tone.fg} aria-hidden="true" />
        <span
          className="text-[12px] font-medium leading-snug"
          style={{ color: tone.fg }}
        >
          {message.text}
        </span>
      </motion.div>
    </AnimatePresence>
  )
}
