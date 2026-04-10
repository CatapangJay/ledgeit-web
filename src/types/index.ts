// ─── Category ────────────────────────────────────────────────────────────────

export type CategoryId =
  | 'restaurants'
  | 'groceries'
  | 'transport'
  | 'shopping'
  | 'utilities'
  | 'entertainment'
  | 'health'
  | 'income'
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
    id: 'other',
    label: 'Other',
    icon: 'DotsThree',
    color: 'text-slate-500',
    bgColor: 'bg-slate-100',
    keywords: [],
  },
]

// ─── Transaction ──────────────────────────────────────────────────────────────

export interface Transaction {
  id: string
  raw: string               // Original text input e.g. "$20 mcdonalds lunch"
  amount: number            // Always positive — direction is determined by `type`
  merchant: string          // Resolved merchant name
  category: Category
  date: string              // ISO 8601 date string (YYYY-MM-DD)
  type: 'expense' | 'income'
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
  type: 'expense' | 'income'
  date: string              // ISO 8601 date string
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
