import { create } from 'zustand'
import type { Transaction, BudgetLimit, BudgetAllocation, BudgetAllocationItem, CustomCategory, IncomeAllocation, IncomeAllocationItem, Debt, DebtDirection, Category } from '@/types'
import {
  fetchTransactions,
  insertTransaction,
  removeTransaction,
  patchTransaction,
  bulkSetCategory,
  bulkSetDate,
  bulkDeleteTransactions,
} from '@/lib/db/transactions'
import { fetchBudgetLimits } from '@/lib/db/budgetLimits'
import {
  fetchBudgetAllocations,
  createBudgetAllocation,
  updateBudgetAllocation,
  activateBudgetAllocation,
  deleteBudgetAllocation,
} from '@/lib/db/budgetAllocations'
import {
  fetchIncomeAllocations,
  createIncomeAllocation,
  updateIncomeAllocation,
  activateIncomeAllocation,
  deleteIncomeAllocation,
} from '@/lib/db/incomeAllocations'
import {
  fetchCustomCategories,
  createCustomCategory,
  deleteCustomCategory,
} from '@/lib/db/customCategories'
import {
  fetchHiddenCategories,
  saveHiddenCategories,
} from '@/lib/db/userSettings'
import {
  fetchDebts,
  createDebt,
  patchDebt,
  insertDebtRepayment,
  setDebtSettled,
  deleteDebt,
} from '@/lib/db/debts'
import { CATEGORIES, typeForCategory } from '@/types'

// ─── Income source id → human-readable label ─────────────────────────────────
// Mirrors the INCOME_SOURCES list in OnboardingBudgetSetup (kept here so the
// store can build Transaction records without importing component files).
const INCOME_SOURCE_LABELS: Record<string, string> = {
  salary:      'Salary',
  freelance:   'Freelance',
  business:    'Business Revenue',
  inv_returns: 'Investment Returns',
  rental:      'Rental Income',
  bonds:       'Bonds & Interest',
  remittance:  'Remittance',
  pension:     'Pension / Benefits',
  other_inc:   'Other Income',
}

