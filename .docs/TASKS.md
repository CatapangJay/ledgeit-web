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

## Phase 9 — Database & Auth (Supabase + PostgreSQL)

### TASK-019: Supabase Project Setup & Environment Config
- **Owner:** Frontend Lead
- **Estimate:** 30m
- **Description:** Initialize the Supabase project, install the JS client, and wire environment variables for both browser and server contexts. No REST usage — direct PostgreSQL only.
- **Subtasks:**
  - [ ] Create Supabase project on supabase.io (choose region closest to Railway deploy target)
  - [ ] Install `@supabase/supabase-js` and `@supabase/ssr`
  - [ ] Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL` (direct Postgres connection string)
  - [ ] Create `.env.example` with placeholder values — commit this file, never `.env.local`
  - [ ] Create `lib/supabase/client.ts` — singleton browser client using `createBrowserClient`
  - [ ] Create `lib/supabase/server.ts` — server client using `createServerClient` with cookie store
  - [ ] Verify connection by logging `supabase.auth.getSession()` in a server component
- **Acceptance Criteria:**
  - `.env.example` committed, `.env.local` in `.gitignore`
  - Browser and server clients initialize without errors
  - No `DATABASE_URL` or secrets appear in any committed file
- **Dependencies:** TASK-001

---

### TASK-020: PostgreSQL Schema & Migrations (`db/migrations/`)
- **Owner:** Frontend Lead
- **Estimate:** 1.5h
- **Description:** Define the canonical schema for all persisted data, write idempotent SQL migration files, and establish Row Level Security (RLS) policies so users only access their own data.
- **Subtasks:**
  - [ ] Create `db/migrations/` and `db/seeds/` directories with a `db/README.md` (local setup steps)
  - [ ] Write `db/migrations/0001_create_transactions.sql`:
    - `transactions` table: `id UUID PK`, `user_id UUID FK → auth.users`, `amount NUMERIC(12,2)`, `type TEXT CHECK ('income','expense')`, `merchant TEXT`, `category_id TEXT`, `notes TEXT`, `date DATE`, `created_at TIMESTAMPTZ DEFAULT now()`
  - [ ] Write `db/migrations/0002_create_budget_limits.sql`:
    - `budget_limits` table: `id UUID PK`, `user_id UUID FK → auth.users`, `category_id TEXT`, `limit_amount NUMERIC(12,2)`, `month TEXT` (format `YYYY-MM`), UNIQUE constraint on `(user_id, category_id, month)`
  - [ ] Enable RLS on both tables; add `SELECT/INSERT/UPDATE/DELETE` policies restricted to `auth.uid() = user_id`
  - [ ] Write `db/seeds/dev_seed.sql` — 10 realistic transactions across 5 categories for a test user
  - [ ] Run migrations via Supabase SQL editor; verify schema with `\d transactions` in psql
  - [ ] Update `src/types/index.ts` so `Transaction` and `BudgetLimit` field names match DB columns
- **Acceptance Criteria:**
  - All migrations are idempotent (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`)
  - RLS blocks cross-user data access (verify with two test accounts)
  - `src/types/index.ts` types align 1:1 with DB columns — no field name drift
  - Seed script runs cleanly against a fresh schema
- **Dependencies:** TASK-019, TASK-002

---

### TASK-021: Migrate Store Persistence to Supabase DB (`lib/store.ts`, `lib/db/`)
- **Owner:** Frontend Lead
- **Estimate:** 2h
- **Description:** Replace the localStorage Zustand persist middleware with Supabase PostgreSQL as the source of truth. Keep Zustand for optimistic UI state; all mutations hit the DB and reconcile on response.
- **Subtasks:**
  - [ ] Create `lib/db/transactions.ts` — typed async functions: `fetchTransactions(userId)`, `insertTransaction(draft)`, `deleteTransaction(id)`, `updateTransaction(id, patch)` using the server Supabase client
  - [ ] Create `lib/db/budgetLimits.ts` — `fetchBudgetLimits(userId, month)`, `upsertBudgetLimit(limit)`
  - [ ] Remove `persist` middleware from `lib/store.ts`; replace initial seed data with a `loadTransactions()` action that calls `lib/db/transactions.ts`
  - [ ] Implement optimistic updates: apply state change immediately, rollback on DB error
  - [ ] Call `loadTransactions()` in root layout after session is confirmed
  - [ ] All DB functions scope queries with `eq('user_id', userId)` — never unfiltered selects
  - [ ] Remove the dev seed from `store.ts`; rely on `db/seeds/dev_seed.sql` instead
- **Acceptance Criteria:**
  - Transactions survive a hard browser refresh (loaded from DB, not localStorage)
  - Adding and deleting transactions reflects in DB within one network round-trip
  - No unfiltered DB queries — every query includes `user_id` predicate
  - Store hydration completes without layout shift (loading skeleton shown during fetch)
