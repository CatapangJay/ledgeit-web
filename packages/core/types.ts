// ─── Category ────────────────────────────────────────────────────────────────

export type CategoryId =
  | 'restaurants'
  | 'groceries'
  | 'transport'
  | 'shopping'
  | 'utilities'
  | 'entertainment'
  | 'health'
  | 'savings'
  | 'investments'
  | 'education'
  | 'personal_care'
  | 'church'
  | 'gifts'
  | 'family'
  | 'kids'
  | 'subscriptions'
  | 'income'
  | 'transfers'
  | 'debts'
  | 'other'

export interface Category {
  id: string            // CategoryId for presets, UUID for custom categories
  label: string
  icon: string          // Phosphor icon name
  color: string         // Tailwind text color class
  bgColor: string       // Tailwind bg color class
  keywords: string[]
}

// Canonical category registry — single source of truth across parser + categorizer + UI
export const CATEGORIES: Category[] = [
  {
    id: 'restaurants',
    label: 'Restaurants & Eats',
    icon: 'ForkKnife',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    keywords: [
      'mcdonalds', 'mcdonald', 'mcd', 'jollibee', 'kfc', 'burger', 'pizza',
      'lunch', 'dinner', 'breakfast', 'brunch', 'cafe', 'coffee', 'starbucks',
      'restaurant', 'eat', 'food', 'snack', 'grill', 'bbq', 'sushi', 'ramen',
      'noodle', 'pasta', 'fastfood', 'takeout', 'delivery', 'shawarma',
    ],
  },
  {
    id: 'groceries',
    label: 'Groceries',
    icon: 'ShoppingCart',
    color: 'text-lime-700',
    bgColor: 'bg-lime-50',
    keywords: [
      'grocery', 'groceries', 'supermarket', 'sm', 'puregold', 'landers',
      'robinsons', 'market', 'produce', 'fresh', 'wet market', 'palengke',
      'fruit', 'vegetable', 'meat', 'seafood', 'dairy', 'eggs',
    ],
  },
  {
    id: 'transport',
    label: 'Transport',
    icon: 'Car',
    color: 'text-sky-700',
    bgColor: 'bg-sky-50',
    keywords: [
      'grab', 'uber', 'lyft', 'taxi', 'cab', 'bus', 'mrt', 'lrt', 'jeep',
      'jeepney', 'tricycle', 'angkas', 'toll', 'gas', 'fuel', 'gasoline',
      'diesel', 'parking', 'commute', 'fare', 'ride', 'transport',
    ],
  },
  {
    id: 'shopping',
    label: 'Shopping',
    icon: 'Bag',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    keywords: [
      'mall', 'shop', 'shopping', 'lazada', 'shopee', 'shein', 'amazon',
      'zalora', 'h&m', 'zara', 'uniqlo', 'clothing', 'clothes', 'shoes',
      'sneakers', 'gadget', 'electronics', 'phone', 'laptop', 'online',
    ],
  },
  {
    id: 'utilities',
    label: 'Utilities',
    icon: 'Lightning',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    keywords: [
      'electric', 'electricity', 'water', 'internet', 'wifi', 'meralco',
      'pldt', 'globe', 'smart', 'converge', 'bill', 'bills', 'subscription',
      'rent', 'condo', 'condo fee', 'association', 'dues', 'load', 'data',
    ],
  },
  {
    id: 'entertainment',
    label: 'Entertainment',
    icon: 'GameController',
    color: 'text-pink-700',
    bgColor: 'bg-pink-50',
    keywords: [
      'netflix', 'spotify', 'youtube', 'disney', 'hbo', 'prime', 'apple tv',
      'movie', 'cinema', 'sm cinema', 'concert', 'event', 'gaming', 'game',
      'steam', 'playstation', 'xbox', 'nintendo', 'mobile game', 'karaoke',
    ],
  },
  {
    id: 'health',
    label: 'Health & Wellness',
    icon: 'Heartbeat',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    keywords: [
      'hospital', 'clinic', 'pharmacy', 'doctor', 'medicine', 'meds',
      'dental', 'dentist', 'checkup', 'laboratory', 'lab', 'xray',
      'gym', 'fitness', 'wellness', 'vitamins', 'supplement', 'drugstore',
      'watsons', 'mercury', 'rose pharmacy',
    ],
  },
  {
    id: 'savings',
    label: 'Savings',
    icon: 'PiggyBank',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    keywords: [
      'savings', 'save', 'ipon', 'emergency fund', 'sinking fund', 'nabv',
      'piggy', 'cola', 'buffer', 'reserve', 'rainy day',
    ],
  },
  {
    id: 'investments',
    label: 'Investments',
    icon: 'TrendUp',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    keywords: [
      'invest', 'investment', 'stock', 'stocks', 'mutual fund', 'uitf', 'vul',
      'crypto', 'bitcoin', 'eth', 'psei', 'mp2', 'pag-ibig mp2',
      'philstocks', 'col financial', 'gcash invest', 'bonds', 'reit',
    ],
  },
  {
    id: 'education',
    label: 'Education',
    icon: 'GraduationCap',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    keywords: [
      'tuition', 'school', 'university', 'college', 'course', 'udemy',
      'coursera', 'book', 'books', 'training', 'seminar', 'workshop',
      'enrollment', 'allowance', 'school supply', 'notebook',
    ],
  },
  {
    id: 'personal_care',
    label: 'Personal Care',
    icon: 'Scissors',
    color: 'text-fuchsia-700',
    bgColor: 'bg-fuchsia-50',
    keywords: [
      'salon', 'haircut', 'barbershop', 'barber', 'beauty', 'spa', 'nails',
      'nail', 'massage', 'facial', 'skincare', 'skin care', 'grooming',
      'waxing', 'threading', 'lash', 'brow', 'manicure', 'pedicure',
    ],
  },
  {
    id: 'church',
    label: 'Church & Giving',
    icon: 'Church',
    color: 'text-amber-800',
    bgColor: 'bg-amber-50',
    keywords: [
      'church', 'tithe', 'tithes', 'offering', 'offerings', 'donation', 'donate',
      'charity', 'ministry', 'missions', 'mission', 'love offering', 'pledge',
      'alms', 'zakat', 'temple', 'mosque', 'diezmo',
    ],
  },
  {
    id: 'gifts',
    label: 'Gifts',
    icon: 'Gift',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    keywords: [
      'gift', 'gifts', 'present', 'presents', 'birthday', 'anniversary',
      'wedding', 'christmas', 'pasalubong', 'aguinaldo', 'regalo', 'souvenir',
      'flowers', 'bouquet',
    ],
  },
  {
    id: 'family',
    label: 'Family & Support',
    icon: 'UsersThree',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-50',
    keywords: [
      'family', 'parents', 'inay', 'tatay', 'nanay', 'mama', 'papa', 'mom',
      'dad', 'lola', 'lolo', 'support', 'padala', 'remittance', 'ayuda',
      'sustento', 'household', 'helper', 'yaya', 'kasambahay',
    ],
  },
  {
    id: 'kids',
    label: 'Kids & Childcare',
    icon: 'Baby',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    keywords: [
      'kids', 'kid', 'child', 'children', 'baby', 'diapers', 'diaper', 'milk',
      'formula', 'toys', 'toy', 'daycare', 'childcare', 'kiddie', 'playground',
      'stroller', 'nursery', 'pediatrician',
    ],
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    icon: 'CreditCard',
    color: 'text-slate-700',
    bgColor: 'bg-slate-50',
    keywords: [
      'subscription', 'subscriptions', 'membership', 'plan', 'icloud',
      'google one', 'dropbox', 'notion', 'chatgpt', 'openai', 'canva',
      'adobe', 'patreon', 'substack', 'domain', 'hosting', 'saas', 'renewal',
    ],
  },
  {
    id: 'income',
    label: 'Income',
    icon: 'ArrowFatLineDown',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    keywords: [
      'salary', 'payroll', 'freelance', 'payment', 'invoice', 'deposit',
      'transfer in', 'received', 'income', 'earnings', 'bonus', 'allowance',
      'commission', 'profit', 'revenue', 'refund',
    ],
  },
  {
    id: 'transfers',
    label: 'Transfer / Payment',
    icon: 'ArrowsLeftRight',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    // A transfer moves money between your own pockets (e.g. paying a credit
    // card, moving to savings). It is NOT spending — it's excluded from expense
    // totals, budgets, and the trend. Keywords route matching entries here.
    keywords: [
      'credit card payment', 'cc payment', 'card payment', 'pay credit card',
      'pay cc', 'creditcard payment', 'transfer', 'transferred', 'fund transfer',
      'move to savings', 'bank transfer', 'statement payment', 'bill payment cc',
    ],
  },
  {
    id: 'debts',
    label: 'Debts & Loans',
    icon: 'HandCoins',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    // Category for money lent/borrowed and their repayments. Kept off the
    // keyword index intent — debt entries are created from the Debt ledger, not
    // free-text — but the keywords still let manual entries route here.
    keywords: ['utang', 'loan', 'lend', 'borrow', 'debt', 'paid back', 'repay', 'hulog'],
  },
  {
    id: 'other',
    label: 'Other',
    icon: 'DotsThree',
    color: 'text-slate-500',
    bgColor: 'bg-slate-100',
    keywords: [],
  },
]

