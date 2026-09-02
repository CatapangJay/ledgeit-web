import { create } from 'zustand';
import type {
  BudgetAllocation,
  BudgetAllocationItem,
  BudgetLimit,
  Category,
  CustomCategory,
  Debt,
  DebtDirection,
  IncomeAllocation,
  IncomeAllocationItem,
  Transaction,
  Wallet,
  WalletKind,
  WalletMovement,
  WalletMovementType,
} from '@ledgeit/core';
import { CATEGORIES, typeForCategory, resolveWalletKind, spendAmount, netAmount } from '@ledgeit/core';
import {
  mockBudgetAllocations,
  mockBudgetLimits,
  mockCustomCategories,
  mockDebts,
  mockTransactions,
  mockWallets,
} from '@/lib/mockData';

// ─── Mobile store (mock-data phase) ──────────────────────────────────────────
// Mirrors the action/selector surface of apps/web/src/lib/store.ts 1:1 so
// components ported from web read/write via `useStore((s) => s.x)` unchanged.
// The difference: every action mutates in-memory state synchronously instead of
// awaiting a Supabase round-trip. The async signatures (Promise-returning) are
// kept identical to web so component call sites (`await addWallet(...)`) don't
// need editing when the real DataProvider (SQLite/Drizzle, per
// .docs/MOBILE_ARCHITECTURE.md) lands later.

