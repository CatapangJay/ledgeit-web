'use client'

import { useState, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ArrowLeft,
  Check,
  PencilSimple,
  Trash,
  Plus,
} from '@phosphor-icons/react'
import { useStore } from '@/lib/store'
import { DEFAULT_BUDGETS } from '@/lib/store'
import { CATEGORIES } from '@/types'
import type { BudgetAllocationItem, CustomCategory } from '@/types'
import { formatCurrency } from '@/lib/formatters'
import { getIconComponent } from '@/lib/iconMap'
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

/** Merge existing allocation items with all known categories, filling missing with 0. */
function buildEditorItems(
  existingItems: BudgetAllocationItem[],
  customCats: CustomCategory[]
): BudgetAllocationItem[] {
  const result: BudgetAllocationItem[] = []
  for (const cat of EXPENSE_CATEGORIES) {
    const found = existingItems.find((i) => i.categoryId === cat.id)
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

  const allocations = useStore((s) => s.budgetAllocations)
  const saveBudgetAllocation = useStore((s) => s.saveBudgetAllocation)
  const activateAllocation = useStore((s) => s.activateAllocation)
  const deleteAllocation = useStore((s) => s.deleteAllocation)
  const customCategories = useStore((s) => s.customCategories)
  const storeAddCustomCategory = useStore((s) => s.addCustomCategory)
  const userId = useStore((s) => s.userId)

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

  function openEditor(id?: string) {
    if (id) {
      const alloc = allocations.find((a) => a.id === id)
      if (!alloc) return
      setPlanName(alloc.name)
      setItems(buildEditorItems(alloc.items, customCategories))
      setEditId(id)
    } else {
      setPlanName('')
      setItems(buildEditorItems([], customCategories))
      setEditId(undefined)
    }
    setShowAddCatForm(false)
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

  async function handleDelete(id: string) {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id)
      return
    }
    await deleteAllocation(id)
    setDeleteConfirm(null)
  }

  const canDelete = allocations.length > 1

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

            <div className="flex-1 overflow-hidden">
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

                      {/* Category limits — preset + custom */}
                      <p className="mb-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
                        Monthly Limits
                      </p>
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
                              {/* Remove custom category from this allocation */}
                              {isCustom && (
                                <motion.button
                                  aria-label={`Remove ${label} from plan`}
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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
