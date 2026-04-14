import { create } from 'zustand'
import type { Transaction, BudgetLimit, BudgetAllocation, BudgetAllocationItem, CustomCategory } from '@/types'
import {
  fetchTransactions,
  insertTransaction,
  removeTransaction,
  patchTransaction,
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
  fetchCustomCategories,
  createCustomCategory,
  deleteCustomCategory,
} from '@/lib/db/customCategories'

// ─── Default budget limits ────────────────────────────────────────────────────
// Applied as fallback when no active allocation is loaded.

export const DEFAULT_BUDGETS: BudgetLimit[] = [
  { categoryId: 'restaurants', limit: 5000, cycle: 'monthly' },
  { categoryId: 'groceries', limit: 8000, cycle: 'monthly' },
  { categoryId: 'transport', limit: 3000, cycle: 'monthly' },
  { categoryId: 'shopping', limit: 4000, cycle: 'monthly' },
  { categoryId: 'utilities', limit: 3500, cycle: 'monthly' },
  { categoryId: 'entertainment', limit: 2000, cycle: 'monthly' },
  { categoryId: 'health', limit: 2000, cycle: 'monthly' },
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
  /** Merchant key → category id (preset or custom) learned from user corrections */
  learnedMerchants: Record<string, string>
  isLoading: boolean
  userId: string | null
  /** True once loadBudgetAllocations has resolved at least once for the current user */
  budgetAllocationsLoaded: boolean
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
  loadCustomCategories: (userId: string) => Promise<void>
  addCustomCategory: (userId: string, name: string, icon: string, textColor: string, bgColor: string) => Promise<CustomCategory>
  removeCustomCategory: (id: string) => Promise<void>
  addTransaction: (tx: Transaction) => void
  deleteTransaction: (id: string) => void
  updateTransaction: (id: string, patch: Partial<Transaction>) => void
  /** Persist a user-corrected category for a merchant/keyword. */
  learnCategory: (merchantKey: string, categoryId: string) => void
  getByCategory: (categoryId: string) => Transaction[]
  getByDate: (date: string) => Transaction[]
  getMonthlyTotal: (type: 'expense' | 'income') => number
  getDailyTotal: (date: string, type?: 'expense' | 'income') => number
  /** True once the user has at least one saved allocation. */
  hasSetupBudget: () => boolean
}

export type AppStore = StoreState & StoreActions

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppStore>()((set, get) => ({
  transactions: [],
  budgetLimits: DEFAULT_BUDGETS,
  budgetAllocations: [],
  customCategories: [],
  learnedMerchants: {},
  isLoading: false,
  userId: null,
  budgetAllocationsLoaded: false,

  setUserId(userId) {
    set({ userId, ...(userId === null ? { budgetAllocationsLoaded: false, budgetAllocations: [] } : {}) })
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

  // ─── Custom Categories ────────────────────────────────────────────────────

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
      .reduce((sum, t) => sum + (t.type === 'expense' ? -t.amount : t.amount), 0)
  },
}))