// Returns a local-time ISO date string (YYYY-MM-DD) for the first day of the
// current month — used as the date for auto-inserted income transactions.
function currentMonthFirstDay(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

// ─── Default budget limits ────────────────────────────────────────────────────
// Applied as fallback when no active allocation is loaded.

export const DEFAULT_BUDGETS: BudgetLimit[] = [
  { categoryId: 'restaurants',  limit: 6000, cycle: 'monthly' },
  { categoryId: 'groceries',    limit: 8000, cycle: 'monthly' },
  { categoryId: 'transport',    limit: 4000, cycle: 'monthly' },
  { categoryId: 'shopping',     limit: 4000, cycle: 'monthly' },
  { categoryId: 'utilities',    limit: 4000, cycle: 'monthly' },
  { categoryId: 'entertainment', limit: 2000, cycle: 'monthly' },
  { categoryId: 'health',       limit: 2000, cycle: 'monthly' },
  { categoryId: 'savings',      limit: 3000, cycle: 'monthly' },
  { categoryId: 'investments',  limit: 2000, cycle: 'monthly' },
  { categoryId: 'education',    limit: 1000, cycle: 'monthly' },
  { categoryId: 'personal_care', limit: 1000, cycle: 'monthly' },
]

function allocationToLimits(allocation: BudgetAllocation): BudgetLimit[] {
  return allocation.items.map((item) => ({
    categoryId: item.categoryId,
    limit: item.limit,
    cycle: 'monthly' as const,
  }))
}

// ─── Store Definition ─────────────────────────────────────────────────────────

interface StoreState {
  transactions: Transaction[]
  budgetLimits: BudgetLimit[]
  budgetAllocations: BudgetAllocation[]
  customCategories: CustomCategory[]
  /** Ids of preset categories the user has hidden ("deleted"). */
  hiddenCategories: string[]
  /** Merchant key → category id (preset or custom) learned from user corrections */
  learnedMerchants: Record<string, string>
  isLoading: boolean
  userId: string | null
  /** True once loadBudgetAllocations has resolved at least once for the current user */
  budgetAllocationsLoaded: boolean
  incomeAllocations: IncomeAllocation[]
  /** True once loadIncomeAllocations has resolved at least once for the current user */
  incomeAllocationsLoaded: boolean
  debts: Debt[]
}

interface StoreActions {
  setUserId: (userId: string | null) => void
  loadTransactions: (userId: string) => Promise<void>
  /** @deprecated Delegates to loadBudgetAllocations */
  loadBudgetLimits: (userId: string) => Promise<void>
  loadBudgetAllocations: (userId: string) => Promise<void>
  saveBudgetAllocation: (payload: { id?: string; name: string; items: BudgetAllocationItem[] }) => Promise<void>
  activateAllocation: (allocationId: string) => Promise<void>
  deleteAllocation: (allocationId: string) => Promise<void>
  loadIncomeAllocations: (userId: string) => Promise<void>
  saveIncomeAllocation: (payload: { id?: string; name: string; items: IncomeAllocationItem[] }) => Promise<void>
  activateIncomeAllocationById: (allocationId: string) => Promise<void>
  deleteIncomeAllocationById: (allocationId: string) => Promise<void>
  /** Sum of items in the active income allocation. */
  getTotalPlannedIncome: () => number
  loadCustomCategories: (userId: string) => Promise<void>
  addCustomCategory: (userId: string, name: string, icon: string, textColor: string, bgColor: string) => Promise<CustomCategory>
  removeCustomCategory: (id: string) => Promise<void>
  loadHiddenCategories: (userId: string) => Promise<void>
  /** Hide ("delete") a preset category for the current user. Reversible. */
  hidePresetCategory: (categoryId: string) => Promise<void>
  /** Restore a previously hidden preset category. */
  unhidePresetCategory: (categoryId: string) => Promise<void>
  addTransaction: (tx: Transaction) => void
  deleteTransaction: (id: string) => void
  updateTransaction: (id: string, patch: Partial<Transaction>) => void
  /** Reassign many transactions to one category (and its implied type) at once.
   *  Resolves true on success, false if the DB write failed (changes rolled back). */
  bulkChangeCategory: (ids: string[], category: Category) => Promise<boolean>
  /** Set the date on many transactions at once. Resolves true on success. */
  bulkChangeDate: (ids: string[], date: string) => Promise<boolean>
  /** Delete many transactions at once (debt-linked ones are skipped). Resolves true on success. */
  bulkDelete: (ids: string[]) => Promise<boolean>
  /** Persist a user-corrected category for a merchant/keyword. */
  learnCategory: (merchantKey: string, categoryId: string) => void
  getByCategory: (categoryId: string) => Transaction[]
  getByDate: (date: string) => Transaction[]
  getMonthlyTotal: (type: 'expense' | 'income') => number
  getDailyTotal: (date: string, type?: 'expense' | 'income') => number
  /** True once the user has at least one saved allocation. */
  hasSetupBudget: () => boolean
  // ── Debts ──────────────────────────────────────────────────────────────────
  loadDebts: (userId: string) => Promise<void>
  addDebt: (payload: { personName: string; direction: DebtDirection; principal: number; note?: string; dueDate?: string; date: string }) => Promise<void>
  updateDebt: (debtId: string, payload: { personName: string; direction: DebtDirection; principal: number; note?: string; dueDate?: string }) => Promise<void>
  recordDebtRepayment: (debtId: string, payload: { amount: number; interest?: number; date: string }) => Promise<void>
  toggleDebtSettled: (debtId: string) => Promise<void>
  removeDebt: (debtId: string) => Promise<void>
}

export type AppStore = StoreState & StoreActions

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppStore>()((set, get) => ({
  transactions: [],
  budgetLimits: DEFAULT_BUDGETS,
  budgetAllocations: [],
  customCategories: [],
  hiddenCategories: [],
  learnedMerchants: {},
  isLoading: false,
  userId: null,
  budgetAllocationsLoaded: false,
  incomeAllocations: [],
  incomeAllocationsLoaded: false,
  debts: [],

  setUserId(userId) {
    set({
      userId,
      ...(userId === null ? {
        budgetAllocationsLoaded: false,
        budgetAllocations: [],
        incomeAllocationsLoaded: false,
        incomeAllocations: [],
        debts: [],
      } : {}),
    })
  },

  async loadTransactions(userId) {
    set({ isLoading: true })
    try {
      const transactions = await fetchTransactions(userId, get().customCategories)
      set({ transactions, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  // ─── Budget Allocations ───────────────────────────────────────────────────

  async loadBudgetAllocations(userId) {
    try {
      const allocations = await fetchBudgetAllocations(userId)
      const active = allocations.find((a) => a.isActive)
      set({
        budgetAllocations: allocations,
        budgetLimits: active ? allocationToLimits(active) : DEFAULT_BUDGETS,
        budgetAllocationsLoaded: true,
      })
    } catch {
      // Keep defaults on error
      set({ budgetAllocationsLoaded: true })
    }
  },

  /** @deprecated Delegates to loadBudgetAllocations */
  async loadBudgetLimits(userId) {
    return get().loadBudgetAllocations(userId)
  },

  async saveBudgetAllocation({ id, name, items }) {
    const userId = get().userId
    if (!userId) return

    const prev = get().budgetAllocations

    if (id) {
      // ── Update existing ────────────────────────────────────────────────────
      const optimistic = prev.map((a) =>
        a.id === id ? { ...a, name, items } : a
      )
      const active = optimistic.find((a) => a.isActive)
      set({
        budgetAllocations: optimistic,
        budgetLimits: active ? allocationToLimits(active) : DEFAULT_BUDGETS,
      })
      try {
        await updateBudgetAllocation(id, name, items)
      } catch (err) {
        console.error('[store] updateBudgetAllocation failed:', err)
        set({ budgetAllocations: prev })
      }
    } else {
      // ── Create new ────────────────────────────────────────────────────────
      try {
        const created = await createBudgetAllocation(userId, name, items)
        const next = [created, ...prev.map((a) => ({ ...a, isActive: created.isActive ? false : a.isActive }))]
        const active = next.find((a) => a.isActive)
        set({
          budgetAllocations: next,
          budgetLimits: active ? allocationToLimits(active) : DEFAULT_BUDGETS,
        })
      } catch (err) {
        console.error('[store] createBudgetAllocation failed:', err)
      }
    }
  },

  async activateAllocation(allocationId) {
    const userId = get().userId
    if (!userId) return

    const prev = get().budgetAllocations
    const optimistic = prev.map((a) => ({ ...a, isActive: a.id === allocationId }))
    const active = optimistic.find((a) => a.isActive)
    set({
      budgetAllocations: optimistic,
      budgetLimits: active ? allocationToLimits(active) : DEFAULT_BUDGETS,
    })
    try {
      await activateBudgetAllocation(userId, allocationId)
    } catch (err) {
      console.error('[store] activateBudgetAllocation failed:', err)
      set({ budgetAllocations: prev })
    }
  },

  async deleteAllocation(allocationId) {
    const userId = get().userId
    if (!userId) return

    const prev = get().budgetAllocations
    const target = prev.find((a) => a.id === allocationId)
    if (!target) return

    // Cannot delete the only allocation
    if (prev.length === 1) return

    const remaining = prev.filter((a) => a.id !== allocationId)
    // If we deleted the active one, promote the first remaining
    const shouldPromote = target.isActive
    const promoted = shouldPromote
      ? remaining.map((a, i) => ({ ...a, isActive: i === 0 }))
      : remaining
    const active = promoted.find((a) => a.isActive)
    set({
      budgetAllocations: promoted,
      budgetLimits: active ? allocationToLimits(active) : DEFAULT_BUDGETS,
    })
    try {
      await deleteBudgetAllocation(userId, allocationId, target.isActive)
    } catch (err) {
      console.error('[store] deleteBudgetAllocation failed:', err)
      set({ budgetAllocations: prev })
    }
  },

  hasSetupBudget() {
    return get().budgetAllocations.length > 0
  },

  // ─── Income Allocations ─────────────────────────────────────────────────────────

  async loadIncomeAllocations(userId) {
    try {
      const allocations = await fetchIncomeAllocations(userId)
      set({ incomeAllocations: allocations, incomeAllocationsLoaded: true })
    } catch {
      set({ incomeAllocationsLoaded: true })
    }
  },

  async saveIncomeAllocation({ id, name, items }) {
    const userId = get().userId
    if (!userId) return
    const prev = get().incomeAllocations
    if (id) {
      // ── Update existing — just persist the new amounts, no new transactions ──
      const optimistic = prev.map((a) => (a.id === id ? { ...a, name, items } : a))
      set({ incomeAllocations: optimistic })
      try {
        await updateIncomeAllocation(id, name, items)
      } catch (err) {
        console.error('[store] updateIncomeAllocation failed:', err)
        set({ incomeAllocations: prev })
      }
    } else {
      // ── Create new — persist allocation then auto-insert income transactions ─
      try {
        const created = await createIncomeAllocation(userId, name, items)
        const next = [created, ...prev.map((a) => ({ ...a, isActive: created.isActive ? false : a.isActive }))]
        set({ incomeAllocations: next })

        // Insert one income transaction per source with amount > 0
        const incomeCategory = CATEGORIES.find((c) => c.id === 'income')!
        const dateStr = currentMonthFirstDay()
        for (const item of items) {
          if (item.amount <= 0) continue
          const label = INCOME_SOURCE_LABELS[item.sourceId] ?? item.sourceId
          const tx: Transaction = {
            id: crypto.randomUUID(),
            raw: `${label.toLowerCase()} ${item.amount}`,
            amount: item.amount,
            merchant: label,
            category: incomeCategory,
            date: dateStr,
            type: 'income',
            paymentMethod: 'bank',
            confidence: 1,
            createdAt: new Date().toISOString(),
          }
          get().addTransaction(tx)
        }
      } catch (err) {
        console.error('[store] createIncomeAllocation failed:', err)
      }
    }
  },

  async activateIncomeAllocationById(allocationId) {
    const userId = get().userId
    if (!userId) return
    const prev = get().incomeAllocations
    set({ incomeAllocations: prev.map((a) => ({ ...a, isActive: a.id === allocationId })) })
    try {
      await activateIncomeAllocation(userId, allocationId)
    } catch (err) {
      console.error('[store] activateIncomeAllocation failed:', err)
      set({ incomeAllocations: prev })
    }
  },

  async deleteIncomeAllocationById(allocationId) {
    const userId = get().userId
    if (!userId) return
    const prev = get().incomeAllocations
    if (prev.length === 1) return
    const target = prev.find((a) => a.id === allocationId)
    if (!target) return
    const remaining = prev.filter((a) => a.id !== allocationId)
    const promoted = target.isActive
      ? remaining.map((a, i) => ({ ...a, isActive: i === 0 }))
      : remaining
    set({ incomeAllocations: promoted })
    try {
      await deleteIncomeAllocation(allocationId)
    } catch (err) {
      console.error('[store] deleteIncomeAllocation failed:', err)
      set({ incomeAllocations: prev })
    }
  },

  getTotalPlannedIncome() {
    const active = get().incomeAllocations.find((a) => a.isActive)
    if (!active) return 0
    return active.items.reduce((s, i) => s + i.amount, 0)
  },


  async loadCustomCategories(userId) {
    try {
      const customCategories = await fetchCustomCategories(userId)
      set({ customCategories })
    } catch {
      // Keep empty on error
    }
  },

  async addCustomCategory(userId, name, icon, textColor, bgColor) {
    const created = await createCustomCategory(userId, name, icon, textColor, bgColor)
    set((state) => ({ customCategories: [...state.customCategories, created] }))
    return created
  },

  async removeCustomCategory(id) {
    const prev = get().customCategories
    set((state) => ({ customCategories: state.customCategories.filter((c) => c.id !== id) }))
    try {
      await deleteCustomCategory(id)
    } catch (err) {
      console.error('[store] deleteCustomCategory failed:', err)
      set({ customCategories: prev })
    }
  },

  async loadHiddenCategories(userId) {
    try {
      const hiddenCategories = await fetchHiddenCategories(userId)
      set({ hiddenCategories })
    } catch {
      // Keep empty on error
    }
  },

  async hidePresetCategory(categoryId) {
    const userId = get().userId
    if (!userId) return
    const prev = get().hiddenCategories
    if (prev.includes(categoryId)) return
    const next = [...prev, categoryId]
    set({ hiddenCategories: next })
    try {
      await saveHiddenCategories(userId, next)
    } catch (err) {
      console.error('[store] hidePresetCategory failed:', err)
      set({ hiddenCategories: prev })
    }
  },

  async unhidePresetCategory(categoryId) {
    const userId = get().userId
    if (!userId) return
    const prev = get().hiddenCategories
    const next = prev.filter((id) => id !== categoryId)
    set({ hiddenCategories: next })
    try {
      await saveHiddenCategories(userId, next)
    } catch (err) {
      console.error('[store] unhidePresetCategory failed:', err)
      set({ hiddenCategories: prev })
    }
  },

  addTransaction(tx) {
    // Optimistic: add immediately
    set((state) => ({ transactions: [tx, ...state.transactions] }))
    // Background DB write — rollback on failure
    insertTransaction(tx).catch((err) => {
      console.error('[store] insertTransaction failed:', err)
      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== tx.id),
      }))
    })
  },

  deleteTransaction(id) {
    const prev = get().transactions
    // Optimistic: remove immediately
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }))
    // Background DB delete — rollback on failure
    removeTransaction(id).catch((err) => {
      console.error('[store] removeTransaction failed:', err)
      set({ transactions: prev })
    })
  },

  updateTransaction(id, patch) {
    const prev = get().transactions
    // Optimistic: apply patch immediately
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === id ? { ...t, ...patch } : t
      ),
    }))
    // Background DB update — rollback on failure
    patchTransaction(id, patch).catch((err) => {
      console.error('[store] patchTransaction failed:', err)
      set({ transactions: prev })
    })
  },

  async bulkChangeCategory(ids, category) {
    if (ids.length === 0) return true
    const prev = get().transactions
    // Debt-linked entries are managed on the Debts page — never bulk-reassign
    // them, or the debt record's totals would desync.
    const targetIds = ids.filter((id) => {
      const tx = prev.find((t) => t.id === id)
      return tx && tx.category.id !== 'debts'
    })
    if (targetIds.length === 0) return true
    const targetSet = new Set(targetIds)
    const type = typeForCategory(category.id)

    // Optimistic: apply category + implied type to the selected rows.
    set((state) => ({
      transactions: state.transactions.map((t) =>
        targetSet.has(t.id) ? { ...t, category, type } : t
      ),
    }))
    try {
      await bulkSetCategory(targetIds, category.id, type)
      return true
    } catch (err) {
      console.error('[store] bulkChangeCategory failed:', err)
      set({ transactions: prev })
      return false
    }
  },

  async bulkChangeDate(ids, date) {
    if (ids.length === 0) return true
    const prev = get().transactions
    const idSet = new Set(ids)

    // Optimistic: apply the new date to the selected rows.
    set((state) => ({
      transactions: state.transactions.map((t) =>
        idSet.has(t.id) ? { ...t, date } : t
      ),
    }))
    try {
      await bulkSetDate(ids, date)
      return true
    } catch (err) {
      console.error('[store] bulkChangeDate failed:', err)
      set({ transactions: prev })
      return false
    }
  },

  async bulkDelete(ids) {
    if (ids.length === 0) return true
    const prev = get().transactions
    // Debt-linked entries are managed on the Debts page — deleting one here would
    // orphan the debt record, so skip them.
    const targetIds = ids.filter((id) => {
      const tx = prev.find((t) => t.id === id)
      return tx && tx.category.id !== 'debts'
    })
    if (targetIds.length === 0) return true
    const targetSet = new Set(targetIds)

    // Optimistic: remove the selected rows.
    set((state) => ({
      transactions: state.transactions.filter((t) => !targetSet.has(t.id)),
    }))
    try {
      await bulkDeleteTransactions(targetIds)
      return true
    } catch (err) {
      console.error('[store] bulkDelete failed:', err)
      set({ transactions: prev })
      return false
    }
  },

  learnCategory(merchantKey, categoryId) {
    if (!merchantKey) return
    set((state) => ({
      learnedMerchants: {
        ...state.learnedMerchants,
        [merchantKey.toLowerCase().trim()]: categoryId,
      },
    }))
  },

  getByCategory(categoryId) {
    return get().transactions.filter((t) => t.category.id === categoryId)
  },

  getByDate(date) {
    return get().transactions.filter((t) => t.date === date)
  },

  getMonthlyTotal(type) {
    const now = new Date()
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return get()
      .transactions.filter(
        (t) => t.type === type && t.date.startsWith(yearMonth)
      )
      .reduce((sum, t) => sum + t.amount, 0)
  },

  getDailyTotal(date, type) {
    return get()
      .transactions.filter(
        (t) => t.date === date && (type ? t.type === type : true)
      )
      // Transfers move money between the user's own pockets — they net to zero
      // and must not shift the daily total. Only expense/income affect it.
      .reduce((sum, t) => {
        if (t.type === 'expense') return sum - t.amount
        if (t.type === 'income') return sum + t.amount
        return sum
      }, 0)
  },

  // ─── Debts ────────────────────────────────────────────────────────────────

  async loadDebts(userId) {
    try {
      const debts = await fetchDebts(userId)
      set({ debts })
    } catch {
      // Keep empty on error
    }
  },

  async addDebt({ personName, direction, principal, note, dueDate, date }) {
    const userId = get().userId
    if (!userId) return

    // A debt is not spending or earning — it's money moving between your own
    // pockets (out when you lend, in when you borrow). So it's logged as a
    // `transfer`, which is excluded from income/expense totals. Only interest
    // (handled at repayment time) is a true expense/income.
    const debtCategory = CATEGORIES.find((c) => c.id === 'debts')!
    const txId = crypto.randomUUID()
    const label = direction === 'owed_to_me' ? `Lent to ${personName}` : `Borrowed from ${personName}`
    const tx: Transaction = {
      id: txId,
      raw: `${label} ${principal}`,
      amount: principal,
      merchant: label,
      category: debtCategory,
      date,
      type: 'transfer',
      paymentMethod: 'cash',
      confidence: 1,
      note,
      createdAt: new Date().toISOString(),
    }

    try {
      const debt = await createDebt(userId, { personName, direction, principal, note, dueDate, transactionId: txId })
      set((state) => ({ debts: [debt, ...state.debts] }))
      get().addTransaction(tx) // optimistic + background DB write
    } catch (err) {
      console.error('[store] addDebt failed:', err)
    }
  },

  async updateDebt(debtId, { personName, direction, principal, note, dueDate }) {
    const debt = get().debts.find((d) => d.id === debtId)
    if (!debt) return
    const prevDebts = get().debts

    // Optimistically apply the debt edits.
    set((state) => ({
      debts: state.debts.map((d) =>
        d.id === debtId ? { ...d, personName, direction, principal, note, dueDate } : d
      ),
    }))

    // Keep the linked origination transfer in step with the edited debt: its
    // label and amount derive from these fields. It stays a `transfer` (debt
    // principal never counts as income/expense).
    if (debt.transactionId) {
      const label = direction === 'owed_to_me' ? `Lent to ${personName}` : `Borrowed from ${personName}`
      get().updateTransaction(debt.transactionId, {
        merchant: label,
        amount: principal,
        type: 'transfer',
        note,
      })
    }

    try {
      await patchDebt(debtId, {
        personName,
        direction,
        principal,
        note: note ?? null,
        dueDate: dueDate ?? null,
      })
    } catch (err) {
      console.error('[store] updateDebt failed:', err)
      set({ debts: prevDebts })
    }
  },

  async recordDebtRepayment(debtId, { amount, interest = 0, date }) {
    const debt = get().debts.find((d) => d.id === debtId)
    if (!debt) return

    const debtCategory = CATEGORIES.find((c) => c.id === 'debts')!
    const now = new Date().toISOString()

    // Principal moves money between your own pockets, so it's a `transfer`
    // (excluded from income/expense totals) — matching the origination. Skipped
    // for interest-only payments (amount 0), where no principal changes hands.
    let principalTxId: string | undefined
    let principalTx: Transaction | undefined
    if (amount > 0) {
      principalTxId = crypto.randomUUID()
      const principalLabel = debt.direction === 'owed_to_me'
        ? `${debt.personName} repaid`
        : `Repaid ${debt.personName}`
      principalTx = {
        id: principalTxId,
        raw: `${principalLabel} ${amount}`,
        amount,
        merchant: principalLabel,
        category: debtCategory,
        date,
        type: 'transfer',
        paymentMethod: 'cash',
        confidence: 1,
        createdAt: now,
      }
    }

    // Interest IS a real gain/cost: interest you collect on money owed to you is
    // income; interest you pay on what you owe is an expense. Only this leg
    // moves your income/expense totals. Logged as a separate transaction so it's
    // isolated and stays linked for edits/deletes.
    let interestTxId: string | undefined
    let interestTx: Transaction | undefined
    if (interest > 0) {
      interestTxId = crypto.randomUUID()
      const interestLabel = debt.direction === 'owed_to_me'
        ? `Interest from ${debt.personName}`
        : `Interest to ${debt.personName}`
      interestTx = {
        id: interestTxId,
        raw: `${interestLabel} ${interest}`,
        amount: interest,
        merchant: interestLabel,
        category: debtCategory,
        date,
        type: debt.direction === 'owed_to_me' ? 'income' : 'expense',
        paymentMethod: 'cash',
        confidence: 1,
        createdAt: now,
      }
    }

    try {
      const repayment = await insertDebtRepayment(debtId, {
        amount,
        interest,
        date,
        transactionId: principalTxId,
        interestTransactionId: interestTxId,
      })
      set((state) => ({
        debts: state.debts.map((d) =>
          d.id === debtId ? { ...d, repayments: [...d.repayments, repayment] } : d
        ),
      }))
      if (principalTx) get().addTransaction(principalTx)
      if (interestTx) get().addTransaction(interestTx)
    } catch (err) {
      console.error('[store] recordDebtRepayment failed:', err)
    }
  },

  async toggleDebtSettled(debtId) {
    const debt = get().debts.find((d) => d.id === debtId)
    if (!debt) return
    const next = !debt.isSettled
    set((state) => ({
      debts: state.debts.map((d) => (d.id === debtId ? { ...d, isSettled: next } : d)),
    }))
    try {
      await setDebtSettled(debtId, next)
    } catch (err) {
      console.error('[store] toggleDebtSettled failed:', err)
      set((state) => ({
        debts: state.debts.map((d) => (d.id === debtId ? { ...d, isSettled: !next } : d)),
      }))
    }
  },

  async removeDebt(debtId) {
    const debt = get().debts.find((d) => d.id === debtId)
    if (!debt) return
    const prev = get().debts

    // Remove the debt optimistically, then clean up its linked ledger
    // transactions (origination + every repayment) so nothing is orphaned.
    set((state) => ({ debts: state.debts.filter((d) => d.id !== debtId) }))
    const linkedTxIds = [
      debt.transactionId,
      ...debt.repayments.flatMap((r) => [r.transactionId, r.interestTransactionId]),
    ].filter((id): id is string => Boolean(id))
    for (const id of linkedTxIds) get().deleteTransaction(id)

    try {
      await deleteDebt(debtId)
    } catch (err) {
      console.error('[store] removeDebt failed:', err)
      set({ debts: prev })
    }
  },
}))
