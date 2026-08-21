'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Plus,
  Briefcase, Laptop, Buildings, TrendUp, House,
  Bank, ArrowsLeftRight, ShieldCheck, DotsThree,
} from '@phosphor-icons/react'
import { useStore, DEFAULT_BUDGETS } from '@/lib/store'
import { CATEGORIES } from '@/types'
import type { BudgetAllocationItem, CustomCategory } from '@/types'
import { getIconComponent } from '@/lib/iconMap'
import { formatCurrency } from '@/lib/formatters'
import { PLAN_TEMPLATES } from '@/lib/budgetTemplates'
import AddCategoryForm from './AddCategoryForm'

// ─── Config ───────────────────────────────────────────────────────────────────

// Budgetable categories exclude income, the "other" catch-all, and the
// non-spending categories (debts + transfers move money between your own
// pockets, so they aren't budgeted).
const EXPENSE_CATEGORIES = CATEGORIES.filter(
  (c) => c.id !== 'income' && c.id !== 'other' && c.id !== 'debts' && c.id !== 'transfers'
)

const INCOME_SOURCES = [
  { id: 'salary',      label: 'Salary / Employment',    description: 'Monthly wages or fixed employment pay',       Icon: Briefcase },
  { id: 'freelance',   label: 'Freelance / Side Hustle', description: 'Project-based or part-time work',             Icon: Laptop },
  { id: 'business',    label: 'Business Revenue',        description: 'Income from your own business operations',    Icon: Buildings },
  { id: 'inv_returns', label: 'Investment Returns',      description: 'Dividends, stocks, UITF, MP2, ETF earnings',  Icon: TrendUp },
  { id: 'rental',      label: 'Rental Income',           description: 'From property, space, or equipment leasing',  Icon: House },
  { id: 'bonds',       label: 'Bonds & Interest',        description: 'Time deposits, bonds, bank savings interest', Icon: Bank },
  { id: 'remittance',  label: 'Remittance',              description: 'Money received from family abroad',           Icon: ArrowsLeftRight },
  { id: 'pension',     label: 'Pension / Benefits',      description: 'SSS, GSIS, PhilHealth, or government aid',    Icon: ShieldCheck },
  { id: 'other_inc',   label: 'Other Income',            description: 'Any other income sources',                    Icon: DotsThree },
]

/** Round to at most 2 decimal places (percentages allow fractional splits). */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function buildDefaultItems(customCats: CustomCategory[] = [], hiddenIds: string[] = []): BudgetAllocationItem[] {
  const presetItems = EXPENSE_CATEGORIES
    .filter((cat) => !hiddenIds.includes(cat.id))
    .map((cat) => ({
      categoryId: cat.id,
      limit: DEFAULT_BUDGETS.find((b) => b.categoryId === cat.id)?.limit ?? 0,
    }))
  const customItems = customCats.map((cat) => ({ categoryId: cat.id, limit: 0 }))
  return [...presetItems, ...customItems]
}

function getCatDisplay(
  categoryId: string,
  customCats: CustomCategory[]
): { label: string; icon: string; colorClass: string; isCustom: boolean } {
  const preset = EXPENSE_CATEGORIES.find((c) => c.id === categoryId)
  if (preset) return { label: preset.label, icon: preset.icon, colorClass: preset.color, isCustom: false }
  const custom = customCats.find((c) => c.id === categoryId)
  if (custom) return { label: custom.name, icon: custom.icon, colorClass: custom.textColor, isCustom: true }
  return { label: '?', icon: 'DotsThree', colorClass: 'text-slate-500', isCustom: false }
}

type Step = 0 | 1 | 2 | 3
const STEP_COUNT = 4

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
}

// ─── Step progress dots ───────────────────────────────────────────────────────

function StepDots({ step }: { step: Step }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: STEP_COUNT }).map((_, i) => (
        <div
          key={i}
          className="h-1 rounded-full transition-all duration-300"
          style={{
            width: i === step ? '20px' : '8px',
            background: i === step ? '#1f695d' : '#cde0db',
          }}
        />
      ))}
    </div>
  )
}

// ─── Welcome step sidebar (desktop only) ─────────────────────────────────────

