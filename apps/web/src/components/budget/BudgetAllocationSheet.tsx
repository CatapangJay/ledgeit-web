'use client'

import { useState, useId } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ArrowLeft,
  Check,
  PencilSimple,
  Trash,
  Plus,
  Sparkle,
  EyeSlash,
  ArrowsLeftRight,
  Warning,
} from '@phosphor-icons/react'
import { useStore } from '@/lib/store'
import { DEFAULT_BUDGETS } from '@/lib/store'
import { useIsDesktop } from '@/lib/useIsDesktop'
import { CATEGORIES, isHideableCategory } from '@/types'
import type { BudgetAllocationItem, CustomCategory } from '@/types'
import { formatCurrency } from '@/lib/formatters'
import { getIconComponent } from '@/lib/iconMap'
import { PLAN_TEMPLATES } from '@/lib/budgetTemplates'
import AddCategoryForm from './AddCategoryForm'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
}

type View = 'list' | 'editor'

// ─── Expense categories (no income / other) ───────────────────────────────────

const EXPENSE_CATEGORIES = CATEGORIES.filter(
  (c) => c.id !== 'income' && c.id !== 'other'
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Round to at most 2 decimal places (percentages allow fractional splits). */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Merge existing allocation items with all known categories, filling missing with 0.
 *  Hidden presets are dropped unless the saved plan already allocates to them. */
function buildEditorItems(
  existingItems: BudgetAllocationItem[],
  customCats: CustomCategory[],
  hiddenIds: string[] = []
): BudgetAllocationItem[] {
  const result: BudgetAllocationItem[] = []
  for (const cat of EXPENSE_CATEGORIES) {
    const found = existingItems.find((i) => i.categoryId === cat.id)
    if (hiddenIds.includes(cat.id) && !found) continue
    result.push({
      categoryId: cat.id,
      limit: found?.limit ?? DEFAULT_BUDGETS.find((b) => b.categoryId === cat.id)?.limit ?? 0,
    })
  }
  for (const cat of customCats) {
    const found = existingItems.find((i) => i.categoryId === cat.id)
    result.push({ categoryId: cat.id, limit: found?.limit ?? 0 })
  }
  return result
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

// ─── Sheet variants ───────────────────────────────────────────────────────────

const sheetVariants = {
  hidden: { y: '100%', opacity: 0.6 },
  visible: { y: 0, opacity: 1 },
  exit: { y: '100%', opacity: 0.6 },
}

const viewVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BudgetAllocationSheet({ open, onClose }: Props) {
  const labelId = useId()
  const isDesktop = useIsDesktop()
  const router = useRouter()

  const allocations = useStore((s) => s.budgetAllocations)
  const saveBudgetAllocation = useStore((s) => s.saveBudgetAllocation)
  const activateAllocation = useStore((s) => s.activateAllocation)
  const deleteAllocation = useStore((s) => s.deleteAllocation)
  const customCategories = useStore((s) => s.customCategories)
  const hiddenCategories = useStore((s) => s.hiddenCategories)
  const hidePresetCategory = useStore((s) => s.hidePresetCategory)
  const removeCustomCategory = useStore((s) => s.removeCustomCategory)
  const transactions = useStore((s) => s.transactions)
  const storeAddCustomCategory = useStore((s) => s.addCustomCategory)
  const userId = useStore((s) => s.userId)

  // The category the user is trying to hide, held while we confirm / warn about
  // its logged transactions. null when no hide is in progress.
  const [hideTarget, setHideTarget] = useState<string | null>(null)

  const [view, setView] = useState<View>('list')
  const [direction, setDirection] = useState(1)

  // Editor state
  const [editId, setEditId] = useState<string | undefined>(undefined)
  const [planName, setPlanName] = useState('')
  const [items, setItems] = useState<BudgetAllocationItem[]>(() => buildEditorItems([], []))
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [showAddCatForm, setShowAddCatForm] = useState(false)
  const [savingCustomCat, setSavingCustomCat] = useState(false)
  const [addCatError, setAddCatError] = useState<string | null>(null)
  const [totalBudget, setTotalBudget] = useState(0)
  const [allocationMode, setAllocationMode] = useState<'amount' | 'percent'>('amount')
  const [percents, setPercents] = useState<Record<string, number>>({})
  // Raw text of the percent field being actively edited, so a trailing "." or
  // "." mid-decimal (e.g. "12.") isn't stripped by the numeric state round-trip.
  const [percentDraft, setPercentDraft] = useState<{ id: string; text: string } | null>(null)

  function openEditor(id?: string) {
    let newItems: BudgetAllocationItem[]
    if (id) {
      const alloc = allocations.find((a) => a.id === id)
      if (!alloc) return
      setPlanName(alloc.name)
      newItems = buildEditorItems(alloc.items, customCategories, hiddenCategories)
      setEditId(id)
    } else {
      setPlanName('')
      newItems = buildEditorItems([], customCategories, hiddenCategories)
      setEditId(undefined)
    }
    setItems(newItems)
    const total = newItems.reduce((s, i) => s + i.limit, 0)
    setTotalBudget(total)
    setAllocationMode('amount')
    setPercents(
      Object.fromEntries(
        newItems.map((i) => [
          i.categoryId,
          total > 0 ? round2((i.limit / total) * 100) : 0,
        ])
      )
    )
    setShowAddCatForm(false)
    setPercentDraft(null)
    setDirection(1)
    setView('editor')
  }

  function backToList() {
    setDirection(-1)
    setView('list')
    setDeleteConfirm(null)
  }

  function handleLimitChange(categoryId: string, raw: string) {
    const num = parseFloat(raw.replace(/[^0-9.]/g, '')) || 0
    setItems((prev) =>
      prev.map((item) =>
        item.categoryId === categoryId ? { ...item, limit: num } : item
      )
    )
  }

  async function handleSave() {
    if (!planName.trim()) return
    setSaving(true)
    await saveBudgetAllocation({ id: editId, name: planName.trim(), items })
    setSaving(false)
    backToList()
  }

  async function handleAddCustomCategory(
    name: string,
    icon: string,
    textColor: string,
    bgColor: string
  ) {
    setAddCatError(null)
    // Resolve userId — fall back to live Supabase session if store hasn't hydrated yet
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
    setPercents((prev) => {
      const next = { ...prev }
      delete next[categoryId]
      return next
    })
  }

  /** How many transactions are logged under a category (any type). */
  function txnCountFor(categoryId: string): number {
    return transactions.reduce((n, t) => (t.category.id === categoryId ? n + 1 : n), 0)
  }

  /** Begin hiding a category: if it has transactions, warn first; else hide now. */
  function beginHide(categoryId: string) {
    if (txnCountFor(categoryId) > 0) {
      setHideTarget(categoryId) // show the move-first warning
    } else {
      confirmHide(categoryId)
    }
  }

  /** Actually hide the category (preset → hidden set, custom → deleted) and drop
   *  it from the editor's rows. Called only once it has no transactions, or the
   *  user chose to hide anyway. */
  function confirmHide(categoryId: string) {
    if (isHideableCategory(categoryId)) {
      hidePresetCategory(categoryId)
    } else {
      // Custom category — delete it outright.
      removeCustomCategory(categoryId)
    }
    removeFromItems(categoryId)
    setHideTarget(null)
  }

  /** Send the user to the ledger, pre-filtered to the category, to recategorize
   *  its transactions one by one. Closes the sheet so the ledger is in focus. */
  function goMoveTransactions(categoryId: string) {
    setHideTarget(null)
    onClose()
    router.push(`/ledger?category=${encodeURIComponent(categoryId)}`)
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

  /** Apply a template's percentages to the current category rows. Amounts are
   *  recomputed against the total budget when one is set; otherwise the plan
   *  switches to percent mode so the split is meaningful without a total. */
  function applyTemplate(percentsByCat: Record<string, number>) {
    const nextPercents: Record<string, number> = {}
    for (const item of items) nextPercents[item.categoryId] = percentsByCat[item.categoryId] ?? 0
    setPercents(nextPercents)
    setAllocationMode('percent')
    if (totalBudget > 0) {
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          limit: Math.round(((nextPercents[item.categoryId] ?? 0) / 100) * totalBudget),
        }))
      )
    }
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

  async function handleDelete(id: string) {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id)
      return
    }
    await deleteAllocation(id)
    setDeleteConfirm(null)
  }

  const canDelete = allocations.length > 1

  // ── Shared inner content (list + editor), used by both variants ──────────
  const body = (
    <div className="relative flex flex-1 flex-col overflow-hidden">
              <AnimatePresence mode="wait" custom={direction}>
                {view === 'list' ? (
                  <motion.div
                    key="list"
                    custom={direction}
                    variants={viewVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                    className="flex flex-col"
                    style={{ maxHeight: '92dvh' }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pb-3 pt-2">
                      <h2 id={labelId} className="text-base font-bold" style={{ color: '#00352e' }}>
                        Budget Plans
                      </h2>
                      <motion.button
                        aria-label="Close"
                        onClick={onClose}
                        whileTap={{ scale: 0.88 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ background: '#f0f4f2' }}
                      >
                        <X size={15} weight="bold" style={{ color: '#3f4946' }} aria-hidden="true" />
                      </motion.button>
                    </div>

                    {/* Plan list */}
                    <div className="flex-1 overflow-y-auto px-5 pb-4">
                      <AnimatePresence initial={false}>
                        {allocations.map((alloc) => {
                          const isDeletePending = deleteConfirm === alloc.id
                          return (
                            <motion.div
                              key={alloc.id}
                              layout
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                              className="mb-2 flex items-center gap-3 rounded-2xl px-4 py-3"
                              style={{
                                background: alloc.isActive ? '#e7edeb' : '#f0f4f2',
                                borderLeft: alloc.isActive ? '3px solid #1f695d' : '3px solid transparent',
                              }}
                            >
                              {/* Activate on row tap */}
                              <button
                                className="flex flex-1 items-center gap-3 text-left"
                                aria-label={`${alloc.isActive ? 'Active plan' : 'Activate plan'}: ${alloc.name}`}
                                onClick={() => !alloc.isActive && activateAllocation(alloc.id)}
                              >
                                {/* Active check */}
                                <div
                                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                                  style={{
                                    background: alloc.isActive ? '#1f695d' : '#e7edeb',
                                  }}
                                >
                                  {alloc.isActive && (
                                    <Check size={12} weight="bold" color="#fff" aria-hidden="true" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p
                                    className="truncate text-sm font-semibold"
                                    style={{ color: '#191c1c' }}
                                  >
                                    {alloc.name}
                                  </p>
                                  <p className="text-[11px]" style={{ color: '#6e9990' }}>
                                    {alloc.items.length} categories ·{' '}
                                    {formatCurrency(alloc.items.reduce((s, i) => s + i.limit, 0))} total
                                  </p>
                                </div>
                              </button>

                              {/* Edit + Delete */}
                              <div className="flex items-center gap-1 shrink-0">
                                <motion.button
                                  aria-label={`Edit ${alloc.name}`}
                                  whileTap={{ scale: 0.85 }}
                                  onClick={() => openEditor(alloc.id)}
                                  className="flex h-8 w-8 items-center justify-center rounded-full"
                                  style={{ background: '#e7edeb' }}
                                >
                                  <PencilSimple size={13} weight="bold" style={{ color: '#3f4946' }} aria-hidden="true" />
                                </motion.button>
                                {canDelete && (
                                  <motion.button
                                    aria-label={isDeletePending ? `Confirm delete ${alloc.name}` : `Delete ${alloc.name}`}
                                    whileTap={{ scale: 0.85 }}
                                    onClick={() => handleDelete(alloc.id)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full"
                                    style={{
                                      background: isDeletePending ? '#ba1a1a' : '#e7edeb',
                                    }}
                                  >
                                    <Trash
                                      size={13}
                                      weight="bold"
                                      style={{ color: isDeletePending ? '#fff' : '#ba1a1a' }}
                                      aria-hidden="true"
                                    />
                                  </motion.button>
                                )}
                              </div>
                            </motion.div>
                          )
                        })}
                      </AnimatePresence>

                      {/* New plan CTA */}
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => openEditor()}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3"
                        style={{
                          border: '1.5px dashed #cde0db',
                          background: 'transparent',
                          color: '#1f695d',
                        }}
                      >
                        <Plus size={14} weight="bold" aria-hidden="true" />
                        <span className="text-sm font-semibold">New Plan</span>
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="editor"
                    custom={direction}
                    variants={viewVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                    className="flex flex-col"
                    style={{ maxHeight: '92dvh' }}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3 px-5 pb-3 pt-2">
                      <motion.button
                        aria-label="Back to plan list"
                        onClick={backToList}
                        whileTap={{ scale: 0.88 }}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                        style={{ background: '#f0f4f2' }}
                      >
                        <ArrowLeft size={15} weight="bold" style={{ color: '#3f4946' }} aria-hidden="true" />
                      </motion.button>
                      <h2 id={labelId} className="flex-1 text-base font-bold" style={{ color: '#00352e' }}>
                        {editId ? 'Edit Plan' : 'New Plan'}
                      </h2>
                    </div>

                    {/* Editor body */}
                    <div className="flex-1 overflow-y-auto px-5 pb-6">
                      {/* Plan name input */}
                      <div className="mb-5">
                        <label
                          htmlFor="plan-name"
                          className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest"
                          style={{ color: '#6e9990' }}
                        >
                          Plan Name
                        </label>
                        <input
                          id="plan-name"
                          type="text"
                          maxLength={48}
                          value={planName}
                          onChange={(e) => setPlanName(e.target.value)}
                          placeholder="E.g. Regular Month"
                          autoFocus
                          className="w-full rounded-xl px-4 py-3 text-sm font-semibold outline-none"
                          style={{
                            background: '#f0f4f2',
                            color: '#191c1c',
                            border: '1.5px solid transparent',
                          }}
                          onFocus={(e) =>
                            (e.currentTarget.style.border = '1.5px solid #1f695d')
                          }
                          onBlur={(e) =>
                            (e.currentTarget.style.border = '1.5px solid transparent')
                          }
                        />
                        <div className="mt-1 flex justify-end">
                          <span className="text-[11px]" style={{ color: '#cde0db' }}>
                            {planName.length}/48
                          </span>
                        </div>
                      </div>

                      {/* Total monthly budget */}
                      <div className="mb-4">
                        <label
                          htmlFor="total-budget"
                          className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest"
                          style={{ color: '#6e9990' }}
                        >
                          Total Monthly Budget
                        </label>
                        <div
                          className="flex items-center gap-2 rounded-xl px-4 py-3"
                          style={{ background: '#f0f4f2' }}
                        >
                          <span className="font-mono text-sm font-semibold" style={{ color: '#6e9990' }}>₱</span>
                          <input
                            id="total-budget"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step={1000}
                            value={totalBudget === 0 ? '' : totalBudget}
                            onChange={(e) => handleTotalBudgetChange(e.target.value)}
                            placeholder="e.g. 30000"
                            className="flex-1 bg-transparent font-mono text-sm font-semibold outline-none"
                            style={{ color: '#191c1c' }}
                          />
                        </div>
                      </div>

                      {/* Allocation mode toggle */}
                      <div
                        className="mb-4 flex rounded-xl p-1"
                        style={{ background: '#f0f4f2' }}
                      >
                        {(['amount', 'percent'] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => handleModeToggle(mode)}
                            className="flex-1 rounded-lg py-2 text-xs font-bold transition-colors"
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

                      {/* Quick-apply templates */}
                      <div className="mb-4">
                        <div className="mb-2 flex items-center gap-1.5">
                          <Sparkle size={12} weight="fill" style={{ color: '#1f695d' }} aria-hidden="true" />
                          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
                            Quick templates
                          </p>
                        </div>
                        <div
                          className="flex gap-2 overflow-x-auto pb-1"
                          style={{ scrollbarWidth: 'none' }}
                        >
                          {PLAN_TEMPLATES.map((t) => (
                            <motion.button
                              key={t.label}
                              whileTap={{ scale: 0.94 }}
                              onClick={() => applyTemplate(t.percents)}
                              title={t.description}
                              className="shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors"
                              style={{ background: '#f0f4f2', color: '#1f695d', border: '1px solid #cde0db' }}
                            >
                              {t.label}
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      {/* Category limits header + allocation summary */}
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
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
                              Monthly Limits
                            </p>
                            <span
                              className="font-mono text-[11px] font-semibold"
                              style={{ color: isOver ? '#ba1a1a' : '#1f695d' }}
                            >
                              {allocationMode === 'percent'
                                ? `${round2(totalAllocated)}% allocated`
                                : totalBudget > 0
                                  ? `${formatCurrency(totalAllocated)} / ${formatCurrency(totalBudget)}`
                                  : formatCurrency(totalAllocated)}
                            </span>
                          </div>
                        )
                      })()}

                      <div className="flex flex-col gap-2">
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
                                    style={{
                                      background: '#ffffff',
                                      color: '#191c1c',
                                      border: '1px solid #cde0db',
                                    }}
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
                                      style={{
                                        background: '#ffffff',
                                        color: '#191c1c',
                                        border: '1px solid #cde0db',
                                      }}
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
                              {/* Hide category (preset) or delete it (custom). Warns
                                  first if it still has logged transactions. */}
                              {(isCustom || isHideableCategory(item.categoryId)) && (
                                <motion.button
                                  aria-label={isCustom ? `Delete ${label}` : `Hide ${label}`}
                                  title={isCustom ? `Delete ${label}` : `Hide ${label}`}
                                  whileTap={{ scale: 0.85 }}
                                  onClick={() => beginHide(item.categoryId)}
                                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                                  style={{ background: '#e7edeb' }}
                                >
                                  <EyeSlash size={11} weight="bold" style={{ color: '#ba1a1a' }} aria-hidden="true" />
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

                    {/* Footer actions */}
                    <div
                      className="flex gap-3 px-5 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pt-3"
                      style={{ borderTop: '1px solid #e7edeb' }}
                    >
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={backToList}
                        className="flex-1 rounded-xl py-3 text-sm font-semibold"
                        style={{ background: '#f0f4f2', color: '#3f4946' }}
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleSave}
                        disabled={!planName.trim() || saving}
                        className="flex-1 rounded-xl py-3 text-sm font-semibold disabled:opacity-40"
                        style={{
                          background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)',
                          color: '#ffffff',
                        }}
                      >
                        {saving ? 'Saving…' : 'Save Plan'}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Move-first warning when hiding a category that still has transactions */}
              <AnimatePresence>
                {hideTarget && (() => {
                  const { label } = getCatDisplay(hideTarget, customCategories)
                  const count = txnCountFor(hideTarget)
                  const isCustom = !isHideableCategory(hideTarget)
                  return (
                    <motion.div
                      key="hide-warning"
                      className="absolute inset-0 z-10 flex items-end justify-center p-4 sm:items-center"
                      style={{ background: 'rgba(0,53,46,0.28)', backdropFilter: 'blur(3px)' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setHideTarget(null)}
                    >
                      <motion.div
                        className="w-full max-w-sm rounded-2xl p-5"
                        style={{ background: '#ffffff', boxShadow: '0 20px 60px rgba(0,53,46,0.28)' }}
                        initial={{ opacity: 0, y: 16, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="mb-3 flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(180,83,9,0.12)' }}>
                            <Warning size={17} weight="fill" style={{ color: '#b45309' }} aria-hidden="true" />
                          </div>
                          <h3 className="text-sm font-bold" style={{ color: '#00352e' }}>
                            Move transactions first
                          </h3>
                        </div>
                        <p className="mb-4 text-[13px] leading-relaxed" style={{ color: '#3f4946' }}>
                          <span className="font-semibold">{label}</span> has{' '}
                          <span className="font-semibold">{count}</span>{' '}
                          {count === 1 ? 'transaction' : 'transactions'} logged.
                          {' '}Recategorize {count === 1 ? 'it' : 'them'} first so your history stays accurate, then hide{' '}
                          <span className="font-semibold">{label}</span>.
                        </p>
                        <div className="flex flex-col gap-2">
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => goMoveTransactions(hideTarget)}
                            className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white"
                            style={{ background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)' }}
                          >
                            <ArrowsLeftRight size={15} weight="bold" aria-hidden="true" />
                            Move transactions
                          </motion.button>
                          {/* <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => confirmHide(hideTarget)}
                            className="rounded-xl py-2.5 text-[13px] font-semibold"
                            style={{ background: '#fbeaea', color: '#ba1a1a' }}
                          >
                            {isCustom ? 'Delete anyway' : 'Hide anyway'}
                          </motion.button> */}
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setHideTarget(null)}
                            className="rounded-xl py-2.5 text-[13px] font-semibold"
                            style={{ background: '#f0f4f2', color: '#3f4946' }}
                          >
                            Cancel
                          </motion.button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )
                })()}
              </AnimatePresence>
            </div>
  )

  // ── DESKTOP: centered modal overlay ──────────────────────────────────────
  if (isDesktop) {
    return (
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="budget-modal-backdrop"
              className="fixed inset-0 z-50 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onClose}
              aria-hidden="true"
            />
            <motion.div
              key="budget-modal-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby={labelId}
              className="fixed left-1/2 top-1/2 z-50 flex w-full max-w-lg flex-col overflow-hidden"
              style={{
                borderRadius: '20px',
                background: '#f8faf9',
                boxShadow: '0 24px 80px rgba(0,53,46,0.18), 0 0 0 1px rgba(205,224,219,0.5)',
                maxHeight: '85dvh',
              }}
              initial={{ opacity: 0, scale: 0.94, x: '-50%', y: '-46%' }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{ opacity: 0, scale: 0.94, x: '-50%', y: '-46%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            >
              {/* Thin accent top bar */}
              <div
                className="h-0.5 w-full shrink-0"
                style={{ background: 'linear-gradient(90deg, #1f695d, #00352e)' }}
              />
              {body}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    )
  }

  // ── MOBILE: bottom sheet ──────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,53,46,0.18)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelId}
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col overflow-hidden"
            style={{
              background: '#f8faf9',
              borderRadius: '20px 20px 0 0',
              maxHeight: '92dvh',
              boxShadow: '0 -12px 48px rgba(0,53,46,0.14)',
            }}
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full" style={{ background: '#cde0db' }} />
            </div>

            {body}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