// ─── Transaction ──────────────────────────────────────────────────────────────

/**
 * expense  — money spent (counts toward spending, budgets, trend)
 * income   — money received
 * transfer — money moved between your own pockets (e.g. paying a credit card,
 *            moving to savings). Recorded but EXCLUDED from spending/income
 *            analytics so it isn't double-counted against the purchases it settles.
 */
export type TransactionType = 'expense' | 'income' | 'transfer'

// ─── Payment Method ─────────────────────────────────────────────────────────────

export type PaymentMethodId = 'cash' | 'credit' | 'debit' | 'gcash' | 'maya' | 'bank'

export interface PaymentMethod {
  id: PaymentMethodId
  label: string          // Display name, e.g. "Credit Card"
  short: string          // Compact tag label, e.g. "Credit"
  icon: string           // Phosphor icon name
  /** Lower-case tokens that map an entry to this method (matched as whole words
   *  or trailing tags like "/cc"). Cash needs none — it's the default. */
  keywords: string[]
}

/** Default when no method keyword is detected. */
export const DEFAULT_PAYMENT_METHOD: PaymentMethodId = 'cash'

// Ordered for the picker; cash first (the default).
export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'cash',   label: 'Cash',          short: 'Cash',   icon: 'Money',       keywords: ['cash'] },
  { id: 'credit', label: 'Credit Card',   short: 'Credit', icon: 'CreditCard',  keywords: ['cc', 'credit', 'creditcard', 'visa', 'mastercard', 'amex'] },
  { id: 'debit',  label: 'Debit Card',    short: 'Debit',  icon: 'CreditCard',  keywords: ['db', 'debit', 'debitcard'] },
  { id: 'gcash',  label: 'GCash',         short: 'GCash',  icon: 'Wallet',      keywords: ['gcash', 'gc'] },
  { id: 'maya',   label: 'Maya',          short: 'Maya',   icon: 'Wallet',      keywords: ['maya', 'paymaya'] },
  { id: 'bank',   label: 'Bank Transfer', short: 'Bank',   icon: 'Bank',        keywords: [
    'bank', 'banktransfer', 'online', 'instapay', 'pesonet',
    // Traditional Philippine banks
    'bpi', 'bdo', 'metrobank', 'mbtc', 'landbank', 'lbp', 'pnb', 'securitybank',
    'security bank', 'rcbc', 'chinabank', 'china bank', 'eastwest', 'east west',
    'unionbank', 'union bank', 'ubp', 'psbank', 'ps bank', 'dbp', 'aub', 'bpi direct',
    // Digital banks / neobanks
    'maribank', 'mari bank', 'gotyme', 'go tyme', 'seabank', 'sea bank', 'tonik',
    'komo', 'cimb', 'diskartech', 'ownbank', 'own bank', 'gobank',
  ] },
]

