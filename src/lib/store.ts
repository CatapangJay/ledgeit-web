import { create } from 'zustand'
import type { Transaction, BudgetLimit, CategoryId } from '@/types'
import {
  fetchTransactions,
  insertTransaction,
  removeTransaction,
  patchTransaction,
} from '@/lib/db/transactions'
import { fetchBudgetLimits } from '@/lib/db/budgetLimits'

// ─── Default budget limits ────────────────────────────────────────────────────
// Applied immediately on app boot; replaced by DB limits once loaded.

const DEFAULT_BUDGETS: BudgetLimit[] = [
  { categoryId: 'restaurants', limit: 5000, cycle: 'monthly' },
  { categoryId: 'groceries', limit: 8000, cycle: 'monthly' },
  { categoryId: 'transport', limit: 3000, cycle: 'monthly' },
  { categoryId: 'shopping', limit: 4000, cycle: 'monthly' },
  { categoryId: 'utilities', limit: 3500, cycle: 'monthly' },
  { categoryId: 'entertainment', limit: 2000, cycle: 'monthly' },
  { categoryId: 'health', limit: 2000, cycle: 'monthly' },
]

// ─── Store Definition ─────────────────────────────────────────────────────────

interface StoreState {
  transactions: Transaction[]
  budgetLimits: BudgetLimit[]
  /** Merchant key → CategoryId learned from user corrections */
  learnedMerchants: Record<string, CategoryId>
  isLoading: boolean
  userId: string | null
}

interface StoreActions {
  setUserId: (userId: string | null) => void
  loadTransactions: (userId: string) => Promise<void>
  loadBudgetLimits: (userId: string) => Promise<void>
  addTransaction: (tx: Transaction) => void
  deleteTransaction: (id: string) => void
  updateTransaction: (id: string, patch: Partial<Transaction>) => void
  /** Persist a user-corrected category for a merchant/keyword. */
  learnCategory: (merchantKey: string, categoryId: CategoryId) => void
  getByCategory: (categoryId: CategoryId) => Transaction[]
  getByDate: (date: string) => Transaction[]
  getMonthlyTotal: (type: 'expense' | 'income') => number
  getDailyTotal: (date: string, type?: 'expense' | 'income') => number
}

export type AppStore = StoreState & StoreActions

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppStore>()((set, get) => ({
  transactions: [],
  budgetLimits: DEFAULT_BUDGETS,
  learnedMerchants: {},
  isLoading: false,
  userId: null,

  setUserId(userId) {
    set({ userId })
  },

  async loadTransactions(userId) {
    set({ isLoading: true })
    try {
      const transactions = await fetchTransactions(userId)
      set({ transactions, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  async loadBudgetLimits(userId) {
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    try {
      const limits = await fetchBudgetLimits(userId, month)
      if (limits.length > 0) {
        set({ budgetLimits: limits })
      }
    } catch {
      // Keep default budget limits on error
    }
  },

  addTransaction(tx) {
    const { userId } = get()
    // Optimistic: add immediately
    set((state) => ({ transactions: [tx, ...state.transactions] }))
    // Background DB write — rollback on failure
    if (userId) {
      insertTransaction(userId, tx).catch(() => {
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== tx.id),
        }))
      })
    }
  },

  deleteTransaction(id) {
    const prev = get().transactions
    // Optimistic: remove immediately
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }))
    // Background DB delete — rollback on failure
    removeTransaction(id).catch(() => {
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
    patchTransaction(id, patch).catch(() => {
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