- **Dependencies:** TASK-019, TASK-020, TASK-005

---

### TASK-022: Supabase Auth Integration
- **Owner:** Frontend Lead
- **Estimate:** 2h
- **Description:** Add email magic-link authentication. Protect all app routes behind a session check. Scope all data to the authenticated user.
- **Subtasks:**
  - [ ] Enable "Email (Magic Link)" provider in Supabase Auth dashboard; disable email confirmation requirement for dev
  - [ ] Create `app/(auth)/login/page.tsx` — single email input, "Send Magic Link" button, success message state
  - [ ] Create `app/auth/callback/route.ts` — Next.js Route Handler that exchanges the code for a session (`supabase.auth.exchangeCodeForSession`) and redirects to `/`
  - [ ] Create `middleware.ts` at project root — use `@supabase/ssr` to refresh session cookies on every request; redirect unauthenticated users from protected routes to `/login`
  - [ ] Define protected route matcher in `middleware.ts`: match `/((?!login|auth).*)` 
  - [ ] Update `AppShell.tsx` header: show authenticated user email (truncated) + "Sign out" icon button that calls `supabase.auth.signOut()` and redirects to `/login`
  - [ ] Pass `user.id` from server session to `loadTransactions()` on app boot
  - [ ] Add `NEXT_PUBLIC_SITE_URL` to `.env.example` for magic link redirect configuration in Supabase dashboard
- **Acceptance Criteria:**
  - Unauthenticated visit to `/` redirects to `/login`
  - Magic link email arrives and clicking it lands the user on `/` with an active session
  - Signing out clears session and redirects to `/login`
  - Transactions loaded from DB are scoped to the signed-in user only
  - No user data accessible in any route without a valid session cookie
- **Dependencies:** TASK-019, TASK-021, TASK-007

---

## Phase 10 — Deployment

### TASK-023: Railway Deployment Guide (`.docs/DEPLOYING.md`)
- **Owner:** Frontend Lead
- **Estimate:** 45m
- **Description:** Write a step-by-step deployment guide for hosting the Next.js app on Railway, connected to the existing Supabase project. Covers environment variables, build config, and domain setup.
- **Subtasks:**
  - [ ] Create `.docs/DEPLOYING.md` with the following sections:
    - **Prerequisites** — Railway account, Supabase project live, GitHub repo connected
    - **Create Railway Project** — new project → Deploy from GitHub repo → select `ledgeit-web`
    - **Environment Variables** — table of all required vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`) with instructions to copy from Supabase dashboard → Settings → Database
    - **Build & Start Commands** — `npm run build` / `npm run start`; note Railway auto-detects Next.js
    - **Supabase Auth Redirect URL** — add Railway deploy URL to Supabase Auth → URL Configuration → Redirect URLs
    - **Custom Domain** (optional) — Railway Settings → Domains → add CNAME
    - **Redeploy on push** — confirm GitHub webhook auto-deploys on push to `main`
    - **Verifying the deploy** — checklist: app loads, magic link redirects correctly, transactions persist
  - [ ] Add a `## Rollback` section: re-deploy previous Railway deployment from the Deployments tab
  - [ ] Add a `## Secrets Checklist` callout: confirm no `.env.local` committed, all secrets set in Railway dashboard only
- **Acceptance Criteria:**
  - A developer with no prior Railway experience can deploy successfully by following the guide alone
  - All Railway environment variable names match `.env.example` exactly
  - Guide references Supabase dashboard path for each secret it asks the developer to copy
  - No actual secret values appear anywhere in the document
- **Dependencies:** TASK-019, TASK-020, TASK-022

---

---

## Phase 11 — Budget Allocations (Named Budget Plans)