// crypto.randomUUID isn't guaranteed in the RN runtime; use a lightweight id.
let idSeq = 0;
function newId(): string {
  idSeq += 1;
  return `local-${Date.now().toString(36)}-${idSeq}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

// ─── Income source id → human-readable label ─────────────────────────────────
// Mirrors the INCOME_SOURCES list in OnboardingBudgetSetup.
const INCOME_SOURCE_LABELS: Record<string, string> = {
  salary: 'Salary',
  freelance: 'Freelance',
  business: 'Business Revenue',
  inv_returns: 'Investment Returns',
  rental: 'Rental Income',
  bonds: 'Bonds & Interest',
  remittance: 'Remittance',
  pension: 'Pension / Benefits',
  other_inc: 'Other Income',
};

function currentMonthFirstDay(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

// ─── Default budget limits ────────────────────────────────────────────────────
export const DEFAULT_BUDGETS: BudgetLimit[] = [
  { categoryId: 'restaurants', limit: 6000, cycle: 'monthly' },
  { categoryId: 'groceries', limit: 8000, cycle: 'monthly' },
  { categoryId: 'transport', limit: 4000, cycle: 'monthly' },
  { categoryId: 'shopping', limit: 4000, cycle: 'monthly' },
  { categoryId: 'utilities', limit: 4000, cycle: 'monthly' },
  { categoryId: 'entertainment', limit: 2000, cycle: 'monthly' },
  { categoryId: 'health', limit: 2000, cycle: 'monthly' },
  { categoryId: 'savings', limit: 3000, cycle: 'monthly' },
  { categoryId: 'investments', limit: 2000, cycle: 'monthly' },
  { categoryId: 'education', limit: 1000, cycle: 'monthly' },
  { categoryId: 'personal_care', limit: 1000, cycle: 'monthly' },
];

function allocationToLimits(allocation: BudgetAllocation): BudgetLimit[] {
  return allocation.items.map((item) => ({
    categoryId: item.categoryId,
    limit: item.limit,
    cycle: 'monthly' as const,
  }));
}

// ─── Store Definition ─────────────────────────────────────────────────────────

interface StoreState {
  transactions: Transaction[];
  budgetLimits: BudgetLimit[];
  budgetAllocations: BudgetAllocation[];
  customCategories: CustomCategory[];
  /** Ids of preset categories the user has hidden ("deleted"). */
  hiddenCategories: string[];
  /** Merchant key → category id learned from user corrections. */
  learnedMerchants: Record<string, string>;
  incomeAllocations: IncomeAllocation[];
  debts: Debt[];
  wallets: Wallet[];
}

interface StoreActions {
  // ── Budget allocations ──────────────────────────────────────────────────────
  saveBudgetAllocation: (payload: { id?: string; name: string; items: BudgetAllocationItem[] }) => Promise<void>;
  activateAllocation: (allocationId: string) => Promise<void>;
  deleteAllocation: (allocationId: string) => Promise<void>;
  hasSetupBudget: () => boolean;
  // ── Income allocations ────────────────────────────────────────────────────────
  saveIncomeAllocation: (payload: { id?: string; name: string; items: IncomeAllocationItem[] }) => Promise<void>;
  activateIncomeAllocationById: (allocationId: string) => Promise<void>;
  deleteIncomeAllocationById: (allocationId: string) => Promise<void>;
  getTotalPlannedIncome: () => number;
  // ── Custom / hidden categories ─────────────────────────────────────────────────
  addCustomCategory: (name: string, icon: string, textColor: string, bgColor: string) => Promise<CustomCategory>;
  removeCustomCategory: (id: string) => Promise<void>;
  hidePresetCategory: (categoryId: string) => Promise<void>;
  unhidePresetCategory: (categoryId: string) => Promise<void>;
  // ── Transactions ────────────────────────────────────────────────────────────
  addTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  bulkChangeCategory: (ids: string[], category: Category) => Promise<boolean>;
  bulkChangeDate: (ids: string[], date: string) => Promise<boolean>;
  bulkDelete: (ids: string[]) => Promise<boolean>;
  learnCategory: (merchantKey: string, categoryId: string) => void;
  getByCategory: (categoryId: string) => Transaction[];
  getByDate: (date: string) => Transaction[];
  getMonthlyTotal: (type: 'expense' | 'income') => number;
  getDailyTotal: (date: string, type?: 'expense' | 'income') => number;
  // ── Debts ─────────────────────────────────────────────────────────────────────
  addDebt: (payload: { personName: string; direction: DebtDirection; principal: number; note?: string; dueDate?: string; date: string }) => Promise<void>;
  updateDebt: (debtId: string, payload: { personName: string; direction: DebtDirection; principal: number; note?: string; dueDate?: string }) => Promise<void>;
  recordDebtRepayment: (debtId: string, payload: { amount: number; interest?: number; date: string }) => Promise<void>;
  toggleDebtSettled: (debtId: string) => Promise<void>;
  removeDebt: (debtId: string) => Promise<void>;
  // ── Wallets ─────────────────────────────────────────────────────────────────────
  addWallet: (payload: { name: string; kind: WalletKind; target?: number; note?: string; initialAmount?: number; date: string }) => Promise<void>;
  updateWallet: (walletId: string, payload: { name: string; kind: WalletKind; target?: number; note?: string }) => Promise<void>;
  recordWalletMovement: (walletId: string, payload: { type: WalletMovementType; amount: number; note?: string; date: string }) => Promise<void>;
  attachWalletMovement: (walletId: string, payload: { type: WalletMovementType; amount: number; date: string; note?: string; transactionId: string }) => Promise<void>;
  removeWalletMovement: (walletId: string, movementId: string) => Promise<void>;
  toggleWalletArchived: (walletId: string) => Promise<void>;
  removeWallet: (walletId: string) => Promise<void>;
}

export type AppStore = StoreState & StoreActions;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppStore>()((set, get) => ({
  transactions: mockTransactions,
  budgetLimits: mockBudgetLimits,
  budgetAllocations: mockBudgetAllocations,
  customCategories: mockCustomCategories,
  hiddenCategories: [],
  learnedMerchants: {},
  incomeAllocations: [],
  debts: mockDebts,
  wallets: mockWallets,

  // ─── Budget Allocations ───────────────────────────────────────────────────

  async saveBudgetAllocation({ id, name, items }) {
    const prev = get().budgetAllocations;
    if (id) {
      const optimistic = prev.map((a) => (a.id === id ? { ...a, name, items } : a));
      const active = optimistic.find((a) => a.isActive);
      set({
        budgetAllocations: optimistic,
        budgetLimits: active ? allocationToLimits(active) : DEFAULT_BUDGETS,
      });
    } else {
      const created: BudgetAllocation = {
        id: newId(),
        name,
        isActive: prev.length === 0,
        items,
        createdAt: new Date().toISOString(),
      };
      const next = [created, ...prev.map((a) => ({ ...a, isActive: created.isActive ? false : a.isActive }))];
      const active = next.find((a) => a.isActive);
      set({
        budgetAllocations: next,
        budgetLimits: active ? allocationToLimits(active) : DEFAULT_BUDGETS,
      });
    }
  },

  async activateAllocation(allocationId) {
    const prev = get().budgetAllocations;
    const optimistic = prev.map((a) => ({ ...a, isActive: a.id === allocationId }));
    const active = optimistic.find((a) => a.isActive);
    set({
      budgetAllocations: optimistic,
      budgetLimits: active ? allocationToLimits(active) : DEFAULT_BUDGETS,
    });
  },

  async deleteAllocation(allocationId) {
    const prev = get().budgetAllocations;
    const target = prev.find((a) => a.id === allocationId);
    if (!target) return;
    if (prev.length === 1) return;
    const remaining = prev.filter((a) => a.id !== allocationId);
    const promoted = target.isActive
      ? remaining.map((a, i) => ({ ...a, isActive: i === 0 }))
      : remaining;
    const active = promoted.find((a) => a.isActive);
    set({
      budgetAllocations: promoted,
      budgetLimits: active ? allocationToLimits(active) : DEFAULT_BUDGETS,
    });
  },

  hasSetupBudget() {
    return get().budgetAllocations.length > 0;
  },

  // ─── Income Allocations ─────────────────────────────────────────────────────

  async saveIncomeAllocation({ id, name, items }) {
    const prev = get().incomeAllocations;
    if (id) {
      const optimistic = prev.map((a) => (a.id === id ? { ...a, name, items } : a));
      set({ incomeAllocations: optimistic });
    } else {
      const created: IncomeAllocation = {
        id: newId(),
        name,
        isActive: prev.length === 0,
        items,
        createdAt: new Date().toISOString(),
      };
      const next = [created, ...prev.map((a) => ({ ...a, isActive: created.isActive ? false : a.isActive }))];
      set({ incomeAllocations: next });

      // Insert one income transaction per source with amount > 0.
      const incomeCategory = CATEGORIES.find((c) => c.id === 'income')!;
      const dateStr = currentMonthFirstDay();
      for (const item of items) {
        if (item.amount <= 0) continue;
        const label = INCOME_SOURCE_LABELS[item.sourceId] ?? item.sourceId;
        const tx: Transaction = {
          id: newId(),
          raw: `${label.toLowerCase()} ${item.amount}`,
          amount: item.amount,
          merchant: label,
          category: incomeCategory,
          date: dateStr,
          type: 'income',
          paymentMethod: 'bank',
          confidence: 1,
          createdAt: new Date().toISOString(),
        };
        get().addTransaction(tx);
      }
    }
  },

  async activateIncomeAllocationById(allocationId) {
    const prev = get().incomeAllocations;
    set({ incomeAllocations: prev.map((a) => ({ ...a, isActive: a.id === allocationId })) });
  },

  async deleteIncomeAllocationById(allocationId) {
    const prev = get().incomeAllocations;
    if (prev.length === 1) return;
    const target = prev.find((a) => a.id === allocationId);
    if (!target) return;
    const remaining = prev.filter((a) => a.id !== allocationId);
    const promoted = target.isActive
      ? remaining.map((a, i) => ({ ...a, isActive: i === 0 }))
      : remaining;
    set({ incomeAllocations: promoted });
  },

  getTotalPlannedIncome() {
    const active = get().incomeAllocations.find((a) => a.isActive);
    if (!active) return 0;
    return active.items.reduce((s, i) => s + i.amount, 0);
  },

  // ─── Custom / hidden categories ─────────────────────────────────────────────

  async addCustomCategory(name, icon, textColor, bgColor) {
    const created: CustomCategory = { id: newId(), name, icon, textColor, bgColor, createdAt: new Date().toISOString() };
    set((state) => ({ customCategories: [...state.customCategories, created] }));
    return created;
  },

  async removeCustomCategory(id) {
    set((state) => ({ customCategories: state.customCategories.filter((c) => c.id !== id) }));
  },

  async hidePresetCategory(categoryId) {
    const prev = get().hiddenCategories;
    if (prev.includes(categoryId)) return;
    set({ hiddenCategories: [...prev, categoryId] });
  },

  async unhidePresetCategory(categoryId) {
    set((state) => ({ hiddenCategories: state.hiddenCategories.filter((id) => id !== categoryId) }));
  },

  // ─── Transactions ────────────────────────────────────────────────────────────

  addTransaction(tx) {
    set((state) => ({ transactions: [tx, ...state.transactions] }));
  },

  deleteTransaction(id) {
    set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }));
  },

  updateTransaction(id, patch) {
    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  },

  async bulkChangeCategory(ids, category) {
    if (ids.length === 0) return true;
    const prev = get().transactions;
    // Debt-linked entries are managed on the Debts page — never bulk-reassign.
    const targetIds = ids.filter((id) => {
      const tx = prev.find((t) => t.id === id);
      return tx && tx.category.id !== 'debts';
    });
    if (targetIds.length === 0) return true;
    const targetSet = new Set(targetIds);
    const type = typeForCategory(category.id);
    set((state) => ({
      transactions: state.transactions.map((t) =>
        targetSet.has(t.id) ? { ...t, category, type } : t,
      ),
    }));
    return true;
  },

  async bulkChangeDate(ids, date) {
    if (ids.length === 0) return true;
    const idSet = new Set(ids);
    set((state) => ({
      transactions: state.transactions.map((t) => (idSet.has(t.id) ? { ...t, date } : t)),
    }));
    return true;
  },

  async bulkDelete(ids) {
    if (ids.length === 0) return true;
    const prev = get().transactions;
    // Debt-linked entries are managed on the Debts page — skip them.
    const targetIds = ids.filter((id) => {
      const tx = prev.find((t) => t.id === id);
      return tx && tx.category.id !== 'debts';
    });
    if (targetIds.length === 0) return true;
    const targetSet = new Set(targetIds);
    set((state) => ({
      transactions: state.transactions.filter((t) => !targetSet.has(t.id)),
    }));
    return true;
  },

  learnCategory(merchantKey, categoryId) {
    if (!merchantKey) return;
    set((state) => ({
      learnedMerchants: {
        ...state.learnedMerchants,
        [merchantKey.toLowerCase().trim()]: categoryId,
      },
    }));
  },

  getByCategory(categoryId) {
    return get().transactions.filter((t) => t.category.id === categoryId);
  },

  getByDate(date) {
    return get().transactions.filter((t) => t.date === date);
  },

  getMonthlyTotal(type) {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    // Expenses sum via spendAmount so reimbursements subtract from the total;
    // income sums raw amounts as before.
    return get()
      .transactions.filter((t) => t.type === type && t.date.startsWith(yearMonth))
      .reduce((sum, t) => sum + (type === 'expense' ? spendAmount(t) : t.amount), 0);
  },

  getDailyTotal(date, type) {
    return get()
      .transactions.filter((t) => t.date === date && (type ? t.type === type : true))
      // netAmount signs each entry: income +, expense −, reimbursement +, and
      // transfers/debts net to zero.
      .reduce((sum, t) => sum + netAmount(t), 0);
  },

  // ─── Debts ────────────────────────────────────────────────────────────────

  async addDebt({ personName, direction, principal, note, dueDate, date }) {
    // A debt principal is money moving between the user's own pockets — logged
    // as a `transfer` (excluded from income/expense totals). Only interest is a
    // real expense/income, handled at repayment time.
    const debtCategory = CATEGORIES.find((c) => c.id === 'debts')!;
    const txId = newId();
    const label = direction === 'owed_to_me' ? `Lent to ${personName}` : `Borrowed from ${personName}`;
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
    };
    const debt: Debt = {
      id: newId(),
      personName,
      direction,
      principal,
      note,
      isSettled: false,
      dueDate,
      repayments: [],
      transactionId: txId,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ debts: [debt, ...state.debts] }));
    get().addTransaction(tx);
  },

  async updateDebt(debtId, { personName, direction, principal, note, dueDate }) {
    const debt = get().debts.find((d) => d.id === debtId);
    if (!debt) return;
    set((state) => ({
      debts: state.debts.map((d) =>
        d.id === debtId ? { ...d, personName, direction, principal, note, dueDate } : d,
      ),
    }));
    // Keep the linked origination transfer in step with the edited debt.
    if (debt.transactionId) {
      const label = direction === 'owed_to_me' ? `Lent to ${personName}` : `Borrowed from ${personName}`;
      get().updateTransaction(debt.transactionId, {
        merchant: label,
        amount: principal,
        type: 'transfer',
        note,
      });
    }
  },

  async recordDebtRepayment(debtId, { amount, interest = 0, date }) {
    const debt = get().debts.find((d) => d.id === debtId);
    if (!debt) return;

    const debtCategory = CATEGORIES.find((c) => c.id === 'debts')!;
    const now = new Date().toISOString();

    // Principal is a transfer (excluded from totals); skipped for interest-only.
    let principalTxId: string | undefined;
    let principalTx: Transaction | undefined;
    if (amount > 0) {
      principalTxId = newId();
      const principalLabel = debt.direction === 'owed_to_me' ? `${debt.personName} repaid` : `Repaid ${debt.personName}`;
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
      };
    }

    // Interest IS a real gain/cost: income when owed to you, expense when you owe.
    let interestTxId: string | undefined;
    let interestTx: Transaction | undefined;
    if (interest > 0) {
      interestTxId = newId();
      const interestLabel = debt.direction === 'owed_to_me' ? `Interest from ${debt.personName}` : `Interest to ${debt.personName}`;
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
      };
    }

    const repayment = {
      id: newId(),
      amount,
      interest,
      date,
      transactionId: principalTxId,
      interestTransactionId: interestTxId,
      createdAt: now,
    };
    set((state) => ({
      debts: state.debts.map((d) =>
        d.id === debtId ? { ...d, repayments: [...d.repayments, repayment] } : d,
      ),
    }));
    if (principalTx) get().addTransaction(principalTx);
    if (interestTx) get().addTransaction(interestTx);
  },

  async toggleDebtSettled(debtId) {
    const debt = get().debts.find((d) => d.id === debtId);
    if (!debt) return;
    const next = !debt.isSettled;
    set((state) => ({
      debts: state.debts.map((d) => (d.id === debtId ? { ...d, isSettled: next } : d)),
    }));
  },

  async removeDebt(debtId) {
    const debt = get().debts.find((d) => d.id === debtId);
    if (!debt) return;
    set((state) => ({ debts: state.debts.filter((d) => d.id !== debtId) }));
    const linkedTxIds = [
      debt.transactionId,
      ...debt.repayments.flatMap((r) => [r.transactionId, r.interestTransactionId]),
    ].filter((id): id is string => Boolean(id));
    for (const id of linkedTxIds) get().deleteTransaction(id);
  },

  // ─── Wallets ──────────────────────────────────────────────────────────────
  //
  // A wallet is a pocket the user sets money aside into. Moving money in or out
  // is NOT spending/earning — it's cash shuffling between the user's own
  // pockets, so every movement logs a `transfer` ledger transaction (excluded
  // from income/expense totals), exactly like debts.

  async addWallet({ name, kind, target, note, initialAmount, date }) {
    const meta = resolveWalletKind(kind);
    const wallet: Wallet = {
      id: newId(),
      name,
      kind,
      icon: meta.icon,
      color: meta.color,
      target,
      note,
      isArchived: false,
      movements: [],
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ wallets: [wallet, ...state.wallets] }));
    // An opening balance is just a first deposit into the new wallet.
    if (initialAmount && initialAmount > 0) {
      await get().recordWalletMovement(wallet.id, { type: 'deposit', amount: initialAmount, date });
    }
  },

  async updateWallet(walletId, { name, kind, target, note }) {
    const wallet = get().wallets.find((w) => w.id === walletId);
    if (!wallet) return;
    const meta = resolveWalletKind(kind);
    set((state) => ({
      wallets: state.wallets.map((w) =>
        w.id === walletId ? { ...w, name, kind, icon: meta.icon, color: meta.color, target, note } : w,
      ),
    }));
  },

  async recordWalletMovement(walletId, { type, amount, note, date }) {
    const wallet = get().wallets.find((w) => w.id === walletId);
    if (!wallet || amount <= 0) return;

    const transfersCategory = CATEGORIES.find((c) => c.id === 'transfers')!;
    const txId = newId();
    const label = type === 'deposit' ? `Deposit to ${wallet.name}` : `Withdraw from ${wallet.name}`;
    const tx: Transaction = {
      id: txId,
      raw: `${label} ${amount}`,
      amount,
      merchant: label,
      category: transfersCategory,
      date,
      type: 'transfer',
      paymentMethod: 'bank',
      confidence: 1,
      note,
      createdAt: new Date().toISOString(),
    };
    const movement: WalletMovement = {
      id: newId(),
      type,
      amount,
      date,
      note,
      source: 'manual',
      transactionId: txId,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      wallets: state.wallets.map((w) =>
        w.id === walletId ? { ...w, movements: [...w.movements, movement] } : w,
      ),
    }));
    get().addTransaction(tx);
  },

  async attachWalletMovement(walletId, { type, amount, date, note, transactionId }) {
    const wallet = get().wallets.find((w) => w.id === walletId);
    if (!wallet || amount <= 0) return;
    // The linked ledger transaction already exists; only persist the movement.
    const movement: WalletMovement = {
      id: newId(),
      type,
      amount,
      date,
      note,
      source: 'linked',
      transactionId,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      wallets: state.wallets.map((w) =>
        w.id === walletId ? { ...w, movements: [...w.movements, movement] } : w,
      ),
    }));
  },

  async removeWalletMovement(walletId, movementId) {
    const wallet = get().wallets.find((w) => w.id === walletId);
    if (!wallet) return;
    const movement = wallet.movements.find((m) => m.id === movementId);
    if (!movement) return;
    set((state) => ({
      wallets: state.wallets.map((w) =>
        w.id === walletId ? { ...w, movements: w.movements.filter((m) => m.id !== movementId) } : w,
      ),
    }));
    // Only 'manual' movements own their linked app-created transfer.
    if (movement.source === 'manual' && movement.transactionId) {
      get().deleteTransaction(movement.transactionId);
    }
  },

  async toggleWalletArchived(walletId) {
    const wallet = get().wallets.find((w) => w.id === walletId);
    if (!wallet) return;
    const next = !wallet.isArchived;
    set((state) => ({
      wallets: state.wallets.map((w) => (w.id === walletId ? { ...w, isArchived: next } : w)),
    }));
  },

  async removeWallet(walletId) {
    const wallet = get().wallets.find((w) => w.id === walletId);
    if (!wallet) return;
    set((state) => ({ wallets: state.wallets.filter((w) => w.id !== walletId) }));
    // Clean up only app-owned transfers (manual movements); real expense/income
    // entries survive.
    const ownedTxIds = wallet.movements
      .filter((m) => m.source === 'manual')
      .map((m) => m.transactionId)
      .filter((id): id is string => Boolean(id));
    for (const id of ownedTxIds) get().deleteTransaction(id);
  },
}));