export function resolvePaymentMethod(id: string | undefined): PaymentMethod {
  return PAYMENT_METHODS.find((m) => m.id === id) ?? PAYMENT_METHODS[0]
}

export interface Transaction {
  id: string
  raw: string               // Original text input e.g. "$20 mcdonalds lunch"
  amount: number            // Always positive — direction is determined by `type`
  merchant: string          // Resolved merchant name
  category: Category
  date: string              // ISO 8601 date string (YYYY-MM-DD)
  type: TransactionType
  paymentMethod: PaymentMethodId  // How it was paid; defaults to 'cash'
  confidence: number        // 0–1 categorization confidence
  isRecurring?: boolean
  note?: string
  createdAt: string         // ISO 8601 datetime
}

// ─── Transaction Draft ────────────────────────────────────────────────────────

export interface TransactionDraft {
  raw: string
  amount: number | null
  merchant: string
  type: TransactionType
  paymentMethod: PaymentMethodId  // Detected from the text; defaults to 'cash'
  date: string              // ISO 8601 date string
}

// ─── Debts ──────────────────────────────────────────────────────────────────────

/**
 * 'owed_to_me' — you lent money out; the person owes you (a receivable).
 * 'i_owe'      — you borrowed; you owe the person (a liability).
 */
export type DebtDirection = 'owed_to_me' | 'i_owe'

export interface DebtRepayment {
  id: string
  amount: number            // Principal repaid — moves money between your pockets (a transfer)
  interest: number          // Interest paid alongside — a true expense/income (0 if none)
  date: string              // ISO 8601 date (YYYY-MM-DD)
  /** Linked `transfer` ledger transaction for the principal movement, if any. */
  transactionId?: string
  /** Linked `expense`/`income` ledger transaction for the interest, if any. */
  interestTransactionId?: string
  createdAt: string
}

export interface Debt {
  id: string
  personName: string
  direction: DebtDirection
  principal: number         // Original amount lent/borrowed
  note?: string
  isSettled: boolean
  /** Expected repayment date (ISO YYYY-MM-DD), if the user set one. Drives the
   *  due-soon / overdue reminders. */
  dueDate?: string
  /** Linked ledger transaction created when the debt originated, if any. */
  transactionId?: string
  repayments: DebtRepayment[]
  createdAt: string
}

