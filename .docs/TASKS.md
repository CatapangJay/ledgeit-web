# LedgeIt — Sprint Tasks

> Skill: task-planning | DESIGN_VARIANCE: 4 | MOTION_INTENSITY: 7 | VISUAL_DENSITY: 7  
> Delivery target: MVP v1  
> Priority: High across all tasks

---

## Phase 1 — Project Bootstrap

### TASK-001: Initialize Next.js Project
- **Owner:** Frontend Lead
- **Estimate:** 1h
- **Description:** Scaffold the Next.js 14 App Router project with TypeScript, Tailwind CSS v3, and all required dependencies.
- **Subtasks:**
  - [x] Run `npx create-next-app@latest ledgeit --typescript --tailwind --app --eslint --src-dir --import-alias "@/*"`
  - [x] Install `framer-motion`, `zustand`, `@phosphor-icons/react`
  - [x] Configure `next/font` with Geist + Geist Mono
  - [x] Set up Tailwind theme with custom colors and font families in `tailwind.config.ts`
  - [x] Configure `globals.css` with CSS custom properties for design tokens
  - [x] Verify Tailwind v3 config (no v4 postcss syntax)
- **Acceptance Criteria:**
  - Project runs `npm run dev` without errors
  - Geist font loads on all pages
  - Custom Tailwind colors (`ledge-accent`, `ledge-surface`, etc.) available
  - All dependencies installed and verified in `package.json`
- **Dependencies:** None

---

### TASK-002: Define Types and Data Models
- **Owner:** Frontend Lead
- **Estimate:** 30m
- **Description:** Create all TypeScript interfaces referenced in ARCHITECTURE.md.
- **Subtasks:**
  - [x] Create `src/types/index.ts` with `Transaction`, `Category`, `BudgetLimit`, `TransactionDraft`
  - [x] Define `CATEGORIES` constant array with all 9 categories, keywords, icons, colors
  - [x] Export `CategoryId` union type
- **Acceptance Criteria:**
  - All types used in other tasks with no `any` types
  - `CATEGORIES` array covers all categorizer mappings
- **Dependencies:** TASK-001

---

## Phase 2 — Core Logic

### TASK-003: Smart Text Parser (`lib/parser.ts`)
- **Owner:** Frontend Lead
- **Estimate:** 2h
- **Description:** Build the freeform natural language parser that extracts amount, type, merchant, and date from a text string.
- **Subtasks:**
  - [x] Implement `parseAmount(text)` — regex extract `$XX`, `XX.XX`, `XX dollars`
  - [x] Implement `parseDirection(text)` — detect income keywords vs expense default
  - [x] Implement `parseMerchant(text)` — remove amount tokens, normalize merchant name
  - [x] Implement `parseDate(text)` — resolve "today", "yesterday", "last friday", explicit dates
  - [x] Compose `parseTransaction(raw: string): TransactionDraft` function
  - [x] Write unit test cases for 20+ input patterns
- **Acceptance Criteria:**
  - `"$20 mcdonalds lunch"` → `{ amount: 20, merchant: "McDonald's", type: 'expense', date: today }`
  - `"received 5000 salary"` → `{ amount: 5000, type: 'income', merchant: 'Salary' }`
  - `"yesterday grab 150"` → `{ date: yesterday, amount: 150, merchant: 'Grab' }`
  - Handles edge cases: no amount, no merchant, currency symbols
- **Dependencies:** TASK-002

---

### TASK-004: Auto-Categorization Engine (`lib/categorizer.ts`)
- **Owner:** Frontend Lead
- **Estimate:** 1.5h
- **Description:** Keyword-based categorizer that assigns a category + confidence score to a `TransactionDraft`.
- **Subtasks:**
  - [x] Build keyword index from `CATEGORIES` array
  - [x] Implement `categorize(draft: TransactionDraft): { category: Category, confidence: number }`
  - [x] Apply priority weighting (specific keywords rank higher than generic)
  - [x] Handle `income` type forced to Income category regardless of merchant
  - [x] Fallback to "Other" with 0.5 confidence if no match found
  - [x] Test with 15+ merchant/keyword combinations
- **Acceptance Criteria:**
  - "mcdonalds" → Restaurants & Eats with confidence ≥ 0.85
  - "grab" → Transport with confidence ≥ 0.90
  - "netflix" → Entertainment with confidence ≥ 0.95
  - Unknown merchant → Other with confidence 0.5
- **Dependencies:** TASK-002, TASK-003

---

