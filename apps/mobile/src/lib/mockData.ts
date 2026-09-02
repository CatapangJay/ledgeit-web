import { CATEGORIES, resolveCategory, resolveWalletKind, type Transaction, type BudgetLimit, type BudgetAllocation, type CustomCategory, type Debt, type Wallet } from '@ledgeit/core';

// ─── Mock data ────────────────────────────────────────────────────────────────
// Placeholder dataset for UI development before the real data layer (SQLite +
// Drizzle, per .docs/MOBILE_ARCHITECTURE.md) lands. Dates are generated
// relative to "now" so the dashboard always looks current regardless of when
// the app is run. Swap `useStore`'s internals for a real DataProvider later —
// the component layer reading from the store shouldn't need to change.

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function cat(id: string) {
  return resolveCategory(id);
}

let seq = 0;
function nextId(): string {
  seq += 1;
  return `mock-${seq}`;
}

function makeTx(partial: {
  amount: number;
  merchant: string;
  categoryId: string;
  date: Date;
  type?: Transaction['type'];
  raw?: string;
  paymentMethod?: Transaction['paymentMethod'];
  isRecurring?: boolean;
  isReimbursement?: boolean;
}): Transaction {
  const date = isoDate(partial.date);
  return {
    id: nextId(),
    raw: partial.raw ?? `${partial.amount} ${partial.merchant}`,
    amount: partial.amount,
    merchant: partial.merchant,
    category: cat(partial.categoryId),
    date,
    type: partial.type ?? 'expense',
    isRecurring: partial.isRecurring,
    isReimbursement: partial.isReimbursement,
    paymentMethod: partial.paymentMethod ?? 'cash',
    confidence: 0.95,
    createdAt: `${date}T09:00:00.000Z`,
  };
}

function firstOfMonth(monthsAgo = 0): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
}

export const mockTransactions: Transaction[] = [
  // ── Income ──────────────────────────────────────────────────────────────
  makeTx({ amount: 45000, merchant: 'Salary', categoryId: 'income', date: firstOfMonth(0), type: 'income' }),
  makeTx({ amount: 42000, merchant: 'Salary', categoryId: 'income', date: firstOfMonth(1), type: 'income' }),

  // ── This month, spread across days ─────────────────────────────────────
  makeTx({ amount: 185, merchant: 'Starbucks', categoryId: 'restaurants', date: daysAgo(0) }),
  makeTx({ amount: 320, merchant: 'Jollibee', categoryId: 'restaurants', date: daysAgo(0) }),
  makeTx({ amount: 1450, merchant: 'SM Supermarket', categoryId: 'groceries', date: daysAgo(1) }),
  makeTx({ amount: 180, merchant: 'Grab', categoryId: 'transport', date: daysAgo(1) }),
  makeTx({ amount: 899, merchant: 'Shopee', categoryId: 'shopping', date: daysAgo(2) }),
  makeTx({ amount: 2400, merchant: 'Meralco', categoryId: 'utilities', date: daysAgo(3), isRecurring: true }),
  makeTx({ amount: 549, merchant: 'Netflix', categoryId: 'entertainment', date: daysAgo(4), isRecurring: true }),
  makeTx({ amount: 650, merchant: 'Watsons', categoryId: 'health', date: daysAgo(5) }),
  makeTx({ amount: 220, merchant: 'Grab', categoryId: 'transport', date: daysAgo(6) }),
  makeTx({ amount: 780, merchant: 'Robinsons', categoryId: 'groceries', date: daysAgo(7) }),
  makeTx({ amount: 1200, merchant: 'Uniqlo', categoryId: 'shopping', date: daysAgo(8) }),
  makeTx({ amount: 165, merchant: 'Jollibee', categoryId: 'restaurants', date: daysAgo(9) }),
  makeTx({ amount: 3000, merchant: 'Savings Transfer', categoryId: 'savings', date: daysAgo(10) }),
  makeTx({ amount: 500, merchant: 'MP2', categoryId: 'investments', date: daysAgo(10) }),
  makeTx({ amount: 240, merchant: 'Grab', categoryId: 'transport', date: daysAgo(11) }),
  makeTx({ amount: 990, merchant: 'SM Supermarket', categoryId: 'groceries', date: daysAgo(12) }),
  makeTx({ amount: 5000, merchant: 'Credit Card Payment', categoryId: 'transfers', date: daysAgo(13), type: 'transfer' }),
  makeTx({ amount: 310, merchant: 'KFC', categoryId: 'restaurants', date: daysAgo(14) }),

  // ── Reimbursements — credited back, so they reduce category spend ─────────
  makeTx({ amount: 480, merchant: 'SM Supermarket', categoryId: 'groceries', date: daysAgo(2), raw: 'refund 480 sm supermarket', isReimbursement: true }),
  makeTx({ amount: 1200, merchant: 'Shopee', categoryId: 'shopping', date: daysAgo(5), raw: 'shopee rebate 1200', isReimbursement: true }),

  // ── Last month, lighter set for month-over-month comparisons ───────────
  makeTx({ amount: 1200, merchant: 'SM Supermarket', categoryId: 'groceries', date: new Date(firstOfMonth(1).getFullYear(), firstOfMonth(1).getMonth(), 5) }),
  makeTx({ amount: 2100, merchant: 'Meralco', categoryId: 'utilities', date: new Date(firstOfMonth(1).getFullYear(), firstOfMonth(1).getMonth(), 8) }),
  makeTx({ amount: 640, merchant: 'Grab', categoryId: 'transport', date: new Date(firstOfMonth(1).getFullYear(), firstOfMonth(1).getMonth(), 12) }),
  makeTx({ amount: 420, merchant: 'Jollibee', categoryId: 'restaurants', date: new Date(firstOfMonth(1).getFullYear(), firstOfMonth(1).getMonth(), 15) }),
  makeTx({ amount: 3200, merchant: 'Shopee', categoryId: 'shopping', date: new Date(firstOfMonth(1).getFullYear(), firstOfMonth(1).getMonth(), 20) }),
];