/** Outstanding balance = principal minus everything repaid so far. */
export function debtOutstanding(debt: Debt): number {
  const repaid = debt.repayments.reduce((s, r) => s + r.amount, 0)
  return Math.max(debt.principal - repaid, 0)
}

/**
 * Due-status of a debt relative to `today` (ISO YYYY-MM-DD). Only meaningful for
 * unsettled debts with a due date — otherwise returns `{ state: 'none' }`.
 *
 *  overdue   — due date has passed
 *  due_soon  — due within the next `soonDays` days (inclusive of today)
 *  upcoming  — has a due date further out
 *
 * `days` is the signed day delta (negative = days overdue, 0 = today).
 */
export function debtDueStatus(
  debt: Debt,
  today: string,
  soonDays = 3,
): { state: 'none' | 'overdue' | 'due_soon' | 'upcoming'; days: number } {
  if (debt.isSettled || !debt.dueDate) return { state: 'none', days: 0 }
  const toDays = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
  }
  const days = toDays(debt.dueDate) - toDays(today)
  if (days < 0) return { state: 'overdue', days }
  if (days <= soonDays) return { state: 'due_soon', days }
  return { state: 'upcoming', days }
}

// ─── Budget ───────────────────────────────────────────────────────────────────

export interface BudgetLimit {
  categoryId: string    // CategoryId for presets, UUID for custom categories
  limit: number
  cycle: 'monthly' | 'weekly'
}

// ─── Budget Allocations ───────────────────────────────────────────────────────

export interface BudgetAllocationItem {
  categoryId: string    // CategoryId for presets, UUID for custom categories
  limit: number
}

// ─── Custom Category ──────────────────────────────────────────────────────────

export interface CustomCategory {
  id: string            // UUID from custom_categories table
  name: string
  icon: string          // Phosphor icon name
  textColor: string     // Tailwind text color class e.g. 'text-blue-700'
  bgColor: string       // Tailwind bg color class e.g. 'bg-blue-50'
  createdAt: string
}

/**
 * Preset categories that cannot be hidden/deleted. These are load-bearing:
 * the categorizer and store resolve them with non-null lookups, and 'other' is
 * the universal fallback. Everything else is user-hideable.
 */
export const STRUCTURAL_CATEGORY_IDS: CategoryId[] = ['income', 'transfers', 'debts', 'other']

/** Whether a preset category may be hidden by the user. */
export function isHideableCategory(id: string): boolean {
  return CATEGORIES.some((c) => c.id === id) && !STRUCTURAL_CATEGORY_IDS.includes(id as CategoryId)
}

/**
 * The transaction type a category implies. Income and Transfers are fixed;
 * every other category (presets and custom) is spending.
 */
export function typeForCategory(categoryId: string): TransactionType {
  if (categoryId === 'income') return 'income'
  if (categoryId === 'transfers') return 'transfer'
  return 'expense'
}

/**
 * Resolve a category object by ID, falling back to custom categories,
 * then to 'other'.
 */
export function resolveCategory(
  id: string,
  customCats: CustomCategory[] = []
): Category {
  const preset = CATEGORIES.find((c) => c.id === id)
  if (preset) return preset
  const custom = customCats.find((c) => c.id === id)
  if (custom) {
    return {
      id: custom.id,
      label: custom.name,
      icon: custom.icon,
      color: custom.textColor,
      bgColor: custom.bgColor,
      keywords: [],
    }
  }
  return CATEGORIES[CATEGORIES.length - 1] // 'other'
}

export interface BudgetAllocation {
  id: string
  name: string
  isActive: boolean
  items: BudgetAllocationItem[]
  createdAt: string
}

// ─── Income Allocation ────────────────────────────────────────────────────────

export interface IncomeAllocationItem {
  sourceId: string      // Matches INCOME_SOURCES[n].id
  amount: number        // Expected monthly amount
}

export interface IncomeAllocation {
  id: string
  name: string
  isActive: boolean
  items: IncomeAllocationItem[]
  createdAt: string
}

// ─── Store Shape ──────────────────────────────────────────────────────────────

export interface AppStore {
  transactions: Transaction[]
  budgetLimits: BudgetLimit[]
  addTransaction: (tx: Transaction) => void
  deleteTransaction: (id: string) => void
  updateTransaction: (id: string, patch: Partial<Transaction>) => void
  getByCategory: (categoryId: CategoryId) => Transaction[]
  getByDate: (date: string) => Transaction[]
  getMonthlyTotal: (type: 'expense' | 'income') => number
  getDailyTotal: (date: string, type?: 'expense' | 'income') => number
}