### TASK-005: Zustand Store (`lib/store.ts`)
- **Owner:** Frontend Lead
- **Estimate:** 1h
- **Description:** Implement global state with localStorage persistence for all transactions and budget limits.
- **Subtasks:**
  - [x] Create Zustand store with `persist` middleware targeting `localStorage`
  - [x] Implement `addTransaction`, `deleteTransaction`, `updateTransaction`
  - [x] Implement selectors: `getByCategory`, `getByDate`, `getMonthlyTotal`, `getDailyTotal`
  - [x] SSR-safe hydration guard (no localStorage access on server)
  - [x] Add seed data for development preview (5+ realistic transactions)
- **Acceptance Criteria:**
  - Transactions persist across page refreshes
  - No SSR hydration errors
  - Seed data displays correctly on first load
- **Dependencies:** TASK-002

---

### TASK-006: Currency & Date Formatters (`lib/formatters.ts`)
- **Owner:** Frontend Lead
- **Estimate:** 30m
- **Description:** Format utilities for all display values.
- **Subtasks:**
  - [x] `formatCurrency(amount: number, showSign?: boolean)` — Philippine Peso format (₱1,234.56)
  - [x] `formatDate(date: string)` — "Today", "Yesterday", or "Mon, Apr 7"
  - [x] `formatRelativeDate(date: string)` — "2h ago", "Yesterday", "3 days ago"
  - [x] `formatPercent(value: number)` — "47.2%"
- **Acceptance Criteria:**
  - Currency uses locale-aware formatting
  - Dates use human-readable relative format
- **Dependencies:** TASK-002

---

## Phase 3 — Layout & Shell

### TASK-007: Root Layout + App Shell (`app/layout.tsx`, `components/layout/`)
- **Owner:** Frontend Lead
- **Estimate:** 1h
- **Description:** Configure root layout, font loading, global providers, and the bottom navigation shell.
- **Subtasks:**
  - [x] Configure `next/font/google` with Geist and Geist Mono
  - [x] Set `<html>` background to `#0A0A0F`, default text color
  - [x] Create `AppShell.tsx` — wraps pages with `pb-20` spacing for bottom nav
  - [x] Create `BottomNav.tsx` — 4 tabs: Dashboard, Ledger, Add (FAB), Insights
  - [x] Mark `BottomNav.tsx` as `'use client'` for active route detection via `usePathname`
  - [x] Wire Zustand `StoreProvider` as client component wrapper
  - [x] Implement active tab highlight (emerald underline on active)
  - [x] Add haptic-style active state: `scale-[0.92]` on tab press
- **Acceptance Criteria:**
  - Navigation works between all 4 routes
  - Active tab visually indicated
  - No layout shift from bottom nav
  - `min-h-[100dvh]` used on root, never `h-screen`
- **Dependencies:** TASK-001

---

## Phase 4 — Smart Entry (Core Feature)

### TASK-008: Smart Entry Bar Component (`components/entry/SmartEntryBar.tsx`)
- **Owner:** Frontend Lead
- **Estimate:** 2.5h
- **Description:** The hero feature — a fullscreen sheet with freeform text input that live-parses and shows a detection preview. Isolated as `'use client'`.
- **Subtasks:**
  - [x] Fullscreen bottom sheet with Framer Motion slide-up (`y: '100%' → 0`)
  - [x] Large `<textarea>` or `<input>` auto-focused on open
  - [x] Live parsing: debounce 400ms after typing stops → call parser + categorizer
  - [x] While parsing: show pulsing "Analyzing..." indicator (not spinner)
  - [x] On result: render `ParsePreview` component with spring animation
  - [x] "Log Transaction" button → calls `store.addTransaction` → success animation → close sheet
  - [x] "Discard" ghost button to cancel
  - [x] Keyboard-aware: sheet rises above mobile keyboard
  - [x] Input examples as placeholder text cycling via typewriter: "try: $20 mcdonalds lunch → grab 85 → received 25000 salary"
- **Acceptance Criteria:**
  - Sheet opens/closes with spring physics
  - Parsing triggers automatically within 400ms of typing stop
  - Transaction logs correctly and appears in ledger
  - No `useState` used for animation values — Framer Motion only
- **Dependencies:** TASK-003, TASK-004, TASK-005

---

### TASK-009: Parse Preview Card (`components/entry/ParsePreview.tsx`)
- **Owner:** Frontend Lead
- **Estimate:** 1h
- **Description:** The detection result card showing parsed category, amount, date, and confidence. Animated reveal.
- **Subtasks:**
  - [x] Display: giant amount, category badge, date, confidence % strip
  - [x] Category badge with icon + color from `CATEGORIES` constant
  - [x] Confidence bar — thin 2px line that fills to confidence %
  - [x] Spending insight line: "12% lower than your usual Friday spend" (mock for MVP)
  - [x] Staggered item reveal using `staggerChildren: 0.06`
  - [x] Red border on expense entries, emerald on income