export const mockBudgetLimits: BudgetLimit[] = [
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

export const mockBudgetAllocations: BudgetAllocation[] = [
  {
    id: 'mock-plan-1',
    name: 'Regular Month',
    isActive: true,
    items: mockBudgetLimits.map((b) => ({ categoryId: b.categoryId, limit: b.limit })),
    createdAt: new Date().toISOString(),
  },
];

export const mockCustomCategories: CustomCategory[] = [];

export const mockDebts: Debt[] = [
  {
    id: 'mock-debt-1',
    personName: 'Marco',
    direction: 'owed_to_me',
    principal: 3000,
    note: 'Concert tickets split',
    isSettled: false,
    dueDate: isoDate(daysAgo(-5)),
    repayments: [],
    createdAt: `${isoDate(daysAgo(20))}T09:00:00.000Z`,
  },
  {
    id: 'mock-debt-2',
    personName: 'Ate Rowena',
    direction: 'i_owe',
    principal: 5000,
    note: 'Emergency loan',
    isSettled: false,
    dueDate: isoDate(daysAgo(-1)),
    repayments: [
      { id: 'mock-repay-1', amount: 1500, interest: 0, date: isoDate(daysAgo(6)), createdAt: `${isoDate(daysAgo(6))}T09:00:00.000Z` },
    ],
    createdAt: `${isoDate(daysAgo(25))}T09:00:00.000Z`,
  },
];

// ─── Mock wallets ─────────────────────────────────────────────────────────────
// Named pockets the user sets money aside into. Each deposit/withdrawal is a
// `manual` movement carrying a linked transfer id — matching how the store
// creates them. Balances derive from movements via walletBalance().

function walletMovement(partial: {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  date: Date;
  note?: string;
}) {
  const date = isoDate(partial.date);
  return {
    id: partial.id,
    type: partial.type,
    amount: partial.amount,
    date,
    note: partial.note,
    source: 'manual' as const,
    transactionId: undefined,
    createdAt: `${date}T09:00:00.000Z`,
  };
}

function makeWallet(partial: {
  id: string;
  name: string;
  kind: Parameters<typeof resolveWalletKind>[0];
  target?: number;
  note?: string;
  movements: Wallet['movements'];
}): Wallet {
  const meta = resolveWalletKind(partial.kind);
  return {
    id: partial.id,
    name: partial.name,
    kind: meta.id,
    icon: meta.icon,
    color: meta.color,
    target: partial.target,
    note: partial.note,
    isArchived: false,
    movements: partial.movements,
    createdAt: `${isoDate(daysAgo(45))}T09:00:00.000Z`,
  };
}

export const mockWallets: Wallet[] = [
  makeWallet({
    id: 'mock-wallet-1',
    name: 'Emergency Fund',
    kind: 'emergency',
    target: 50000,
    movements: [
      walletMovement({ id: 'mock-wm-1', type: 'deposit', amount: 20000, date: daysAgo(40) }),
      walletMovement({ id: 'mock-wm-2', type: 'deposit', amount: 8000, date: daysAgo(10) }),
    ],
  }),
  makeWallet({
    id: 'mock-wallet-2',
    name: 'MP2 Savings',
    kind: 'investment',
    target: 100000,
    movements: [
      walletMovement({ id: 'mock-wm-3', type: 'deposit', amount: 15000, date: daysAgo(35) }),
      walletMovement({ id: 'mock-wm-4', type: 'deposit', amount: 5000, date: daysAgo(5) }),
    ],
  }),
  makeWallet({
    id: 'mock-wallet-3',
    name: 'Japan Trip',
    kind: 'goal',
    target: 80000,
    note: 'Cherry blossom season',
    movements: [
      walletMovement({ id: 'mock-wm-5', type: 'deposit', amount: 12000, date: daysAgo(30) }),
      walletMovement({ id: 'mock-wm-6', type: 'withdrawal', amount: 2000, date: daysAgo(3), note: 'Visa fee' }),
    ],
  }),
];

export { CATEGORIES };
