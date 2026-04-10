'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus } from '@phosphor-icons/react'
import { useStore, DEFAULT_BUDGETS } from '@/lib/store'
import { CATEGORIES } from '@/types'
import type { BudgetAllocationItem, CustomCategory } from '@/types'
import { getIconComponent } from '@/lib/iconMap'
import AddCategoryForm from './AddCategoryForm'

// ─── Config ───────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = CATEGORIES.filter(
  (c) => c.id !== 'income' && c.id !== 'other'
)

const SUGGESTED_NAMES = ['Regular Month', 'Tight Month', 'Vacation Mode', 'Savings Mode']

function buildDefaultItems(customCats: CustomCategory[] = []): BudgetAllocationItem[] {
  const presetItems = EXPENSE_CATEGORIES.map((cat) => ({
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

type Step = 0 | 1 | 2

const STEP_COUNT = 3

// ─── Motion variants ──────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingBudgetSetup() {
  const saveBudgetAllocation = useStore((s) => s.saveBudgetAllocation)
  const hasSetupBudget = useStore((s) => s.hasSetupBudget)
  const customCategories = useStore((s) => s.customCategories)
  const storeAddCustomCategory = useStore((s) => s.addCustomCategory)
  const userId = useStore((s) => s.userId)

  const [dismissed, setDismissed] = useState(false)
  const [step, setStep] = useState<Step>(0)
  const [direction, setDirection] = useState(1)
  const [planName, setPlanName] = useState('')
  const [items, setItems] = useState<BudgetAllocationItem[]>(() => buildDefaultItems())
  const [saving, setSaving] = useState(false)
  const [showAddCatForm, setShowAddCatForm] = useState(false)
  const [savingCustomCat, setSavingCustomCat] = useState(false)

  if (dismissed || hasSetupBudget()) return null

  function advance() {
    setDirection(1)
    setStep((s) => (Math.min(s + 1, 2) as Step))
  }

  function back() {
    setDirection(-1)
    setStep((s) => (Math.max(s - 1, 0) as Step))
  }

  function pickSuggestedName(name: string) {
    setPlanName(name)
  }

  function handleLimitChange(categoryId: string, raw: string) {
    const num = parseFloat(raw.replace(/[^0-9.]/g, '')) || 0
    setItems((prev) =>
      prev.map((item) =>
        item.categoryId === categoryId ? { ...item, limit: num } : item
      )
    )
  }

  async function handleAddCustomCategory(
    name: string,
    icon: string,
    textColor: string,
    bgColor: string
  ) {
    if (!userId) return
    setSavingCustomCat(true)
    try {
      const newCat = await storeAddCustomCategory(userId, name, icon, textColor, bgColor)
      setItems((prev) => [...prev, { categoryId: newCat.id, limit: 0 }])
      setShowAddCatForm(false)
    } finally {
      setSavingCustomCat(false)
    }
  }

  function removeFromItems(categoryId: string) {
    setItems((prev) => prev.filter((i) => i.categoryId !== categoryId))
  }

  async function handleFinish(skipToDefaults = false) {
    setSaving(true)
    const name = skipToDefaults ? 'Regular Month' : planName.trim() || 'Regular Month'
    const finalItems = skipToDefaults ? buildDefaultItems() : items
    await saveBudgetAllocation({ name, items: finalItems })
    setSaving(false)
    setDismissed(true)
  }

  return (
    <motion.div
      className="fixed inset-0 z-60 flex flex-col"
      style={{ background: '#f8faf9' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28 }}
    >
      {/* Skip button */}
      <div
        className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top,0px)+16px)]"
      >
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

      {/* Step content */}
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {step === 0 && (
            <motion.div
              key="welcome"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="absolute inset-0 flex flex-col justify-center px-6"
            >
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: '#6e9990' }}>
                LedgeIt
              </p>
              <h1 className="mb-3 text-2xl font-bold leading-tight tracking-tight" style={{ color: '#00352e' }}>
                Set your<br />spending limits
              </h1>
              <p className="mb-10 text-sm leading-relaxed" style={{ color: '#6e9990' }}>
                Create a named budget plan with per-category limits. You can always switch plans or add new ones later.
              </p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={advance}
                className="w-full rounded-2xl py-4 text-sm font-bold"
                style={{
                  background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)',
                  color: '#ffffff',
                }}
              >
                Get Started
              </motion.button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="name"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="absolute inset-0 flex flex-col px-6 pt-8"
            >
              <h2 className="mb-1 text-xl font-bold" style={{ color: '#00352e' }}>
                Name your plan
              </h2>
              <p className="mb-6 text-sm" style={{ color: '#6e9990' }}>
                Give this budget a descriptive name so you can identify it later.
              </p>

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

              {/* Suggested name chips */}
              <div className="mb-8 flex flex-wrap gap-2">
                {SUGGESTED_NAMES.map((name) => (
                  <motion.button
                    key={name}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => pickSuggestedName(name)}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold"
                    style={{
                      background: planName === name ? '#1f695d' : '#f0f4f2',
                      color: planName === name ? '#ffffff' : '#3f4946',
                    }}
                  >
                    {name}
                  </motion.button>
                ))}
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={back}
                  className="flex-1 rounded-xl py-3.5 text-sm font-semibold"
                  style={{ background: '#f0f4f2', color: '#3f4946' }}
                >
                  Back
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={advance}
                  disabled={!planName.trim()}
                  className="flex-2 grow rounded-xl py-3.5 text-sm font-bold disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)',
                    color: '#ffffff',
                  }}
                >
                  Continue
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
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
              <div className="px-6 pb-4 pt-8">
                <h2 className="mb-1 text-xl font-bold" style={{ color: '#00352e' }}>
                  Set monthly limits
                </h2>
                <p className="text-sm" style={{ color: '#6e9990' }}>
                  Pre-filled with sensible defaults. Adjust as needed.
                </p>
              </div>

              {/* Scrollable category rows */}
              <div className="flex-1 overflow-y-auto px-6 pb-4">
                <div className="flex flex-col gap-2">
                  {items.map((item) => {
                    const { label, icon, colorClass, isCustom } = getCatDisplay(item.categoryId, customCategories)
                    const Icon = getIconComponent(icon)
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
                        <span className="flex-1 text-xs font-semibold" style={{ color: '#191c1c' }}>
                          {label}
                        </span>
                        <div className="flex items-center gap-1">
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
                            style={{
                              background: '#ffffff',
                              color: '#191c1c',
                              border: '1px solid #cde0db',
                            }}
                          />
                        </div>
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
                    <AddCategoryForm
                      key="form"
                      onConfirm={handleAddCustomCategory}
                      onCancel={() => setShowAddCatForm(false)}
                      saving={savingCustomCat}
                    />
                  ) : (
                    <motion.button
                      key="btn"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setShowAddCatForm(true)}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5"
                      style={{
                        border: '1.5px dashed #cde0db',
                        background: 'transparent',
                        color: '#1f695d',
                      }}
                    >
                      <Plus size={12} weight="bold" aria-hidden="true" />
                      <span className="text-xs font-semibold">Add Category</span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div
                className="flex gap-3 px-6 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-4"
                style={{ borderTop: '1px solid #e7edeb' }}
              >
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={back}
                  className="flex-1 rounded-xl py-3.5 text-sm font-semibold"
                  style={{ background: '#f0f4f2', color: '#3f4946' }}
                >
                  Back
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleFinish(false)}
                  disabled={saving}
                  className="flex-2 grow rounded-xl py-3.5 text-sm font-bold disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)',
                    color: '#ffffff',
                  }}
                >
                  {saving ? 'Saving…' : 'Save & Start Tracking'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