- **Acceptance Criteria:**
  - All fields populated from parsed data
  - Stagger animation completes within 500ms total
  - Color coding matches transaction type
- **Dependencies:** TASK-008

---

## Phase 5 — Dashboard

### TASK-010: Dashboard Page (`app/page.tsx`)
- **Owner:** Frontend Lead
- **Estimate:** 2h
- **Description:** The Command Panel — shows total balance, today's spend, and recent transaction feed. Left-aligned, dense layout.
- **Subtasks:**
  - [x] Header: "LedgeIt" wordmark (left) + settings icon (right)
  - [x] Balance section: `₱XX,XXX.XX` in large Geist Mono, with `+X.X% this month` trend line
  - [x] Today's spend strip: compact row showing today's total with category breakdown bar
  - [x] Recent transactions feed (`RecentFeed.tsx`) — last 8 entries grouped by date
  - [x] Empty state: illustrated message + "Log your first entry" CTA
  - [x] Staggered mount animation for transaction rows
  - [x] Pull-to-refresh indicator (CSS only, no library)
- **Acceptance Criteria:**
  - Balance reflects actual store data
  - Empty state renders when no transactions
  - Left-aligned layout, no centered hero
  - All motion uses `transform` + `opacity` only
- **Dependencies:** TASK-005, TASK-007, TASK-009

---

### TASK-011: Balance Metric + Trend (`components/dashboard/BalanceMetric.tsx`)
- **Owner:** Frontend Lead
- **Estimate:** 45m
- **Description:** Large balance display with animated count-up on mount and a trend indicator.
- **Subtasks:**
  - [x] Count-up animation from 0 to balance value on first mount (CSS or Framer)
  - [x] Trend badge: emerald for positive, rose for negative month-over-month
  - [x] "this month" label in muted text
  - [x] Mono font for all numeric values
- **Acceptance Criteria:**
  - Count-up completes in ≤ 1.2s
  - Trend reflects actual computed store data
- **Dependencies:** TASK-005

---

### TASK-012: Recent Feed (`components/dashboard/RecentFeed.tsx`)
- **Owner:** Frontend Lead
- **Estimate:** 1h
- **Description:** Scrollable list of recent transactions, grouped by date labels.
- **Subtasks:**
  - [x] Date group header: "Today" "Yesterday" "Mon, Apr 6" with subtotal right-aligned
  - [x] Per-transaction row: category icon circle, merchant, category label, amount (+ or -)
  - [x] Amounts in Geist Mono — expenses in rose, income in emerald
  - [x] Swipe-to-delete with Framer Motion `drag` + `AnimatePresence`
  - [x] Long press to reveal context menu (delete + edit, MVP: delete only)
- **Acceptance Criteria:**
  - Grouped correctly by date
  - Swipe to delete works and removes from store
  - Empty state renders with call to action
- **Dependencies:** TASK-005, TASK-006

---

## Phase 6 — Transaction Ledger

### TASK-013: Ledger Page (`app/ledger/page.tsx`, `components/ledger/`)
- **Owner:** Frontend Lead
- **Estimate:** 2h
- **Description:** Full transaction history with category filter chips, date grouping, and subtotals.
- **Subtasks:**
  - [x] Page header: "Ledger" + total count badge
  - [x] Filter chips: All, Expense, Income, + per-category chips — horizontal scroll
  - [x] Transactions grouped by date with daily subtotal
  - [x] Each row: `TransactionRow.tsx` — icon, merchant (bold), category, amount, time
  - [x] `DateGroup.tsx` — sticky date label with divider + subtotal
  - [x] Filtered state: animate list re-render with `AnimatePresence` + `layout` prop
  - [x] Empty filtered state: "No transactions in this category"
  - [x] Monospace amounts, dense row height (`py-3`)
- **Acceptance Criteria:**
  - Filter chips update list in real time
  - List re-orders smoothly with spring physics
  - Data is accurate from store
  - No 3-column card layout used anywhere
- **Dependencies:** TASK-005, TASK-006

---

## Phase 7 — Budget Insights

### TASK-014: Insights Page (`app/insights/page.tsx`, `components/insights/`)
- **Owner:** Frontend Lead
- **Estimate:** 2h
- **Description:** Budget progress visualization — cockpit-style spend bars, ratio section, and key metrics strip.
- **Subtasks:**
  - [x] Page header: "October 2025" cycle label with prev/next arrows
  - [x] Metric strip (`MetricStrip.tsx`): Net Cashflow, Avg Day Spend, Projected EOM — 3 items in row
  - [x] Per-category budget bars (`BudgetBar.tsx`): category name, `₱spent / ₱limit`, progress bar with threshold coloring
    - Green: < 75%
    - Amber: 75–90%
    - Rose: > 90%
  - [x] Spend/Save ratio section: `₱X,XXX spent` vs `₱X,XXX saved` with a 2-segment progress bar
  - [x] Budget bars animate from 0 to target width on scroll into view (`useInView` from Framer)
  - [x] All numbers in Geist Mono
