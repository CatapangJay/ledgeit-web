# LedgeIt — Architecture Document

## Overview

LedgeIt is a mobile-first budgeting web app that lets users log expenses and income using natural language — no dropdowns, no category selectors. The smart entry engine parses freeform text like `"$20 mcdonalds lunch"` and automatically resolves the amount, merchant, category, and date.

The design follows a dense cockpit aesthetic (VISUAL_DENSITY: 7) with fluid transitions (MOTION_INTENSITY: 7) and slightly offset layouts (DESIGN_VARIANCE: 4), inspired by the Stitch design system at project `992770070891976365`.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | RSC by default, file-based routing |
| Language | TypeScript | Type safety for financial data |
| Styling | Tailwind CSS v3 | Utility-first, fast iteration |
| Animation | Framer Motion | Spring physics, layoutId transitions |
| State | Zustand | Lightweight global store |
| Icons | @phosphor-icons/react | Consistent weight, no emojis |
| Font | Geist (headline) + Geist Mono (data) | Anti-Inter rule, terminal feel |
| Storage | localStorage (MVP) | No backend required for v1 |

---

## Directory Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with font config + providers
│   ├── page.tsx                # Dashboard (Command Panel)
│   ├── ledger/
│   │   └── page.tsx            # Transaction Ledger
│   ├── insights/
│   │   └── page.tsx            # Budget Insights
│   └── globals.css             # Tailwind base + CSS variables
│
├── components/
│   ├── layout/
│   │   ├── BottomNav.tsx       # Mobile bottom navigation (4 tabs)
│   │   └── AppShell.tsx        # Page wrapper with bottom nav spacing
│   │
│   ├── entry/
│   │   ├── SmartEntryBar.tsx   # The core NLP text input + parse preview (Client)
│   │   ├── ParsePreview.tsx    # Detection card: category, amount, date (Client)
│   │   └── CategoryBadge.tsx   # Animated category pill with icon (Client)
│   │
│   ├── dashboard/
│   │   ├── BalanceMetric.tsx   # Large balance display with trend
│   │   ├── SpendStrip.tsx      # Today's spend compressed row
│   │   ├── RecentFeed.tsx      # Recent transactions (infinite-scroll ready)
│   │   └── BudgetRing.tsx      # Monthly budget utilization ring (Client)
│   │
│   ├── ledger/
│   │   ├── TransactionRow.tsx  # Single row: icon, merchant, category, amount
│   │   ├── DateGroup.tsx       # Grouped by date with subtotal
│   │   └── FilterChips.tsx     # Category/type filter chips (Client)
│   │
│   └── insights/
│       ├── BudgetBar.tsx       # Per-category progress bar with threshold colors
│       ├── SpendDonut.tsx      # Spend vs save ratio visualization (Client)
│       └── MetricStrip.tsx     # Net cashflow, avg day spend, projected EOM
│
├── lib/
│   ├── categorizer.ts          # Smart categorization engine (keyword + regex)
│   ├── parser.ts               # Freeform text → TransactionDraft parser
│   ├── store.ts                # Zustand store: transactions, budgets
│   └── formatters.ts           # Currency, date, percentage formatters
│
└── types/
    └── index.ts                # Transaction, Category, Budget types