### TASK-024: Budget Allocations DB Schema (`db/migrations/`)
- **Owner:** Frontend Lead
- **Estimate:** 1h
- **Description:** Add two new tables to support named, switchable budget plans. Each plan (allocation) holds a set of per-category limits. Only one allocation may be active per user at a time.
- **Subtasks:**
  - [ ] Write `db/migrations/0003_create_budget_allocations.sql`:
    - `budget_allocations`: `id UUID PK`, `user_id UUID FK → auth.users`, `name TEXT NOT NULL`, `is_active BOOLEAN NOT NULL DEFAULT FALSE`, `created_at TIMESTAMPTZ DEFAULT now()`
    - `budget_allocation_items`: `id UUID PK`, `allocation_id UUID FK → budget_allocations ON DELETE CASCADE`, `category_id TEXT NOT NULL`, `limit_amount NUMERIC(12,2) NOT NULL DEFAULT 0`, UNIQUE(`allocation_id, category_id`)
  - [ ] Enable RLS on both tables with full CRUD policies scoped to `auth.uid() = user_id` (join through `budget_allocations` for items)
  - [ ] Ensure all statements are idempotent (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`)
  - [ ] Update `src/types/index.ts` with `BudgetAllocationItem` and `BudgetAllocation` interfaces
- **Acceptance Criteria:**
  - Migration runs cleanly on a fresh schema
  - RLS prevents cross-user access
  - `BudgetAllocation` type includes `id`, `name`, `isActive`, `items: BudgetAllocationItem[]`, `createdAt`
- **Dependencies:** TASK-019, TASK-020

---

### TASK-025: Budget Allocations DB Layer (`lib/db/budgetAllocations.ts`)
- **Owner:** Frontend Lead
- **Estimate:** 1h
- **Description:** Typed async functions covering the full CRUD lifecycle for budget allocations, including atomic activation (deactivate all → activate one).
- **Subtasks:**
  - [ ] `fetchBudgetAllocations(userId)` — returns all allocations with nested items, ordered by `created_at`
  - [ ] `createBudgetAllocation(userId, name, items)` — inserts allocation row + items; sets `is_active = TRUE` if it is the user's first allocation
  - [ ] `updateBudgetAllocation(id, name, items)` — updates name; replaces all items via delete-then-insert
  - [ ] `activateBudgetAllocation(userId, allocationId)` — sets all user allocations to `is_active = FALSE`, then sets target to `TRUE`
  - [ ] `deleteBudgetAllocation(id)` — deletes allocation (items cascade); if it was active, activates the most recently created remaining allocation
  - [ ] All queries include `user_id` predicate; never unfiltered selects
- **Acceptance Criteria:**
  - No unfiltered DB queries
  - Activation is self-consistent (exactly one active at all times, or none if no allocations exist)
  - Items replace correctly on update (no orphan rows)
- **Dependencies:** TASK-024

---

### TASK-026: Store — Budget Allocations State (`lib/store.ts`)
- **Owner:** Frontend Lead
- **Estimate:** 1h
- **Description:** Extend the Zustand store to manage budget allocations. Derive `budgetLimits` from the active allocation so all existing Insights/BudgetBar components continue to work with zero changes.
- **Subtasks:**
  - [ ] Add `budgetAllocations: BudgetAllocation[]` to store state
  - [ ] Add `loadBudgetAllocations(userId)` action — calls `fetchBudgetAllocations`, syncs state, derives `budgetLimits` from the active allocation
  - [ ] Add `saveBudgetAllocation({ id?, name, items })` action — optimistic create/update, calls DB layer, reconciles on response
  - [ ] Add `activateAllocation(allocationId)` action — optimistic flag flip, calls `activateBudgetAllocation` in DB, re-derives `budgetLimits`
  - [ ] Add `deleteAllocation(allocationId)` action — optimistic remove, calls `deleteBudgetAllocation`, re-derives `budgetLimits`
  - [ ] Deprecate `loadBudgetLimits` (keep for backward compat but have it delegate to `loadBudgetAllocations`)
  - [ ] Add `hasSetupBudget` boolean selector (true if `budgetAllocations.length > 0`)
- **Acceptance Criteria:**
  - `budgetLimits` always reflects active allocation's items
  - `hasSetupBudget` is `false` for brand-new users until first allocation is saved
  - All actions include optimistic rollback on DB error
- **Dependencies:** TASK-025, TASK-005

---

### TASK-027: BudgetAllocationSheet Component (`components/budget/BudgetAllocationSheet.tsx`)
- **Owner:** Frontend Lead
- **Estimate:** 2.5h
- **Description:** Full-screen bottom sheet for managing budget plans. Two views inside the same sheet: the **Plan List** (browseable, switchable) and the **Plan Editor** (name + per-category limit inputs).
- **Subtasks:**
  - [ ] Sheet opens/closes with Framer Motion spring slide-up (same pattern as `SmartEntrySheet`)
  - [ ] **Plan List view:**
    - Header: "Budget Plans" + close button
    - Each row: plan name, active badge (emerald pill "Active"), tap row to activate, edit icon to open editor for that plan
    - "New Plan" ghost button at bottom
    - Active plan row gets a left-border accent + subtle bg tint
  - [ ] **Plan Editor view (create + edit):**
    - Back arrow to return to list
    - Name input at top (autofocused on create)
    - Per-category rows: category icon, label, `₱` number input — one row per expense category (exclude income)
    - "Save Plan" primary button + "Cancel" ghost button
    - On save: calls `saveBudgetAllocation` from store; auto-activates if it is the first plan
  - [ ] Animated transition between list and editor views (x-axis slide using `AnimatePresence`)
  - [ ] No `useState` for animation values — Framer Motion `useMotionValue` / `variants` only
- **Acceptance Criteria:**
  - Plan list → editor transition is smooth (spring x-axis slide)
  - Activating a plan updates insights immediately (store re-derives `budgetLimits`)
  - Deleting a plan with swipe-left gesture removes it from list
  - Cannot delete the only remaining plan (button disabled with tooltip)
  - Name input has `maxLength={48}` and shows character counter
- **Dependencies:** TASK-026

---

### TASK-028: OnboardingBudgetSetup Component (`components/budget/OnboardingBudgetSetup.tsx`)
- **Owner:** Frontend Lead
- **Estimate:** 1.5h
- **Description:** Full-screen onboarding overlay shown to new users (no existing allocations) on first app access after login. Guides them to name and configure their first budget plan.
- **Subtasks:**
  - [ ] Full-screen overlay (`position: fixed, z-index: 60`) with spring fade-in
  - [ ] Step 1 — Welcome: LedgeIt wordmark, headline "Set your spending limits", one-liner subtext, "Get Started" button
  - [ ] Step 2 — Name your plan: single name input, placeholder "E.g. Regular Month", suggested names as tap chips ("Regular Month", "Tight Month", "Vacation Mode"), "Continue" button (disabled if blank)
  - [ ] Step 3 — Set limits: scrollable per-category rows with `₱` number inputs; pre-populated with sensible defaults from `DEFAULT_BUDGETS` constant
  - [ ] "Save & Start Tracking" CTA at bottom of step 3 — calls `saveBudgetAllocation`, dismisses overlay with spring exit
  - [ ] Skip link at top-right — saves the plan with defaults and dismisses
  - [ ] Step indicator: 3 dots at top center
  - [ ] Step-to-step transitions: Spring x-axis slide (`variants` with `enter`, `center`, `exit`)
- **Acceptance Criteria:**
  - Overlay is only shown when `!hasSetupBudget` (from store) after auth
  - Completing the flow saves an allocation and sets it as active
  - Skipping the flow saves with defaults (user can edit later via Insights)
  - Smooth multi-step slide animation; never feels like a page reload
- **Dependencies:** TASK-026, TASK-027

---

### TASK-029: Wire Allocations into Insights + StoreBootstrap
- **Owner:** Frontend Lead
- **Estimate:** 45m
- **Description:** Surface the active budget plan name in the Insights page header and expose an entry point to manage plans. Show the onboarding overlay on first access.
- **Subtasks:**
  - [ ] `StoreBootstrap.tsx` — call `loadBudgetAllocations(userId)` after auth (replace `loadBudgetLimits`)
  - [ ] `AppShell.tsx` — conditionally render `<OnboardingBudgetSetup />` when `!hasSetupBudget` (pass `open` prop driven by store)
  - [ ] `app/insights/page.tsx` — below the month headers, add a tappable row: `[Sliders icon] Plan name · "Change"` that opens `BudgetAllocationSheet`
  - [ ] Import and mount `BudgetAllocationSheet` in the Insights page with `open/onClose` state
  - [ ] Ensure `budgetLimits` in scope always reads from active allocation (no direct DEFAULT_BUDGETS fallback needed after first setup)
- **Acceptance Criteria:**
  - New user flow: login → onboarding appears → complete → Insights shows plan name
  - Existing user: Insights header shows current plan name; tap "Change" → sheet opens
  - Switching plans in the sheet immediately updates budget bars without page reload
- **Dependencies:** TASK-026, TASK-027, TASK-028

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

TASK-019 (Supabase Setup)
  ├─ TASK-020 (Schema) → TASK-021 (Migrate Store) → TASK-022 (Auth)
  └─ TASK-022 (Auth)

TASK-023 (Railway Docs) — after TASK-019, TASK-020, TASK-022

TASK-024 (Allocation Schema)
  └─ TASK-025 (Allocation DB Layer) → TASK-026 (Store) → TASK-027 (Sheet) → TASK-028 (Onboarding) → TASK-029 (Wire)
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
| TASK-019 Supabase Setup | P1 High | 30m | Infra |
| TASK-020 DB Schema | P1 High | 1.5h | Infra |
| TASK-021 Store → DB | P1 High | 2h | Infra |
| TASK-022 Auth | P1 High | 2h | Auth |
| TASK-023 Railway Docs | P2 Medium | 45m | Deployment |
| TASK-024 Allocation Schema | P1 High | 1h | Infra |
| TASK-025 Allocation DB Layer | P1 High | 1h | Infra |
| TASK-026 Store Allocations | P1 High | 1h | State |
| TASK-027 BudgetAllocationSheet | P1 High | 2.5h | UI |
| TASK-028 OnboardingBudgetSetup | P1 High | 1.5h | UI |
| TASK-029 Wire Allocations | P1 High | 45m | Integration |

**Total Estimate: ~26.75 hours**
