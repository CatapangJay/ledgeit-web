import type { Transaction, BudgetLimit } from './types'

// ─── Coach: a calm, gently-honest voice on the dashboard ───────────────────────
// Produces ONE message at a time, priority-ranked, derived entirely from the
// user's real data. Tone stays on-brand: celebrate wins warmly, frame problems
// as neutral observations with a nudge — never blame, never crimson-alarm.
// PRODUCT.md: the design must never amplify money stress.

export type CoachTone = 'positive' | 'neutral' | 'warn'

/** Icon key resolved to a Phosphor component by the presentation layer. */
export type CoachIcon = 'sparkle' | 'flame' | 'circle' | 'gauge' | 'piggy'

export interface CoachMessage {
  id: string
  tone: CoachTone
  icon: CoachIcon
  text: string
}

function ymOf(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Count consecutive days (ending today) that have at least one transaction.
 * Returns 0 if nothing was logged today.
 */
function loggingStreak(dates: Set<string>, now: Date): number {
  let streak = 0
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  while (dates.has(localDateStr(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export interface CoachInput {
  transactions: Transaction[]
  budgetLimits: BudgetLimit[]
  hasSetupBudget: boolean
  now: Date
  /** Active plan context — enables the gentle "still on a temporary plan" nudge. */
  activePlanName?: string | null
  /** Whole days the active plan has been active on this device. */
  activePlanDays?: number
}

// Plan names that read as temporary/situational rather than an everyday budget.
// Seeded by OnboardingBudgetSetup's PLAN_TEMPLATES. Matched case-insensitively.
const TEMPORARY_PLAN_NAMES = ['vacation mode', 'tight month', 'savings mode']

function isTemporaryPlan(name: string | null | undefined): boolean {
  if (!name) return false
  return TEMPORARY_PLAN_NAMES.includes(name.trim().toLowerCase())
}

/** After this many days, a temporary plan earns a gentle "still on it?" nudge. */
const TEMP_PLAN_REMINDER_DAYS = 7

/**
 * Resolve the single most relevant coaching message for the current state.
 * Order of precedence is deliberate: actionable/first-run guidance first,
 * then time-sensitive risk (budget pace), then wins, then habit nudges.
 */
export function getCoachMessage({
  transactions,
  budgetLimits,
  hasSetupBudget,
  now,
  activePlanName,
  activePlanDays = 0,
}: CoachInput): CoachMessage | null {
  const ym = ymOf(now)
  const todayStr = localDateStr(now)

  const monthTxns = transactions.filter((t) => t.date.startsWith(ym))
  const income = monthTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = monthTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const loggedToday = transactions.some((t) => t.date === todayStr)
  const loggedDates = new Set(transactions.map((t) => t.date))
  const streak = loggingStreak(loggedDates, now)

  // Month-pace context
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = daysInMonth - dayOfMonth
  const monthProgress = dayOfMonth / daysInMonth

  const budgetTotal = budgetLimits.reduce((s, b) => s + b.limit, 0)
  const budgetRatio = budgetTotal > 0 ? expense / budgetTotal : 0

  const rate = income > 0 ? ((income - expense) / income) * 100 : null

  // ── 1. First-run guidance ────────────────────────────────────────────────
  if (transactions.length === 0) {
    return {
      id: 'first-entry',
      tone: 'neutral',
      icon: 'sparkle',
      text: 'Welcome! Log your first expense or income to get started — just type it naturally.',
    }
  }

  if (!hasSetupBudget && expense > 0) {
    return {
      id: 'setup-budget',
      tone: 'neutral',
      icon: 'gauge',
      text: 'Set a monthly budget to see how your spending is pacing through the month.',
    }
  }

  // ── 2. Budget pace risk (time-sensitive, gently honest) ──────────────────
  // Only warn when spending is genuinely ahead of the month's pace, not just high.
  if (budgetTotal > 0 && budgetRatio > 1) {
    return {
      id: 'over-budget',
      tone: 'warn',
      icon: 'gauge',
      text: `You're over your monthly budget with ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} to go. Worth easing off where you can.`,
    }
  }

  if (budgetTotal > 0 && budgetRatio > 0.85 && budgetRatio > monthProgress + 0.15 && daysLeft > 2) {
    return {
      id: 'budget-pace',
      tone: 'warn',
      icon: 'gauge',
      text: `${Math.round(budgetRatio * 100)}% of budget used with ${daysLeft} days left — a little ahead of pace.`,
    }
  }

  // ── 2b. Temporary plan lingering (gentle, no auto-switching) ─────────────
  if (isTemporaryPlan(activePlanName) && activePlanDays >= TEMP_PLAN_REMINDER_DAYS) {
    return {
      id: 'temp-plan-lingering',
      tone: 'neutral',
      icon: 'gauge',
      text: `Still on "${activePlanName}" after ${activePlanDays} days — switch back when it no longer fits.`,
    }
  }

  // ── 3. Savings win (celebrate warmly) ────────────────────────────────────
  if (rate !== null && rate >= 20 && expense > 0) {
    return {
      id: 'savings-win',
      tone: 'positive',
      icon: 'piggy',
      text: `Great pace — you've saved ${Math.round(rate)}% of your income this month.`,
    }
  }

  // ── 4. Not logged today (habit nudge) ────────────────────────────────────
  if (!loggedToday) {
    return {
      id: 'nothing-today',
      tone: 'neutral',
      icon: 'circle',
      text: streak > 1
        ? `You haven't logged today yet — keep your ${streak}-day streak alive.`
        : "You haven't logged anything today yet.",
    }
  }

  // ── 5. Streak reward ─────────────────────────────────────────────────────
  if (streak >= 3) {
    return {
      id: 'streak',
      tone: 'positive',
      icon: 'flame',
      text: `${streak}-day logging streak — the habit is sticking. Nice work.`,
    }
  }

  // ── 6. On-track default (quiet reassurance) ──────────────────────────────
  if (rate !== null && rate >= 0 && budgetTotal > 0) {
    return {
      id: 'on-track',
      tone: 'positive',
      icon: 'sparkle',
      text: 'You’re on track this month — steady and in control.',
    }
  }

  return null
}
