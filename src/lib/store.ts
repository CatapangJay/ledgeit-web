import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Transaction, BudgetLimit, CategoryId } from '@/types'
import { CATEGORIES } from '@/types'

// ─── Seed Data ────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function nowISO(): string {
  return new Date().toISOString()
}

function nowISOOffset(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 3_600_000).toISOString()
}

const restaurantsCategory = CATEGORIES.find((c) => c.id === 'restaurants')!
const transportCategory = CATEGORIES.find((c) => c.id === 'transport')!
const groceriesCategory = CATEGORIES.find((c) => c.id === 'groceries')!
const entertainmentCategory = CATEGORIES.find((c) => c.id === 'entertainment')!
const utilitiesCategory = CATEGORIES.find((c) => c.id === 'utilities')!
const incomeCategory = CATEGORIES.find((c) => c.id === 'income')!
const shoppingCategory = CATEGORIES.find((c) => c.id === 'shopping')!

const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: 'seed-001',
    raw: 'received 42500 salary',
    amount: 42500,
    merchant: 'Salary',
    category: incomeCategory,
    date: daysAgo(6),
    type: 'income',
    confidence: 0.99,
    createdAt: nowISOOffset(144),
  },
  {
    id: 'seed-002',
    raw: '$85 grab eats dinner',
    amount: 85,
    merchant: 'Grab',
    category: restaurantsCategory,
    date: daysAgo(5),
    type: 'expense',
    confidence: 0.93,
    createdAt: nowISOOffset(120),
  },
  {
    id: 'seed-003',
    raw: '2800 sm grocery run',
    amount: 2800,
    merchant: 'SM',
    category: groceriesCategory,
    date: daysAgo(4),
    type: 'expense',
    confidence: 0.88,
    createdAt: nowISOOffset(96),
  },
  {
    id: 'seed-004',
    raw: 'netflix monthly 649',
    amount: 649,
    merchant: 'Netflix',
    category: entertainmentCategory,
    date: daysAgo(3),
    type: 'expense',
    confidence: 0.97,
    isRecurring: true,
    createdAt: nowISOOffset(72),
  },
  {
    id: 'seed-005',
    raw: 'meralco bill 1840',
    amount: 1840,
    merchant: 'Meralco',
    category: utilitiesCategory,
    date: daysAgo(2),
    type: 'expense',
    confidence: 0.96,
    createdAt: nowISOOffset(48),
  },
  {
    id: 'seed-006',
    raw: 'grab 120 morning commute',
    amount: 120,
    merchant: 'Grab',
    category: transportCategory,
    date: daysAgo(1),
    type: 'expense',
    confidence: 0.94,
    createdAt: nowISOOffset(26),
  },
  {
    id: 'seed-007',
    raw: 'jollibee lunch 215',
    amount: 215,
    merchant: 'Jollibee',
    category: restaurantsCategory,
    date: today(),
    type: 'expense',
    confidence: 0.95,
    createdAt: nowISOOffset(5),
  },
  {
    id: 'seed-008',
    raw: 'shopee haul 1375',
    amount: 1375,
    merchant: 'Shopee',
    category: shoppingCategory,
    date: today(),
    type: 'expense',
    confidence: 0.91,
    createdAt: nowISOOffset(2),
  },
]

const SEED_BUDGETS: BudgetLimit[] = [
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
  _seeded: boolean
}

interface StoreActions {
  addTransaction: (tx: Transaction) => void
  deleteTransaction: (id: string) => void
  updateTransaction: (id: string, patch: Partial<Transaction>) => void
  getByCategory: (categoryId: CategoryId) => Transaction[]
  getByDate: (date: string) => Transaction[]
  getMonthlyTotal: (type: 'expense' | 'income') => number
  getDailyTotal: (date: string, type?: 'expense' | 'income') => number
}

export type AppStore = StoreState & StoreActions

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      transactions: SEED_TRANSACTIONS,
      budgetLimits: SEED_BUDGETS,
      _seeded: true,

      addTransaction(tx) {
        set((state) => ({
          transactions: [tx, ...state.transactions],
        }))
      },

      deleteTransaction(id) {
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        }))
      },

      updateTransaction(id, patch) {
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...patch } : t
          ),
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
    }),
    {
      name: 'ledgeit-store',
      storage: createJSONStorage(() => {
        // SSR safety guard — localStorage is not available on the server
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => undefined,
            removeItem: () => undefined,
          }
        }
        return localStorage
      }),
      partialize: (state) => ({
        transactions: state.transactions,
        budgetLimits: state.budgetLimits,
        _seeded: state._seeded,
      }),
    }
  )
)