```

---

## Data Models

### Transaction
```typescript
interface Transaction {
  id: string
  raw: string               // Original text input e.g. "$20 mcdonalds lunch"
  amount: number            // Parsed amount (negative = expense, positive = income)
  merchant: string          // Resolved merchant name
  category: Category
  date: string              // ISO date string
  type: 'expense' | 'income'
  confidence: number        // 0-1 categorization confidence
  isRecurring?: boolean
  note?: string
}
```

### Category
```typescript
interface Category {
  id: string
  label: string             // "Restaurants & Eats"
  icon: string              // Phosphor icon name
  color: string             // Tailwind color class
  keywords: string[]        // Matching keywords for categorizer
}
```

### BudgetLimit
```typescript
interface BudgetLimit {
  categoryId: string
  limit: number
  cycle: 'monthly' | 'weekly'
}
```

---

## Smart Categorization Engine

### Flow

```
User types → Parser extracts amount/text → Categorizer matches keywords → Preview renders → User confirms
```

### Parser (`lib/parser.ts`)

1. **Amount extraction**: Regex finds `$XX`, `XX dollars`, `XX.XX` anywhere in string
2. **Direction detection**: Keywords like "received", "salary", "refund", "deposit" → income; default → expense
3. **Merchant extraction**: Text after amount removal, stripped of filler words
4. **Date resolution**: "yesterday", "last friday", explicit dates, fallback to today

### Categorizer (`lib/categorizer.ts`)

Keyword-to-category matching with priority weights:

| Category | Keywords |
|---|---|
| Restaurants & Eats | mcdonalds, burger, pizza, lunch, dinner, breakfast, cafe, coffee, starbucks, jollibee, kfc, restaurant, eat, food |
| Groceries | grocery, supermarket, sm, puregold, landers, robinsons, market, produce, fresh |
| Transport | grab, uber, lyft, taxi, bus, mrt, lrt, toll, gas, fuel, parking, commute |
| Shopping | mall, shop, lazada, shein, amazon, h&m, zara, clothing, shoes, online |
| Utilities | electric, water, internet, meralco, pldt, globe, smart, bill, subscription |
| Entertainment | netflix, spotify, movie, cinema, concert, gaming, steam, games |
| Health | hospital, clinic, pharmacy, doctor, medicine, dental, gym, wellness |
| Income | salary, freelance, payment, invoice, deposit, transfer in, received |
| Other | (fallback) |

Confidence is calculated as: `matched keywords / total tokens` weighted by keyword specificity.

---

## State Management (Zustand)

```typescript
interface AppStore {
  transactions: Transaction[]
  budgetLimits: BudgetLimit[]
  addTransaction: (tx: Transaction) => void
  deleteTransaction: (id: string) => void
  getByCategory: (categoryId: string) => Transaction[]
  getByDate: (date: string) => Transaction[]
  getMonthlyTotal: (type: 'expense' | 'income') => number
}
```

State is persisted to `localStorage` via Zustand's persist middleware.

---

## Screens & Navigation

### Bottom Navigation (4 tabs)
```
[Dashboard]  [Ledger]  [+ Add]  [Insights]
```

The `+ Add` tab is a floating action that opens the Smart Entry bar as an animated sheet from the bottom (Framer Motion `layoutId` expansion).

### Screen Breakdown

| Screen | Route | Primary Action |
|---|---|---|
| Dashboard | `/` | Overview: balance, today's spend, recent feed |
| Smart Entry | Sheet (overlay) | Text → parse → confirm transaction |
| Transaction Ledger | `/ledger` | Full history grouped by date, filterable |
| Budget Insights | `/insights` | Budget bars, spend ratios, projections |

---

## Design Tokens (from Stitch)

```css
--color-bg:        #0A0A0F    /* zinc-950 off-black */
--color-surface:   #111116    /* zinc-900 card surface */
--color-border:    #1F1F27    /* zinc-800 subtle border */
--color-accent:    #10B981    /* emerald-500 primary accent */
--color-danger:    #F43F5E    /* rose-500 for overspend/expenses */
--color-muted:     #6B7280    /* text-gray-500 metadata */
--color-data:      #E5E7EB    /* text-gray-200 primary text */
--font-display:    'Geist', sans-serif
--font-mono:       'Geist Mono', monospace
```

---

## Animation Contracts (MOTION_INTENSITY: 7)

All animations use spring physics: `{ type: "spring", stiffness: 100, damping: 20 }`

| Element | Animation |
|---|---|
| Smart Entry sheet | Slide-up with `layoutId` from FAB button |
| Transaction row mount | Staggered `y: 16 → 0` with `opacity: 0 → 1` |
| Category badge reveal | Scale `0.8 → 1` + fade in |
| Balance value | Count-up on mount via CSS animation |
| Budget bar fill | Width animate from 0 to target on enter viewport |
| Confidence indicator | Pulsing dot while analyzing |
| Delete transaction | `x: 0 → -100%` + `opacity: 1 → 0` via `AnimatePresence` |

---

## Performance Contracts

- All perpetual/loop animations isolated in `React.memo` Client Components
- No `window.addEventListener('scroll')` — use Framer Motion's `useInView`
- No animation on `top/left/width/height` — exclusively `transform` and `opacity`
- `will-change: transform` applied only to animated containers
- localStorage access wrapped in try/catch with SSR guard

---

## v1 Scope (MVP)

- [x] Smart Entry text parsing + categorization  
- [x] Add expense/income transactions
- [x] Dashboard with today's summary + recent feed
- [x] Transaction Ledger with date grouping
- [x] Budget Insights: per-category spending bars
- [x] Persistent state via localStorage

## v2 Scope (Future)

- [ ] Backend API (Supabase or PlanetScale)
- [ ] Auth (Clerk or NextAuth)
- [ ] AI-powered categorization via LLM
- [ ] Budget limit configuration UI
- [ ] Export to CSV
- [ ] Recurring transaction detection
- [ ] Push notifications for budget threshold warnings