function WelcomeSidebar({ step }: { step: Step }) {
  const items = [
    { n: 1, label: 'Name your plan', active: step >= 1 },
    { n: 2, label: 'Monthly income', active: step >= 2 },
    { n: 3, label: 'Set limits',     active: step >= 3 },
  ]
  return (
    <div
      className="hidden md:flex flex-col justify-between rounded-2xl p-8"
      style={{ background: 'linear-gradient(160deg, #001e18 0%, #00352e 60%, #1a6358 100%)', minWidth: 240, maxWidth: 280 }}
    >
      <div>
        <span className="font-mono text-[13px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>LedgeIt</span>
        <h2 className="mt-6 text-[1.35rem] font-bold leading-snug" style={{ color: '#ffffff' }}>
          Set up your<br />budget plan
        </h2>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.50)' }}>
          Takes about 2 minutes. You can always change it later.
        </p>

        <div className="mt-10 flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.n} className="flex items-center gap-3">
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors duration-300"
                style={{
                  background: item.active ? '#1f695d' : 'rgba(255,255,255,0.10)',
                  color: '#ffffff',
                }}
              >
                {item.n}
              </div>
              <span
                className="text-[13px] font-semibold transition-colors duration-300"
                style={{ color: item.active ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.38)' }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
        Free to start · No credit card
      </p>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingBudgetSetup() {
  const saveBudgetAllocation = useStore((s) => s.saveBudgetAllocation)
  const saveIncomeAllocation = useStore((s) => s.saveIncomeAllocation)
  const hasSetupBudget       = useStore((s) => s.hasSetupBudget)
  const customCategories     = useStore((s) => s.customCategories)
  const hiddenCategories     = useStore((s) => s.hiddenCategories)
  const storeAddCustomCategory = useStore((s) => s.addCustomCategory)
  const userId               = useStore((s) => s.userId)
  const budgetAllocationsLoaded = useStore((s) => s.budgetAllocationsLoaded)

  const [dismissed,       setDismissed]       = useState(false)
  const [step,            setStep]            = useState<Step>(0)
  const [direction,       setDirection]       = useState(1)
  const [planName,        setPlanName]        = useState('')
  const [items,           setItems]           = useState<BudgetAllocationItem[]>(() => buildDefaultItems())
  const [saving,          setSaving]          = useState(false)
  const [showAddCatForm,  setShowAddCatForm]  = useState(false)
  const [savingCustomCat, setSavingCustomCat] = useState(false)
  const [addCatError,     setAddCatError]     = useState<string | null>(null)
  const [totalBudget,     setTotalBudget]     = useState(0)
  const [allocationMode,  setAllocationMode]  = useState<'amount' | 'percent'>('amount')
  const [percents,        setPercents]        = useState<Record<string, number>>({})
  // Raw text of the percent field being actively edited, so a trailing "." or
  // mid-decimal entry (e.g. "12.") isn't stripped by the numeric state round-trip.
  const [percentDraft,    setPercentDraft]    = useState<{ id: string; text: string } | null>(null)
  const [incomeAmounts,   setIncomeAmounts]   = useState<Record<string, number>>({})

  if (dismissed || !userId || !budgetAllocationsLoaded || hasSetupBudget()) return null

  function advance() {
    setDirection(1)
    if (step === 2) {
      const total = Object.values(incomeAmounts).reduce((s, v) => s + v, 0)
      if (total > 0) setTotalBudget(total)
    }
    setStep((s) => (Math.min(s + 1, 3) as Step))
  }

  function back() {
    setDirection(-1)
    setStep((s) => (Math.max(s - 1, 0) as Step))
  }

  function pickSuggestedName(name: string) {
    setPlanName(name)
    const template = PLAN_TEMPLATES.find((t) => t.label === name)
    if (!template) return
    const newPercents: Record<string, number> = {}
    items.forEach((item) => { newPercents[item.categoryId] = template.percents[item.categoryId] ?? 0 })
    setPercents(newPercents)
    if (totalBudget > 0) {
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          limit: Math.round(((newPercents[item.categoryId] ?? 0) / 100) * totalBudget),
        }))
      )
    }
    setAllocationMode('percent')
  }

  function handleLimitChange(categoryId: string, raw: string) {
    const num = parseFloat(raw.replace(/[^0-9.]/g, '')) || 0
    setItems((prev) =>
      prev.map((item) => item.categoryId === categoryId ? { ...item, limit: num } : item)
    )
  }

  async function handleAddCustomCategory(name: string, icon: string, textColor: string, bgColor: string) {
    setAddCatError(null)
    let uid = userId
    if (!uid) {
      const { createClient: mkClient } = await import('@/lib/supabase/client')
      const { data } = await mkClient().auth.getUser()
      uid = data.user?.id ?? null
    }
    if (!uid) { setAddCatError('Not signed in. Please refresh and try again.'); return }
    setSavingCustomCat(true)
    try {
      const newCat = await storeAddCustomCategory(uid, name, icon, textColor, bgColor)
      setItems((prev) => [...prev, { categoryId: newCat.id, limit: 0 }])
      setPercents((prev) => ({ ...prev, [newCat.id]: 0 }))
      setShowAddCatForm(false)
    } catch (err) {
      setAddCatError(err instanceof Error ? err.message : 'Failed to add category')
    } finally {
      setSavingCustomCat(false)
    }
  }

  function removeFromItems(categoryId: string) {
    setItems((prev) => prev.filter((i) => i.categoryId !== categoryId))
    setPercents((prev) => { const next = { ...prev }; delete next[categoryId]; return next })
  }

  function handleTotalBudgetChange(raw: string) {
    const num = parseFloat(raw.replace(/[^0-9.]/g, '')) || 0
    setTotalBudget(num)
    if (allocationMode === 'percent') {
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          limit: Math.round(((percents[item.categoryId] ?? 0) / 100) * num),
        }))
      )
    }
  }

  function handleModeToggle(mode: 'amount' | 'percent') {
    if (mode === allocationMode) return
    setPercentDraft(null)
    if (mode === 'percent') {
      const base = totalBudget > 0 ? totalBudget : items.reduce((s, i) => s + i.limit, 0)
      if (totalBudget === 0) setTotalBudget(base)
      setPercents(
        Object.fromEntries(
          items.map((i) => [i.categoryId, base > 0 ? round2((i.limit / base) * 100) : 0])
        )
      )
    }
    setAllocationMode(mode)
  }

  function handlePercentChange(categoryId: string, raw: string) {
    // Keep only digits and a single decimal point, capped at 2 decimal places.
    let cleaned = raw.replace(/[^0-9.]/g, '')
    const firstDot = cleaned.indexOf('.')
    if (firstDot !== -1) {
      cleaned =
        cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
      const [whole, dec] = cleaned.split('.')
      cleaned = `${whole}.${(dec ?? '').slice(0, 2)}`
    }
    setPercentDraft({ id: categoryId, text: cleaned })
    const num = Math.max(0, Math.min(100, round2(parseFloat(cleaned) || 0)))
    setPercents((prev) => ({ ...prev, [categoryId]: num }))
    setItems((prev) =>
      prev.map((item) =>
        item.categoryId === categoryId
          ? { ...item, limit: Math.round((num / 100) * totalBudget) }
          : item
      )
    )
  }

  async function handleFinish(skipToDefaults = false) {
    setSaving(true)
    const name       = skipToDefaults ? 'Regular Month' : planName.trim() || 'Regular Month'
    const finalItems = skipToDefaults ? buildDefaultItems(customCategories, hiddenCategories) : items
    await saveBudgetAllocation({ name, items: finalItems })
    const incomeItems = Object.entries(incomeAmounts)
      .filter(([, v]) => v > 0)
      .map(([sourceId, amount]) => ({ sourceId, amount }))
    if (incomeItems.length > 0) await saveIncomeAllocation({ name, items: incomeItems })
    setSaving(false)
    setDismissed(true)
  }

  // ─── Shared nav buttons ───────────────────────────────────────────────────

  function NavButtons({ canContinue = true, continueLabel = 'Continue' }: { canContinue?: boolean; continueLabel?: string }) {
    return (
      <div
        className="flex gap-3 px-5 pb-5 pt-4 md:px-8 md:pb-8"
        style={{ borderTop: '1px solid #e7edeb' }}
      >
        {step > 0 && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={back}
            className="flex-1 rounded-xl py-3.5 text-sm font-semibold"
            style={{ background: '#f0f4f2', color: '#3f4946' }}
          >
            Back
          </motion.button>
        )}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={step === 3 ? () => handleFinish(false) : advance}
          disabled={!canContinue || saving}
          className="flex-2 grow rounded-xl py-3.5 text-sm font-bold disabled:opacity-40"
          style={{
            background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)',
            color: '#ffffff',
          }}
        >
          {step === 3 ? (saving ? 'Saving…' : 'Save & Start Tracking') : continueLabel}
        </motion.button>
      </div>
    )
  }

  return (
    <motion.div
      className="fixed inset-0 z-60 flex items-center justify-center"
      style={{ background: '#f8faf9' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28 }}
    >
      {/*
        Mobile: full-screen, no inner container.
        Desktop: centered card with sidebar.
        We use a wrapper that's full-height on mobile and auto on md+.
      */}
      <div
        className="
          flex flex-col w-full h-full
          md:flex-row md:h-auto md:w-auto md:max-w-3xl md:rounded-2xl md:overflow-hidden md:shadow-[0_20px_56px_rgba(0,40,32,0.22),0_4px_16px_rgba(0,53,46,0.12)]
        "
        style={{ background: '#ffffff' }}
      >
        {/* Desktop sidebar */}
        <WelcomeSidebar step={step} />

        {/* Main content area */}
        <div className="flex flex-col flex-1 min-h-0" style={{ background: '#f8faf9' }}>
          {/* Top bar: dots + skip */}
          <div className="flex items-center justify-between px-5 pt-5 md:px-8 md:pt-8">
            <StepDots step={step} />
            <motion.button
              aria-label="Skip onboarding — use defaults"
              whileTap={{ scale: 0.88 }}
              onClick={() => handleFinish(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: '#f0f4f2' }}
            >
              <X size={14} weight="bold" style={{ color: '#6e9990' }} aria-hidden="true" />
            </motion.button>
          </div>

          {/* Slide content */}
          <div className="relative flex-1 overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>

              {/* ── Step 0: Welcome ── */}
              {step === 0 && (
                <motion.div
                  key="welcome"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                  className="absolute inset-0 flex flex-col justify-center px-5 md:px-8"
                >
                  <h1 className="mb-3 text-2xl font-bold leading-tight tracking-tight" style={{ color: '#00352e' }}>
                    Set your<br />spending limits
                  </h1>
                  <p className="mb-10 text-sm leading-relaxed max-w-sm" style={{ color: '#6e9990' }}>
                    Create a named budget plan with per-category limits. You can always switch plans or add new ones later.
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={advance}
                    className="w-full rounded-2xl py-4 text-sm font-bold md:w-auto md:self-start md:px-10"
                    style={{
                      background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)',
                      color: '#ffffff',
                    }}
                  >
                    Get Started
                  </motion.button>
                </motion.div>
              )}

              {/* ── Step 1: Name ── */}
              {step === 1 && (
                <motion.div
                  key="name"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                  className="absolute inset-0 flex flex-col"
                >
                  <div className="px-5 pt-6 pb-4 md:px-8">
                    <h2 className="mb-1 text-xl font-bold" style={{ color: '#00352e' }}>Name your plan</h2>
                    <p className="text-sm" style={{ color: '#6e9990' }}>
                      Give this budget a name so you can identify it later.
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 pb-2 md:px-8">
                    <input
                      type="text"
                      maxLength={48}
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      placeholder="E.g. Regular Month"
                      autoFocus
                      className="mb-4 w-full rounded-xl px-4 py-3.5 text-base font-semibold outline-none"
                      style={{
                        background: '#f0f4f2',
                        color: '#191c1c',
                        border: '1.5px solid transparent',
                      }}
                      onFocus={(e) => (e.currentTarget.style.border = '1.5px solid #1f695d')}
                      onBlur={(e) => (e.currentTarget.style.border = '1.5px solid transparent')}
                    />

                    {/* Template cards: 1-col mobile, 2-col desktop */}
                    <div className="grid gap-2 md:grid-cols-2">
                      {PLAN_TEMPLATES.map((t) => (
                        <motion.button
                          key={t.label}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => pickSuggestedName(t.label)}
                          className="flex items-start gap-3 rounded-2xl px-4 py-3 text-left transition-all"
                          style={{
                            background: planName === t.label ? 'rgba(31,105,93,0.08)' : '#f0f4f2',
                            border: planName === t.label ? '1.5px solid #1f695d' : '1.5px solid transparent',
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold" style={{ color: '#00352e' }}>{t.label}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: '#6e9990' }}>{t.description}</p>
                          </div>
                          {planName === t.label && (
                            <div className="h-4 w-4 shrink-0 mt-0.5 rounded-full flex items-center justify-center" style={{ background: '#1f695d' }}>
                              <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                                <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <NavButtons canContinue={!!planName.trim()} />
                </motion.div>
              )}

              {/* ── Step 2: Income ── */}
              {step === 2 && (
                <motion.div
                  key="income"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                  className="absolute inset-0 flex flex-col"
                >
                  <div className="px-5 pt-6 pb-4 md:px-8">
                    <h2 className="mb-1 text-xl font-bold" style={{ color: '#00352e' }}>Monthly income</h2>
                    <p className="text-sm" style={{ color: '#6e9990' }}>
                      Enter expected amounts per source. The total becomes your monthly budget.
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 pb-4 md:px-8">
                    {/* Income rows: 1-col mobile, 2-col desktop */}
                    <div className="grid gap-2 md:grid-cols-2">
                      {INCOME_SOURCES.map(({ id, label, description, Icon }) => (
                        <div
                          key={id}
                          className="flex items-center gap-3 rounded-xl px-4 py-3"
                          style={{ background: '#f0f4f2' }}
                        >
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                            style={{ background: '#e7edeb' }}
                          >
                            <Icon size={15} weight="duotone" style={{ color: '#1f695d' }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold" style={{ color: '#191c1c' }}>{label}</p>
                            <p className="text-[10px]" style={{ color: '#6e9990' }}>{description}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <span className="font-mono text-xs font-semibold" style={{ color: '#6e9990' }}>₱</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              aria-label={`${label} amount`}
                              value={incomeAmounts[id] || ''}
                              onChange={(e) => {
                                const num = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0
                                setIncomeAmounts((prev) => ({ ...prev, [id]: num }))
                              }}
                              placeholder="0"
                              className="w-24 rounded-lg px-2 py-1.5 text-right font-mono text-sm font-semibold outline-none"
                              style={{ background: '#ffffff', color: '#191c1c', border: '1px solid #cde0db' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {Object.values(incomeAmounts).reduce((s, v) => s + v, 0) > 0 && (
                      <div
                        className="mt-4 flex items-center justify-between rounded-xl px-4 py-3"
                        style={{ background: 'rgba(31,105,93,0.06)' }}
                      >
                        <span className="text-xs font-bold" style={{ color: '#1f695d' }}>Total Monthly Income</span>
                        <span className="font-mono text-sm font-bold" style={{ color: '#00352e' }}>
                          {formatCurrency(Object.values(incomeAmounts).reduce((s, v) => s + v, 0))}
                        </span>
                      </div>
                    )}
                  </div>

                  <NavButtons />
                </motion.div>
              )}

              {/* ── Step 3: Limits ── */}
              {step === 3 && (
                <motion.div
                  key="limits"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                  className="absolute inset-0 flex flex-col"
                >
                  <div className="px-5 pt-6 pb-3 md:px-8">
                    <h2 className="mb-1 text-xl font-bold" style={{ color: '#00352e' }}>Set monthly limits</h2>
                    <p className="mb-4 text-sm" style={{ color: '#6e9990' }}>
                      Pre-filled with sensible defaults. Adjust as needed.
                    </p>

                    {/* Total budget + mode toggle in one row on desktop */}
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                      <div
                        className="flex flex-1 items-center gap-2 rounded-xl px-4 py-3"
                        style={{ background: '#f0f4f2' }}
                      >
                        <label htmlFor="ob-total-budget" className="font-mono text-sm font-semibold shrink-0" style={{ color: '#6e9990' }}>₱</label>
                        <input
                          id="ob-total-budget"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1000}
                          value={totalBudget === 0 ? '' : totalBudget}
                          onChange={(e) => handleTotalBudgetChange(e.target.value)}
                          placeholder="Total monthly budget"
                          className="flex-1 bg-transparent font-mono text-sm font-semibold outline-none"
                          style={{ color: '#191c1c' }}
                        />
                      </div>

                      <div className="flex rounded-xl p-1 shrink-0" style={{ background: '#f0f4f2' }}>
                        {(['amount', 'percent'] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => handleModeToggle(mode)}
                            className="flex-1 rounded-lg py-2 px-4 text-xs font-bold transition-colors"
                            style={{
                              background: allocationMode === mode ? '#ffffff' : 'transparent',
                              color: allocationMode === mode ? '#00352e' : '#6e9990',
                              boxShadow: allocationMode === mode ? '0 1px 4px rgba(0,53,46,0.10)' : 'none',
                            }}
                          >
                            {mode === 'amount' ? '₱ Amount' : '% Percent'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Scrollable category rows */}
                  <div className="flex-1 overflow-y-auto px-5 pb-2 md:px-8">
                    {/* Allocation summary */}
                    {(() => {
                      const totalAllocated =
                        allocationMode === 'percent'
                          ? Object.values(percents).reduce((s, p) => s + p, 0)
                          : items.reduce((s, i) => s + i.limit, 0)
                      const isOver =
                        allocationMode === 'percent'
                          ? totalAllocated > 100
                          : totalBudget > 0 && totalAllocated > totalBudget
                      return (
                        <div className="mb-3 flex items-center justify-end">
                          <span className="font-mono text-[11px] font-semibold" style={{ color: isOver ? '#ba1a1a' : '#1f695d' }}>
                            {allocationMode === 'percent'
                              ? `${round2(totalAllocated)}% allocated`
                              : totalBudget > 0
                                ? `${formatCurrency(totalAllocated)} / ${formatCurrency(totalBudget)}`
                                : formatCurrency(totalAllocated)}
                          </span>
                        </div>
                      )
                    })()}

                    {/* 1-col mobile, 2-col desktop */}
                    <div className="grid gap-2 md:grid-cols-2">
                      {items.map((item) => {
                        const { label, icon, colorClass, isCustom } = getCatDisplay(item.categoryId, customCategories)
                        const Icon = getIconComponent(icon)
                        const pct = percents[item.categoryId] ?? 0
                        return (
                          <div
                            key={item.categoryId}
                            className="flex items-center gap-3 rounded-xl px-4 py-3"
                            style={{ background: '#f0f4f2' }}
                          >
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                              style={{ background: '#e7edeb' }}
                            >
                              <Icon size={15} weight="duotone" className={colorClass} aria-hidden="true" />
                            </div>
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold" style={{ color: '#191c1c' }}>
                              {label}
                            </span>
                            {allocationMode === 'amount' ? (
                              <div className="flex shrink-0 items-center gap-1">
                                <span className="font-mono text-xs font-semibold" style={{ color: '#6e9990' }}>₱</span>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  step={100}
                                  aria-label={`${label} monthly limit`}
                                  value={item.limit === 0 ? '' : item.limit}
                                  onChange={(e) => handleLimitChange(item.categoryId, e.target.value)}
                                  placeholder="0"
                                  className="w-24 rounded-lg px-2 py-1.5 text-right font-mono text-sm font-semibold outline-none"
                                  style={{ background: '#ffffff', color: '#191c1c', border: '1px solid #cde0db' }}
                                />
                              </div>
                            ) : (
                              <div className="flex shrink-0 flex-col items-end gap-0.5">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    aria-label={`${label} budget percentage`}
                                    value={
                                      percentDraft?.id === item.categoryId
                                        ? percentDraft.text
                                        : pct === 0 ? '' : pct
                                    }
                                    onChange={(e) => handlePercentChange(item.categoryId, e.target.value)}
                                    onBlur={() => setPercentDraft(null)}
                                    placeholder="0"
                                    className="w-16 rounded-lg px-2 py-1.5 text-right font-mono text-sm font-semibold outline-none"
                                    style={{ background: '#ffffff', color: '#191c1c', border: '1px solid #cde0db' }}
                                  />
                                  <span className="font-mono text-xs font-semibold" style={{ color: '#6e9990' }}>%</span>
                                </div>
                                {totalBudget > 0 && (
                                  <span className="font-mono text-[10px]" style={{ color: '#6e9990' }}>
                                    ≈ {formatCurrency(item.limit)}
                                  </span>
                                )}
                              </div>
                            )}
                            {isCustom && (
                              <motion.button
                                aria-label={`Remove ${label}`}
                                whileTap={{ scale: 0.85 }}
                                onClick={() => removeFromItems(item.categoryId)}
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                                style={{ background: '#e7edeb' }}
                              >
                                <X size={10} weight="bold" style={{ color: '#ba1a1a' }} aria-hidden="true" />
                              </motion.button>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Add custom category */}
                    <AnimatePresence mode="wait">
                      {showAddCatForm ? (
                        <>
                          <AddCategoryForm
                            key="form"
                            onConfirm={handleAddCustomCategory}
                            onCancel={() => { setShowAddCatForm(false); setAddCatError(null) }}
                            saving={savingCustomCat}
                          />
                          {addCatError && (
                            <p className="mt-2 rounded-xl px-3 py-2 text-[11px] font-semibold" style={{ background: '#ffeaea', color: '#ba1a1a' }}>
                              {addCatError}
                            </p>
                          )}
                        </>
                      ) : (
                        <motion.button
                          key="btn"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setShowAddCatForm(true)}
                          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5"
                          style={{ border: '1.5px dashed #cde0db', background: 'transparent', color: '#1f695d' }}
                        >
                          <Plus size={12} weight="bold" aria-hidden="true" />
                          <span className="text-xs font-semibold">Add Category</span>
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>

                  <NavButtons />
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </div>
      </div>
    </motion.div>
  )
}
