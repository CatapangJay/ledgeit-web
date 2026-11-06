import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  BudgetAllocation,
  BudgetAllocationItem,
  BudgetCarryover,
  BudgetLimit,
  CarryoverDestination,
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
import { CATEGORIES, typeForCategory, resolveWalletKind, resolveCategory, spendAmount, netAmount } from '@ledgeit/core';
import {
  mockBudgetAllocations,
  mockBudgetLimits,
  mockCustomCategories,
  mockDebts,
  mockTransactions,
  mockWallets,
} from '@/lib/mockData';
import { newId } from '@/lib/id';

// ─── Mobile store ────────────────────────────────────────────────────────────
// Mirrors the action/selector surface of apps/web/src/lib/store.ts 1:1 so
// components ported from web read/write via `useStore((s) => s.x)` unchanged.
// Every action mutates local state synchronously and the store is persisted to
// the device (AsyncStorage) — that's the whole story for free users. For
// premium users, lib/sync/syncEngine.ts watches this store and mirrors changes
// to Supabase so the same data is available on web and other devices.
// The async signatures (Promise-returning) are kept identical to web.

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

// Local-time 'YYYY-MM' key for the current calendar month. Budget snapshots are
// keyed by this so historical months keep the limits that applied then.
function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// 'YYYY-MM' key `offset` months from a given 'YYYY-MM' key (+1 = the month
// after). Resolves a carryover's destination month.
function monthKeyFrom(key: string, offset: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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

// Resolve the effective current-month limits from a set of allocations.
function activeLimitsOf(allocations: BudgetAllocation[]): BudgetLimit[] {
  const active = allocations.find((a) => a.isActive);
  return active ? allocationToLimits(active) : DEFAULT_BUDGETS;
}

// State patch that swaps in a new allocation set, keeps `budgetLimits` in step,
// and freezes the result as the current month's snapshot (web persists this to
// `budget_limits` via persistCurrentMonthSnapshot; here it lives in memory).
// Only a REAL active plan is snapshotted — DEFAULT_BUDGETS would make a
// never-configured month show phantom limits historically.
function applyActiveLimits(
  allocations: BudgetAllocation[],
  byMonth: Record<string, BudgetLimit[]>,
): Pick<StoreState, 'budgetAllocations' | 'budgetLimits' | 'budgetLimitsByMonth'> {
  const limits = activeLimitsOf(allocations);
  const hasRealPlan = allocations.some((a) => a.isActive);
  return {
    budgetAllocations: allocations,
    budgetLimits: limits,
    budgetLimitsByMonth: hasRealPlan ? { ...byMonth, [currentMonthKey()]: limits } : byMonth,
  };
}

// ─── Store Definition ─────────────────────────────────────────────────────────

interface StoreState {
  transactions: Transaction[];
  /** Limits for the CURRENT month, derived from the active allocation plan. */
  budgetLimits: BudgetLimit[];
  /** Per-month snapshots of limits, keyed 'YYYY-MM'. A key mapping to [] means
   *  "loaded, no snapshot existed" — distinct from absent (not yet loaded). The
   *  current month is always served from `budgetLimits`. */
  budgetLimitsByMonth: Record<string, BudgetLimit[]>;
  budgetAllocations: BudgetAllocation[];
  customCategories: CustomCategory[];
  /** Ids of preset categories the user has hidden ("deleted"). */
  hiddenCategories: string[];
  /** Merchant key → category id learned from user corrections. */
  learnedMerchants: Record<string, string>;
  incomeAllocations: IncomeAllocation[];
  debts: Debt[];
  wallets: Wallet[];
  /** End-of-month budget carryovers the user has rolled forward (all months). */
  budgetCarryovers: BudgetCarryover[];
  /** 'YYYY-MM' of the last end-of-month recap the user acknowledged (null = none). */
  lastRecapMonth: string | null;
  /** True while the store still holds the dev sample dataset. A cloud link
   *  replaces sample data instead of uploading it. */
  isSampleData: boolean;
}

interface StoreActions {
  // ── Budget allocations ──────────────────────────────────────────────────────
  saveBudgetAllocation: (payload: { id?: string; name: string; items: BudgetAllocationItem[] }) => Promise<void>;
  activateAllocation: (allocationId: string) => Promise<void>;
  deleteAllocation: (allocationId: string) => Promise<void>;
  hasSetupBudget: () => boolean;
  /** Ensure the per-month limit snapshot for 'YYYY-MM' is in
   *  `budgetLimitsByMonth`. No-op for the current month (served live) and
   *  idempotent per month. */
  loadBudgetLimitsForMonth: (monthKey: string) => Promise<void>;
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
  addWallet: (payload: { name: string; kind: WalletKind; icon?: string; color?: string; target?: number; note?: string; initialAmount?: number; date: string }) => Promise<void>;
  updateWallet: (walletId: string, payload: { name: string; kind: WalletKind; icon?: string; color?: string; target?: number; note?: string }) => Promise<void>;
  /** Move money into (deposit) or out of (withdrawal) a wallet. Logs a linked transfer.
   *  An optional `category` tags the transfer for identification without changing
   *  its transfer nature (still excluded from spending/income analytics). */
  recordWalletMovement: (walletId: string, payload: { type: WalletMovementType; amount: number; note?: string; date: string; category?: Category }) => Promise<void>;
  attachWalletMovement: (walletId: string, payload: { type: WalletMovementType; amount: number; date: string; note?: string; transactionId: string }) => Promise<void>;
  removeWalletMovement: (walletId: string, movementId: string) => Promise<void>;
  /** Re-sync an expense/income entry's linked wallet movement after an edit:
   *  moves it to `walletId` (or unlinks it when undefined) and mirrors the
   *  entry's current amount/date/type. Entries that are no longer expense/income
   *  are unlinked; carryover transfers are left alone. */
  setTransactionWallet: (transactionId: string, walletId: string | undefined) => Promise<void>;
  toggleWalletArchived: (walletId: string) => Promise<void>;
  removeWallet: (walletId: string) => Promise<void>;
  // ── Budget carryovers ─────────────────────────────────────────────────────
  /** Roll a category's end-of-month balance from `fromMonth` into the next month.
   *  `amount` is signed (positive = leftover, negative = overage). destination
   *  'category' adjusts next month's effective limit; 'wallet' moves the balance
   *  into/out of `walletId`. Logs a linked `transfer`. Resolves true on success. */
  applyCarryover: (payload: {
    categoryId: string;
    categoryLabel: string;
    fromMonth: string;
    amount: number;
    destination: CarryoverDestination;
    walletId?: string;
  }) => Promise<boolean>;
  /** Undo a carryover: deletes it, its linked transfer, and any wallet movement. */
  removeCarryover: (carryoverId: string) => Promise<void>;
  // ── End-of-month recap ────────────────────────────────────────────────────
  /** Record that the user has seen the recap for the given 'YYYY-MM' month. */
  markRecapSeen: (month: string) => Promise<void>;
  // ── Cloud sync (premium) ──────────────────────────────────────────────────
  /** Replace all synced data with a cloud copy; `budgetLimits` is re-derived. */
  replaceSyncData: (data: SyncData) => void;
  /** Wipe all local data back to an empty, never-configured state. */
  resetLocalData: () => void;
}

export type AppStore = StoreState & StoreActions;

/** The slice of state mirrored to Supabase for premium users. `learnedMerchants`
 *  has no cloud table (web keeps it in memory too) so it stays device-local, and
 *  `budgetLimits` is derived from the active allocation. */
export type SyncData = Pick<
  StoreState,
  | 'transactions'
  | 'budgetLimitsByMonth'
  | 'budgetAllocations'
  | 'customCategories'
  | 'hiddenCategories'
  | 'incomeAllocations'
  | 'debts'
  | 'wallets'
  | 'budgetCarryovers'
  | 'lastRecapMonth'
>;

export function pickSyncData(s: StoreState): SyncData {
  return {
    transactions: s.transactions,
    budgetLimitsByMonth: s.budgetLimitsByMonth,
    budgetAllocations: s.budgetAllocations,
    customCategories: s.customCategories,
    hiddenCategories: s.hiddenCategories,
    incomeAllocations: s.incomeAllocations,
    debts: s.debts,
    wallets: s.wallets,
    budgetCarryovers: s.budgetCarryovers,
    lastRecapMonth: s.lastRecapMonth,
  };
}

const EMPTY_STATE: StoreState = {
  transactions: [],
  budgetLimits: DEFAULT_BUDGETS,
  budgetLimitsByMonth: {},
  budgetAllocations: [],
  customCategories: [],
  hiddenCategories: [],
  learnedMerchants: {},
  incomeAllocations: [],
  debts: [],
  wallets: [],
  budgetCarryovers: [],
  lastRecapMonth: null,
  isSampleData: false,
};

// Dev builds start from the mock dataset so screens have something to show;
// release builds start empty. Either way, persisted data replaces this on load.
const INITIAL_STATE: StoreState = __DEV__
  ? {
      ...EMPTY_STATE,
      transactions: mockTransactions,
      budgetLimits: mockBudgetLimits,
      budgetLimitsByMonth: mockBudgetAllocations.some((a) => a.isActive)
        ? { [currentMonthKey()]: mockBudgetLimits }
        : {},
      budgetAllocations: mockBudgetAllocations,
      customCategories: mockCustomCategories,
      debts: mockDebts,
      wallets: mockWallets,
      isSampleData: true,
    }
  : EMPTY_STATE;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppStore>()(
  persist(
  (set, get) => ({
  ...INITIAL_STATE,

  // ─── Budget Allocations ───────────────────────────────────────────────────

  async saveBudgetAllocation({ id, name, items }) {
    const prev = get().budgetAllocations;
    if (id) {
      const optimistic = prev.map((a) => (a.id === id ? { ...a, name, items } : a));
      set(applyActiveLimits(optimistic, get().budgetLimitsByMonth));
    } else {
      const created: BudgetAllocation = {
        id: newId(),
        name,
        isActive: prev.length === 0,
        items,
        createdAt: new Date().toISOString(),
      };
      const next = [created, ...prev.map((a) => ({ ...a, isActive: created.isActive ? false : a.isActive }))];
      set(applyActiveLimits(next, get().budgetLimitsByMonth));
    }
  },

  async activateAllocation(allocationId) {
    const prev = get().budgetAllocations;
    const optimistic = prev.map((a) => ({ ...a, isActive: a.id === allocationId }));
    set(applyActiveLimits(optimistic, get().budgetLimitsByMonth));
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
    set(applyActiveLimits(promoted, get().budgetLimitsByMonth));
  },

  hasSetupBudget() {
    return get().budgetAllocations.length > 0;
  },

  async loadBudgetLimitsForMonth(monthKey) {
    // The current (and any future) month is served live from `budgetLimits`.
    if (monthKey >= currentMonthKey()) return;
    // Idempotent: already resolved (even if the snapshot was empty).
    if (get().budgetLimitsByMonth[monthKey] !== undefined) return;
    // Mock-phase stand-in for web's fetch + one-time backfill: a past month with
    // activity is seeded from the current plan (the only budget the app has ever
    // recorded); one without activity, or with no real plan, stays blank.
    // Without a real plan, leave the month unresolved rather than caching [] — a
    // plan created later can then still seed it (web's backfill covers this case).
    const hasRealPlan = get().budgetAllocations.some((a) => a.isActive);
    if (!hasRealPlan) return;
    // Carryover transfers are bookkeeping, not activity.
    const carryoverTxIds = new Set(get().budgetCarryovers.map((c) => c.transactionId));
    const hadActivity = get().transactions.some((t) => t.date.startsWith(monthKey) && !carryoverTxIds.has(t.id));
    const limits = hadActivity ? get().budgetLimits : [];
    set({ budgetLimitsByMonth: { ...get().budgetLimitsByMonth, [monthKey]: limits } });
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

  async addWallet({ name, kind, icon, color, target, note, initialAmount, date }) {
    const meta = resolveWalletKind(kind);
    const wallet: Wallet = {
      id: newId(),
      name,
      kind,
      // Icon/color default to the kind's, but the user can override either.
      icon: icon ?? meta.icon,
      color: color ?? meta.color,
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

  async updateWallet(walletId, { name, kind, icon, color, target, note }) {
    const wallet = get().wallets.find((w) => w.id === walletId);
    if (!wallet) return;
    const meta = resolveWalletKind(kind);
    // Explicit icon/color from the form win; otherwise fall back to the
    // (possibly changed) kind's defaults.
    const nextIcon = icon ?? meta.icon;
    const nextColor = color ?? meta.color;
    set((state) => ({
      wallets: state.wallets.map((w) =>
        w.id === walletId ? { ...w, name, kind, icon: nextIcon, color: nextColor, target, note } : w,
      ),
    }));
  },

  async recordWalletMovement(walletId, { type, amount, note, date, category }) {
    const wallet = get().wallets.find((w) => w.id === walletId);
    if (!wallet || amount <= 0) return;

    // The user can tag the transfer with the category the money came from / went
    // to (e.g. part of a Salary, or withdrawing for Groceries). It stays a
    // `transfer` regardless, so it never leaks into spending/income analytics.
    const transfersCategory = CATEGORIES.find((c) => c.id === 'transfers')!;
    const txId = newId();
    const label = type === 'deposit' ? `Deposit to ${wallet.name}` : `Withdraw from ${wallet.name}`;
    const tx: Transaction = {
      id: txId,
      raw: `${label} ${amount}`,
      amount,
      merchant: label,
      category: category ?? transfersCategory,
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
    // A movement created by a budget carryover can't be removed on its own — that
    // would orphan the carryover and its transfer (and block re-carrying). Undo
    // the whole carryover instead; it calls back here once its record is gone.
    const carryover = movement.transactionId
      ? get().budgetCarryovers.find((c) => c.destination === 'wallet' && c.transactionId === movement.transactionId)
      : undefined;
    if (carryover) return get().removeCarryover(carryover.id);
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

  async setTransactionWallet(transactionId, walletId) {
    const tx = get().transactions.find((t) => t.id === transactionId);
    if (!tx) return;
    // Carryover transfers own their wallet movement — managed via removeCarryover.
    if (get().budgetCarryovers.some((c) => c.transactionId === transactionId)) return;
    // Only plain expense/income can be paid from / saved into a wallet.
    if (tx.type !== 'expense' && tx.type !== 'income') walletId = undefined;
    const type: WalletMovementType = tx.type === 'income' ? 'deposit' : 'withdrawal';

    let current: { walletId: string; movement: WalletMovement } | null = null;
    for (const w of get().wallets) {
      const m = w.movements.find((mv) => mv.source === 'linked' && mv.transactionId === transactionId);
      if (m) { current = { walletId: w.id, movement: m }; break; }
    }

    // Already in sync — nothing to do.
    if (
      current &&
      current.walletId === walletId &&
      current.movement.type === type &&
      current.movement.amount === tx.amount &&
      current.movement.date === tx.date
    ) return;
    if (!current && !walletId) return;

    if (current) await get().removeWalletMovement(current.walletId, current.movement.id);
    if (walletId) {
      await get().attachWalletMovement(walletId, {
        type,
        amount: tx.amount,
        date: tx.date,
        note: current?.movement.note,
        transactionId,
      });
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
    // Undo carryovers routed through this wallet first, so they don't outlive it.
    for (const c of get().budgetCarryovers.filter((c) => c.walletId === walletId)) {
      await get().removeCarryover(c.id);
    }
    set((state) => ({ wallets: state.wallets.filter((w) => w.id !== walletId) }));
    // Clean up only app-owned transfers (manual movements); real expense/income
    // entries survive.
    const ownedTxIds = wallet.movements
      .filter((m) => m.source === 'manual')
      .map((m) => m.transactionId)
      .filter((id): id is string => Boolean(id));
    for (const id of ownedTxIds) get().deleteTransaction(id);
  },

  // ─── Budget carryovers ──────────────────────────────────────────────────────
  //
  // At the end of a month, each budgeted category is either under its limit (a
  // leftover) or over it (an overage). From the recap the user can roll that
  // balance into the next month: either as a one-month adjustment to that
  // category's budget, or into/out of a wallet. Both are logged as `transfer`
  // transactions, so they're tracked in history but never count toward the
  // destination month's spending/income.

  async applyCarryover({ categoryId, categoryLabel, fromMonth, amount, destination, walletId }) {
    // Nothing to roll forward.
    if (amount === 0) return false;
    // One carryover per category per month — don't double-roll.
    if (get().budgetCarryovers.some((c) => c.categoryId === categoryId && c.fromMonth === fromMonth)) {
      return false;
    }
    if (destination === 'wallet' && !get().wallets.some((w) => w.id === walletId)) return false;

    const toMonth = monthKeyFrom(fromMonth, 1);
    const date = `${toMonth}-01`;
    const transfersCategory = CATEGORIES.find((c) => c.id === 'transfers')!;
    const now = new Date().toISOString();

    const txId = newId();
    const label =
      destination === 'wallet'
        ? amount > 0
          ? `${categoryLabel} leftover → wallet`
          : `${categoryLabel} overage ← wallet`
        : amount > 0
          ? `${categoryLabel} leftover carried over`
          : `${categoryLabel} overage carried over`;
    const tx: Transaction = {
      id: txId,
      raw: `${label} ${Math.abs(amount)}`,
      amount: Math.abs(amount),
      merchant: label,
      category: destination === 'wallet' ? transfersCategory : resolveCategory(categoryId, get().customCategories),
      date,
      type: 'transfer',
      paymentMethod: 'bank',
      confidence: 1,
      note: `Carried from ${fromMonth}`,
      createdAt: now,
    };
    const carryover: BudgetCarryover = {
      id: newId(),
      categoryId,
      fromMonth,
      toMonth,
      amount,
      destination,
      walletId: destination === 'wallet' ? walletId : undefined,
      transactionId: txId,
      createdAt: now,
    };
    set((state) => ({ budgetCarryovers: [carryover, ...state.budgetCarryovers] }));
    get().addTransaction(tx);

    if (destination === 'wallet' && walletId) {
      // A leftover deposits into the wallet; an overage withdraws from it to
      // cover the overspend. The transfer above IS the money movement, so attach
      // (don't create a second transfer).
      await get().attachWalletMovement(walletId, {
        type: amount > 0 ? 'deposit' : 'withdrawal',
        amount: Math.abs(amount),
        date,
        note: amount > 0 ? `${categoryLabel} leftover from ${fromMonth}` : `${categoryLabel} overage from ${fromMonth}`,
        transactionId: txId,
      });
    }
    return true;
  },

  async removeCarryover(carryoverId) {
    const carryover = get().budgetCarryovers.find((c) => c.id === carryoverId);
    if (!carryover) return;
    set((state) => ({ budgetCarryovers: state.budgetCarryovers.filter((c) => c.id !== carryoverId) }));

    if (carryover.destination === 'wallet' && carryover.walletId && carryover.transactionId) {
      const wallet = get().wallets.find((w) => w.id === carryover.walletId);
      const movement = wallet?.movements.find((m) => m.transactionId === carryover.transactionId);
      // removeWalletMovement leaves a 'linked' movement's transaction alone, so
      // the transfer is deleted explicitly below.
      if (wallet && movement) await get().removeWalletMovement(wallet.id, movement.id);
    }
    if (carryover.transactionId) get().deleteTransaction(carryover.transactionId);
  },

  // ─── End-of-month recap ─────────────────────────────────────────────────────

  async markRecapSeen(month) {
    if (get().lastRecapMonth === month) return;
    set({ lastRecapMonth: month });
  },

  // ─── Cloud sync (premium) ───────────────────────────────────────────────────

  replaceSyncData(data) {
    set({ ...data, budgetLimits: activeLimitsOf(data.budgetAllocations), isSampleData: false });
  },

  resetLocalData() {
    set(EMPTY_STATE);
  },
  }),
  {
    name: 'ledgeit-store',
    version: 1,
    storage: createJSONStorage(() => AsyncStorage),
    // Persist data only — actions are recreated on load.
    partialize: (s): StoreState => ({
      transactions: s.transactions,
      budgetLimits: s.budgetLimits,
      budgetLimitsByMonth: s.budgetLimitsByMonth,
      budgetAllocations: s.budgetAllocations,
      customCategories: s.customCategories,
      hiddenCategories: s.hiddenCategories,
      learnedMerchants: s.learnedMerchants,
      incomeAllocations: s.incomeAllocations,
      debts: s.debts,
      wallets: s.wallets,
      budgetCarryovers: s.budgetCarryovers,
      lastRecapMonth: s.lastRecapMonth,
      isSampleData: s.isSampleData,
    }),
  },
  ),
);
