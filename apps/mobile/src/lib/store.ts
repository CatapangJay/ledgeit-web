import { create } from 'zustand';
import type { BudgetAllocation, BudgetLimit, CustomCategory, Debt, Transaction } from '@ledgeit/core';
import {
  mockBudgetAllocations,
  mockBudgetLimits,
  mockCustomCategories,
  mockDebts,
  mockTransactions,
} from '@/lib/mockData';

// ─── Mobile store (mock-data phase) ──────────────────────────────────────────
// Same shape/selector surface as apps/web/src/lib/store.ts so dashboard
// components ported from web can read via `useStore((s) => s.x)` unchanged.
// Backed by static mock data for now; swap the initial state + actions for a
// real DataProvider (SQLite/Drizzle, per .docs/MOBILE_ARCHITECTURE.md) later
// without touching the components that consume this store.

interface StoreState {
  transactions: Transaction[];
  budgetLimits: BudgetLimit[];
  budgetAllocations: BudgetAllocation[];
  customCategories: CustomCategory[];
  debts: Debt[];
}

interface StoreActions {
  hasSetupBudget: () => boolean;
  getDailyTotal: (date: string, type?: 'expense' | 'income') => number;
  addTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
}

export const useStore = create<StoreState & StoreActions>((set, get) => ({
  transactions: mockTransactions,
  budgetLimits: mockBudgetLimits,
  budgetAllocations: mockBudgetAllocations,
  customCategories: mockCustomCategories,
  debts: mockDebts,

  hasSetupBudget() {
    return get().budgetAllocations.length > 0;
  },

  getDailyTotal(date, type) {
    return get()
      .transactions.filter((t) => t.date === date && (type ? t.type === type : true))
      .reduce((sum, t) => sum + t.amount, 0);
  },

  addTransaction(tx) {
    set((s) => ({ transactions: [tx, ...s.transactions] }));
  },

  deleteTransaction(id) {
    set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
  },

  updateTransaction(id, patch) {
    set((s) => ({
      transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  },
}));