- **Acceptance Criteria:**
  - Budget bars animate on page enter
  - Colors change based on utilization thresholds
  - Computed from actual store data
  - Dense cockpit layout — no card borders, only `border-t` dividers
- **Dependencies:** TASK-005, TASK-006

---

## Phase 8 — Polish & QA

### TASK-015: Loading States
- **Owner:** Frontend Lead
- **Estimate:** 1h
- **Description:** Add skeleton loading states for all data-dependent views.
- **Subtasks:**
  - [x] Transaction row skeleton: 3 pulse bars matching row layout
  - [x] Balance metric skeleton: wide pulse block + narrow trend block
  - [x] Budget bar skeleton: full-width pulse bars
  - [x] Shimmer effect via CSS `@keyframes shimmer` — no library
- **Acceptance Criteria:**
  - No empty flicker on initial store hydration
  - Skeletons match exact layout of loaded content

---

### TASK-016: Empty States
- **Owner:** Frontend Lead
- **Estimate:** 30m
- **Description:** Beautiful empty states for ledger, dashboard, and insights with no data.
- **Subtasks:**
  - [x] Dashboard empty: SVG receipt icon, "Nothing yet. Log your first entry." + FAB arrow indicator
  - [x] Ledger empty: "No transactions in this filter"
  - [x] Insights empty: "Add transactions to see your spending patterns"
- **Acceptance Criteria:**
  - All views have composed empty states
  - No placeholder text only — must have icon + label + optional CTA

---

### TASK-017: Mobile QA & Viewport Fixes
- **Owner:** Frontend Lead
- **Estimate:** 1h
- **Description:** Test and fix all mobile-specific issues.
- **Subtasks:**
  - [x] Verify no `h-screen` used — all `min-h-[100dvh]`
  - [x] Smart Entry sheet does not get covered by mobile keyboard
  - [x] Bottom nav is not obscured by iOS Safari bottom bar
  - [x] Swipe-to-delete does not conflict with browser back gesture
  - [x] Dense rows readable at 375px viewport
  - [x] No horizontal scroll at any breakpoint
- **Acceptance Criteria:**
  - Passes visual QA on 375px (iPhone SE), 390px (iPhone 14), 430px (iPhone 14 Plus)

---

### TASK-018: Accessibility Baseline
- **Owner:** Frontend Lead
- **Estimate:** 45m
- **Description:** Ensure minimum accessible interactions for screen readers and keyboard navigation.
- **Subtasks:**
  - [x] All interactive elements have `aria-label`
  - [x] Category icons have `aria-hidden="true"` (decorative)
  - [x] Form input has `aria-label` and `role="textbox"`
  - [x] Color contrast ≥ 4.5:1 for all text on dark background
  - [x] Keyboard-navigable bottom nav and filter chips
- **Acceptance Criteria:**
  - No axe-core critical violations
  - Tab order logical throughout all screens

---

## Dependency Graph

```
TASK-001
  └─ TASK-002
       ├─ TASK-003 → TASK-004 → TASK-008 → TASK-009
       ├─ TASK-005 → TASK-010, TASK-013, TASK-014
       └─ TASK-006 → TASK-012, TASK-013, TASK-014

TASK-007
  └─ TASK-010, TASK-013, TASK-014

TASK-015, TASK-016, TASK-017, TASK-018 (parallel, after Phase 5–7)
```

---

## Labels / Priority Matrix

| Task | Priority | Effort | Phase |
|---|---|---|---|
| TASK-008 Smart Entry | P0 Critical | 2.5h | Core UX |
| TASK-003 Parser | P0 Critical | 2h | Core Logic |
| TASK-004 Categorizer | P0 Critical | 1.5h | Core Logic |
| TASK-010 Dashboard | P1 High | 2h | Screen |
| TASK-013 Ledger | P1 High | 2h | Screen |
| TASK-014 Insights | P1 High | 2h | Screen |
| TASK-005 Store | P1 High | 1h | State |
| TASK-007 Shell+Nav | P1 High | 1h | Layout |
| TASK-001 Bootstrap | P0 Critical | 1h | Setup |
| TASK-015 Loading | P2 Medium | 1h | Polish |
| TASK-016 Empty States | P2 Medium | 30m | Polish |
| TASK-017 Mobile QA | P2 Medium | 1h | QA |
| TASK-018 A11y | P3 Low | 45m | QA |

**Total Estimate: ~20 hours**
