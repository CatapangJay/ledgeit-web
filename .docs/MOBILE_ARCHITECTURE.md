# LedgeIt Mobile — Architecture Document

## Overview

LedgeIt Mobile is the iOS/Android companion to the [LedgeIt web app](./ARCHITECTURE.md), built with **Expo (React Native)** so the UI, animation feel, and business logic match the web version as closely as possible.

**Data model is local-first and tiered:**

| Tier | Storage | Sync |
|---|---|---|
| **Free** | SQLite on-device (`expo-sqlite`) | None — data lives only on the device |
| **Premium** | SQLite on-device (source of truth for UI) + Supabase Postgres (cloud) | Background outbox sync keeps SQLite and Supabase in agreement, enabling multi-device access and backup |

This means the app **never requires a network call to function** — every screen reads/writes SQLite directly. Supabase is bolted on as a sync target only after a user upgrades, using the same schema/migrations that already exist in [db/migrations](../db/migrations).

---

## Repository Structure

The mobile app lives in the **same repo** as a workspace package, not a separate repo. Shared business logic (parser, categorizer, types, formatters) has no framework dependency, so duplicating it across repos would create permanent drift risk. npm/pnpm workspaces solve this with zero build tooling overhead:

```
ledgeit-web/                    (existing repo, restructured)
├── apps/
│   ├── web/                    # current Next.js app (src/, app/, etc.)
│   └── mobile/                 # this Expo app
├── packages/
│   └── core/                   # shared, framework-agnostic code
│       ├── types/index.ts
│       ├── parser.ts
│       ├── categorizer.ts
│       ├── fuzzy.ts
│       ├── formatters.ts
│       ├── money.ts            # cents ⇄ decimal helpers, shared by both apps
│       ├── coach.ts
│       ├── budgetTemplates.ts
│       └── activePlan.ts
├── db/                         # unchanged — canonical Postgres schema/migrations
└── package.json                # "workspaces": ["apps/*", "packages/*"]
```

