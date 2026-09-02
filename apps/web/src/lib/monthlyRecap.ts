import type { Transaction, BudgetLimit, Category, CustomCategory } from '@/types'
import { isSpend, isEarn, spendAmount, resolveCategory } from '@/types'

// ─── Month-key helpers ──────────────────────────────────────────────────────
//
// A "recap month" is identified by its 'YYYY-MM' key. The dashboard celebrates
// the month that JUST ENDED, so the recap the user sees on any given day is for
// the previous calendar month. All date math here is local-time (matching how
// transactions are dated elsewhere in the app).

/** 'YYYY-MM' for the calendar month `offset` months from `ref` (offset -1 = last month). */
export function monthKey(ref: Date, offset = 0): string {
  const d = new Date(ref.getFullYear(), ref.getMonth() + offset, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** The recap month to consider right now: the calendar month before today. */
export function previousMonthKey(now: Date): string {
  return monthKey(now, -1)
}

/** Human label for a 'YYYY-MM' key, e.g. '2026-08' → 'August 2026'. */
export function monthKeyLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/** Number of days in the calendar month a 'YYYY-MM' key refers to. */
function daysInMonthKey(key: string): number {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

// ─── Recap stats ──────────────────────────────────────────────────────────────

export interface RecapCategoryStat {
  category: Category
  spent: number
}

export interface RecapBudgetStat {
  category: Category
  spent: number
  limit: number
  /** spent / limit, for ranking and display. */
  ratio: number
}

export interface MonthlyRecap {
  /** 'YYYY-MM' key of the summarised month. */
  monthKey: string
  /** Display label, e.g. 'August 2026'. */
  label: string
  /** True when there was no logged activity at all — caller may skip the recap. */
  isEmpty: boolean

  // Core totals
  totalSpent: number
  totalIncome: number
  netSaved: number
  /** netSaved / totalIncome, clamped to [−∞, 1]; 0 when no income. */
  savingsRate: number

  // Top category + biggest expense
  topCategory: RecapCategoryStat | null
  biggestExpense: Transaction | null
  /** All categories with positive net spend, largest first — powers the donut. */
  categoryBreakdown: RecapCategoryStat[]
  /** Net spend per ISO week of the month (index 0 = week 1) — powers the bar chart. */
  weeklySpend: number[]

  // Habit stats
  transactionCount: number
  /** Distinct days that had at least one logged transaction. */
  daysLogged: number
  /** Average spend across the whole calendar month (spent / days in month). */
  avgDailySpend: number
  /** The 'YYYY-MM-DD' with the highest net spend, and that amount. */
  busiestDay: { date: string; spent: number } | null

  // Budget adherence (only when an active plan supplied limits)
  hasBudget: boolean
  budgetCategoriesTracked: number
  budgetCategoriesUnder: number
  budgetCategoriesOver: number
  /** Categories that went over their limit, worst overage (spent − limit) first. */
  overspentCategories: RecapBudgetStat[]
  /** Net spend per 'YYYY-MM-DD' within the month, clamped to ≥0 — powers the calendar heatmap. */
  dailySpend: Record<string, number>
}

/**
 * Compute the end-of-month recap for the calendar month identified by `key`
 * ('YYYY-MM'). Pure: derives everything from the passed transactions, budget
 * limits, and custom categories — no store or clock access.
 */
export function computeMonthlyRecap(
  key: string,
  transactions: Transaction[],
  budgetLimits: BudgetLimit[],
  customCategories: CustomCategory[] = [],
): MonthlyRecap {
  const label = monthKeyLabel(key)
  const monthTxns = transactions.filter((t) => t.date.startsWith(key))

  const totalIncome = monthTxns
    .filter((t) => isEarn(t))
    .reduce((s, t) => s + t.amount, 0)

  // Net category spend — reimbursements subtract via spendAmount.
  const totalSpent = monthTxns
    .filter((t) => isSpend(t))
    .reduce((s, t) => s + spendAmount(t), 0)

  const netSaved = totalIncome - totalSpent
  const savingsRate = totalIncome > 0 ? netSaved / totalIncome : 0

  // ── Per-category net spend ──
  const spendByCat = monthTxns
    .filter((t) => isSpend(t))
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category.id] = (acc[t.category.id] ?? 0) + spendAmount(t)
      return acc
    }, {})

  // Rank categories by positive net spend (largest first) for the donut + top pick.
  const categoryBreakdown: RecapCategoryStat[] = Object.entries(spendByCat)
    .filter(([, spent]) => spent > 0)
    .map(([catId, spent]) => ({ category: resolveCategory(catId, customCategories), spent }))
    .sort((a, b) => b.spent - a.spent)
  const topCategory: RecapCategoryStat | null = categoryBreakdown[0] ?? null

  // ── Biggest single expense (real spend, not a reimbursement) ──
  const biggestExpense = monthTxns
    .filter((t) => isSpend(t) && t.isReimbursement !== true)
    .reduce<Transaction | null>((max, t) => (!max || t.amount > max.amount ? t : max), null)

  // ── Habit stats ──
  const transactionCount = monthTxns.length
  const daysLogged = new Set(monthTxns.map((t) => t.date)).size
  const avgDailySpend = totalSpent > 0 ? totalSpent / daysInMonthKey(key) : 0

  const spendByDay = monthTxns
    .filter((t) => isSpend(t))
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.date] = (acc[t.date] ?? 0) + spendAmount(t)
      return acc
    }, {})
  let busiestDay: { date: string; spent: number } | null = null
  for (const [date, spent] of Object.entries(spendByDay)) {
    if (spent <= 0) continue
    if (!busiestDay || spent > busiestDay.spent) busiestDay = { date, spent }
  }

  // Net spend bucketed into weeks-of-month (days 1–7, 8–14, 15–21, 22–28, 29+).
  // A compact 5-bar series for the recap's trend chart. Clamped at 0 so a
  // reimbursement-heavy week never renders a negative bar.
  const weeklySpend = [0, 0, 0, 0, 0]
  for (const [date, spent] of Object.entries(spendByDay)) {
    const day = parseInt(date.slice(8, 10), 10)
    const wk = Math.min(4, Math.floor((day - 1) / 7))
    weeklySpend[wk] += spent
  }
  for (let i = 0; i < weeklySpend.length; i++) weeklySpend[i] = Math.max(0, weeklySpend[i])

  // ── Budget adherence ──
  const activeLimits = budgetLimits.filter((b) => b.limit > 0)
  const hasBudget = activeLimits.length > 0
  const overspentCategories: RecapBudgetStat[] = []
  let budgetCategoriesUnder = 0
  let budgetCategoriesOver = 0
  for (const b of activeLimits) {
    const spent = spendByCat[b.categoryId] ?? 0
    const ratio = b.limit > 0 ? spent / b.limit : 0
    if (spent > b.limit) {
      budgetCategoriesOver++
      overspentCategories.push({
        category: resolveCategory(b.categoryId, customCategories),
        spent,
        limit: b.limit,
        ratio,
      })
    } else {
      budgetCategoriesUnder++
    }
  }
  overspentCategories.sort((a, b) => (b.spent - b.limit) - (a.spent - a.limit))

  const dailySpend: Record<string, number> = {}
  for (const [date, spent] of Object.entries(spendByDay)) dailySpend[date] = Math.max(0, spent)

  return {
    monthKey: key,
    label,
    isEmpty: transactionCount === 0,
    totalSpent,
    totalIncome,
    netSaved,
    savingsRate,
    topCategory,
    biggestExpense,
    categoryBreakdown,
    weeklySpend,
    transactionCount,
    daysLogged,
    avgDailySpend,
    busiestDay,
    hasBudget,
    budgetCategoriesTracked: activeLimits.length,
    budgetCategoriesUnder,
    budgetCategoriesOver,
    overspentCategories,
    dailySpend,
  }
}