`apps/web` and `apps/mobile` both depend on `@ledgeit/core` — one source of truth for business logic, no manual copy/sync between repos. Moving `src/` into `apps/web/src` is mechanical (update `tsconfig.json` paths, `next.config.ts`, and the Vercel project's root directory to `apps/web`) and involves no logic changes.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Expo (React Native) + Expo Router | Single TS codebase for iOS + Android, file-based routing mirrors Next.js App Router |
| Language | TypeScript | Shared types/logic with web |
| Local DB | `expo-sqlite` (SQLite) via **Drizzle ORM** | Fast, offline, typed queries; Drizzle schema doubles as the migration source |
| Cloud DB (premium only) | Supabase Postgres | Already the web backend — reuse schema, RLS, and auth |
| Styling | NativeWind v4 (Tailwind for RN) | Reuses the exact `--ledge-*` design tokens from [globals.css](../src/app/globals.css) |
| Animation | Reanimated 3 + Moti | Same spring config (`stiffness: 100, damping: 20`) as Framer Motion on web |
| Sheets | `@gorhom/bottom-sheet` | Matches the "slide-up from FAB" sheet pattern (SmartEntry, TransactionEdit, BudgetAllocation) |
| Charts | Victory Native / `react-native-gifted-charts` | SVG-based equivalents of Recharts |
| State | Zustand | Same store shape as web, persisted via MMKV instead of localStorage |
| Icons | `phosphor-react-native` | Same icon names as `@phosphor-icons/react` |
| Auth (premium) | Supabase Auth + `expo-secure-store` | Deep-link OAuth callback instead of `/auth/callback` route |
| Entitlements | RevenueCat (or Apple/Google native IAP + a `subscriptions` table) | Gates premium sync feature |
| Fonts | `expo-font` + `@expo-google-fonts/plus-jakarta-sans`, local Geist Mono asset | Matches web typography |

---

## Directory Structure

```
mobile/
├── app/                          # Expo Router routes (mirrors src/app)
│   ├── (tabs)/
│   │   ├── dashboard.tsx
│   │   ├── ledger.tsx
│   │   ├── insights.tsx
│   │   └── debts.tsx
│   ├── account.tsx
│   ├── history.tsx
│   └── auth/
│       └── callback.tsx          # Premium-only OAuth deep link handler
│
├── components/                   # 1:1 port of src/components, RN primitives instead of DOM
│   ├── budget/
│   ├── dashboard/
│   ├── debt/
│   ├── entry/
│   ├── insights/
│   ├── layout/
│   └── ledger/
│
├── lib/
│   ├── data/
│   │   ├── DataProvider.ts       # Interface: getTransactions, addTransaction, ...
│   │   ├── sqlite/
│   │   │   ├── db.ts             # Drizzle + expo-sqlite client
│   │   │   ├── schema.ts         # Drizzle schema (local mirror of db/migrations)
│   │   │   └── queries/          # transactions.ts, budgetLimits.ts, debts.ts, ...
│   │   └── sync/
│   │       ├── outbox.ts         # Pending-change queue (premium only)
│   │       ├── syncEngine.ts     # Push/pull loop against Supabase
│   │       └── conflict.ts       # Last-write-wins resolution
│   ├── parser.ts                 # Ported unchanged from web
│   ├── categorizer.ts            # Ported unchanged from web
│   ├── fuzzy.ts                  # Ported unchanged from web
│   ├── formatters.ts             # Ported unchanged from web
│   ├── coach.ts                  # Ported unchanged from web
│   ├── budgetTemplates.ts        # Ported unchanged from web
│   ├── activePlan.ts             # Ported unchanged from web
│   ├── store.ts                  # Zustand, MMKV persist adapter
│   ├── entitlements.ts           # isPremium() check (RevenueCat / Supabase profile)
│   └── supabase/
│       └── client.ts             # Only initialized when user is premium
│
└── types/
    └── index.ts                  # Ported unchanged from web
```

---

## Data Layer Architecture

### `DataProvider` abstraction

All screens/components call a single `DataProvider` interface — they never talk to SQLite or Supabase directly. This keeps free vs. premium behavior invisible to the UI layer.

```typescript
interface DataProvider {
  getTransactions(filter?: TransactionFilter): Promise<Transaction[]>
  addTransaction(tx: TransactionDraft): Promise<Transaction>
  updateTransaction(id: string, patch: Partial<Transaction>): Promise<void>
  deleteTransaction(id: string): Promise<void>
  getBudgetLimits(): Promise<BudgetLimit[]>
  // ...same surface as src/lib/db/*.ts today
}
```

- **Free users:** `DataProvider` is implemented purely by `sqlite/queries/*` — direct reads/writes to the local DB, no network.
- **Premium users:** the SQLite implementation is wrapped — every write also appends a row to a local `sync_outbox` table. A background `syncEngine` periodically pushes outbox rows to Supabase and pulls remote changes into SQLite. **The UI always reads from SQLite**, so the app is instant and works offline even for premium users; Supabase is a durable backup/sync target, not the live source of truth.

### Local SQLite schema (Drizzle)

Mirrors the existing Postgres migrations in [db/migrations](../db/migrations), minus `user_id`/RLS (the local DB is inherently single-user), plus sync bookkeeping columns used only when premium.

**Money columns are stored as integer cents, not floats.** SQLite has no fixed-point decimal type, and `real` (float) accumulates rounding error on repeated sums — unacceptable for a ledger. Every `NUMERIC(12,2)` column from the Postgres schema becomes an `integer` `*_cents` column locally. `packages/core/money.ts` exposes `toCents(dollars)` / `fromCents(cents)` helpers shared by both apps, and the sync engine converts cents ⇄ decimal at the Supabase boundary (Postgres keeps `NUMERIC(12,2)` as the wire format, since the web app already reads/writes decimals directly).

```typescript
// lib/data/sqlite/schema.ts
export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),               // uuid, generated client-side
  amountCents: integer('amount_cents').notNull(),  // integer cents — no float rounding
  type: text('type').notNull(),              // 'income' | 'expense' | 'transfer'
  merchant: text('merchant').notNull().default(''),
  categoryId: text('category_id').notNull().default('other'),
  notes: text('notes'),
  raw: text('raw').notNull().default(''),
  confidence: real('confidence').notNull().default(1),
  isRecurring: integer('is_recurring', { mode: 'boolean' }).notNull().default(false),
  transferType: text('transfer_type'),
  paymentMethod: text('payment_method').notNull().default('cash'),
  date: text('date').notNull(),              // ISO date
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),             // tombstone for sync (premium)
  dirty: integer('dirty', { mode: 'boolean' }).notNull().default(false), // pending sync push
})
```

Equivalent tables for `budget_limits`, `budget_allocations`, `custom_categories`, `income_allocations`, `debts`, `debt_repayments` — same column set as their SQL migration files, translated to SQLite types (`NUMERIC(12,2)` → `integer` `*_cents`, `UUID` → `text`, `BOOLEAN` → `integer` mode boolean, `TIMESTAMPTZ`/`DATE` → `text` ISO string). Their money columns become: `budget_limits.limitAmountCents`, `budget_allocation_items.limitAmountCents`, `income_allocation_items.amountCents`, `debts.principalCents`, `debt_repayments.amountCents`.

### Sync engine (premium only)

**Outbox pattern:**
1. Every write (`insert`/`update`/`delete`) on a premium account writes to the local table **and** inserts a row into `sync_outbox` (`table_name`, `row_id`, `op`, `payload`, `created_at`).
2. A background task (triggered on app foreground, network reconnect, and every N minutes via `expo-background-task`) drains the outbox: pushes each pending op to Supabase via the same `lib/db/*.ts` functions already used on web, converting `*_cents` integers back to decimal via `fromCents()` before sending.
3. A `pull` step fetches rows from Supabase updated after the local `last_synced_at` watermark and upserts them into SQLite (skipping rows whose local `updated_at` is newer — last-write-wins by timestamp).
4. Deletes are soft (`deleted_at` tombstone) on both sides so they can propagate correctly instead of silently reappearing.

**Downgrade/upgrade transitions:**
- Free → Premium: sign in, create Supabase account if needed, then push the entire local SQLite dataset as the initial sync (bulk insert).
- Premium → Free (subscription lapses): stop syncing; SQLite data is retained locally and the app keeps working, just without cloud backup.

---

## Reused from Web (little to no changes)

- [parser.ts](../src/lib/parser.ts), [categorizer.ts](../src/lib/categorizer.ts), [fuzzy.ts](../src/lib/fuzzy.ts), [formatters.ts](../src/lib/formatters.ts), [coach.ts](../src/lib/coach.ts), [budgetTemplates.ts](../src/lib/budgetTemplates.ts), [activePlan.ts](../src/lib/activePlan.ts) — extracted into `packages/core` and imported by both `apps/web` and `apps/mobile`
- [types/index.ts](../src/types/index.ts) — `CATEGORIES` registry, `Transaction`, `BudgetLimit`, etc. — also moves into `packages/core`
- `packages/core/money.ts` — new shared `toCents()`/`fromCents()` helpers used by mobile's SQLite layer and the sync engine
- `lib/db/*.ts` query shape (function names/signatures) — reused as the interface contract for both the SQLite and Supabase-sync implementations
- Zustand store logic — same actions/selectors, different persistence adapter (MMKV vs. localStorage)

## Rebuilt for Native

| Web thing | RN equivalent |
|---|---|
| Tailwind v4 classes + `--ledge-*` CSS vars | **NativeWind v4** — same tokens ported into `tailwind.config.js` |
| `@phosphor-icons/react` | `phosphor-react-native` (same icon names) |
| Framer Motion springs | **Reanimated 3 + Moti** (identical spring constants) |
| Sheets (SmartEntry, TransactionEdit, BudgetAllocation, DatePicker) | `@gorhom/bottom-sheet` |
| Recharts (SpendDonut, WeeklyTrendChart, SpendingHeatmap, TopCategoryBars) | Victory Native / `react-native-gifted-charts` |
| Supabase-only backend | `DataProvider` abstraction over SQLite (free) + Supabase (premium sync) |
| Next.js middleware / SSR auth | `expo-secure-store` session + deep-link OAuth callback (premium only) |
| Geist / Plus Jakarta fonts | `expo-font` + Google Fonts package + local Geist Mono asset |

---

## Phased Game Plan

**Phase 0 — Scaffold**
- `npx create-expo-app` with Expo Router + TypeScript
- Configure NativeWind with `--ledge-*` tokens; set up Drizzle + `expo-sqlite`
- Set up EAS project (build/submit/update)

**Phase 1 — Local data layer**
- Write Drizzle schema mirroring [db/migrations](../db/migrations)
- Implement `DataProvider` (SQLite-only, free-tier path) and port `lib/db/*` query logic
- Port parser/categorizer/store/formatters unchanged

**Phase 2 — Design system parity**
- Build primitive components (Card surfaces, `CategoryBadge`, buttons, metric typography) matching Stitch tokens (VISUAL_DENSITY 7)
- Reanimated spring presets matching the web Animation Contracts table

**Phase 3 — Dashboard, Ledger, Insights (offline-only)**
- Port `BalanceMetric`, `SpendStrip`, `RecentFeed`, `MonthOverview`, `HeroSideStats`, `CoachLine`, `DebtSummaryCard`
- Ledger: `DateGroup`, `FilterChips`, `DateFilterBar`, swipe-to-delete
- Insights: `SpendDonut`, `BudgetBar`, `TopCategoryBars`, `SpendingHeatmap`
- Smart Entry sheet with `ParsePreview`, Debts (`DebtLedger`), Budget Allocation sheet
- **Ship a fully working free/offline app before touching Supabase sync.**

**Phase 4 — Premium: auth + sync engine**
- Supabase Auth (email/OAuth) with `expo-secure-store`, deep-link callback
- `sync_outbox` table, `syncEngine` push/pull, conflict resolution
- Entitlement check (RevenueCat or native IAP) gating sync + `lib/entitlements.ts`
- Free → Premium initial bulk push; Premium → Free graceful downgrade

**Phase 5 — Native polish**
- `expo-haptics` on confirm/delete, `expo-local-authentication` (Face ID/fingerprint app lock)
- Push notifications for budget threshold warnings
- FAB → sheet transition via Reanimated layout animations

**Phase 6 — QA & Ship**
- Real-device testing (iOS + Android), FlashList perf on long ledgers
- TestFlight + Play Internal Testing via EAS Submit
- Crash reporting (Sentry)

---

## Key Dependencies

```
expo, expo-router, nativewind, tailwindcss
expo-sqlite, drizzle-orm, drizzle-kit
react-native-reanimated, moti
@gorhom/bottom-sheet
phosphor-react-native
victory-native (or react-native-gifted-charts)
zustand, react-native-mmkv

# Premium-only
@supabase/supabase-js, react-native-url-polyfill, expo-secure-store
react-native-purchases (RevenueCat)

expo-haptics, expo-local-authentication, expo-notifications
expo-font, @expo-google-fonts/plus-jakarta-sans
```

---

## Open Decisions

- **Entitlement source of truth:** RevenueCat webhook → Supabase `profiles.is_premium`, checked at app launch and cached locally so entitlement gating still works offline.
- **Multi-device conflict edge case:** if the same transaction is edited offline on two premium devices before either syncs, last-write-wins by `updated_at` — acceptable for a personal finance ledger, revisit if shared/family accounts are added later.
- **Web parity for premium sync:** the existing web app already writes directly to Supabase; once mobile sync ships, the same `db/migrations` schema must stay the single canonical Postgres schema for both platforms.
