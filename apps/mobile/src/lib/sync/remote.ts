import {
  resolveCategory,
  type BudgetAllocation,
  type BudgetCarryover,
  type BudgetLimit,
  type CarryoverDestination,
  type CategoryId,
  type CustomCategory,
  type Debt,
  type DebtDirection,
  type IncomeAllocation,
  type PaymentMethodId,
  type Transaction,
  type TransactionType,
  type Wallet,
  type WalletKind,
  type WalletMovementSource,
  type WalletMovementType,
} from '@ledgeit/core';
import { getSupabase } from '@/lib/supabase/client';
import type { SyncData } from '@/lib/store';

// ─── Cloud mapping for premium sync ──────────────────────────────────────────
// Row shapes match apps/web/src/lib/db/*.ts exactly — mobile writes the same
// tables the web app reads, so a premium user's data is shared everywhere.

type Row = Record<string, unknown>;

const PAGE = 1000;
const CHUNK = 500;

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

function chunks<T>(arr: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const day = (v: unknown) => String(v).slice(0, 10);
const num = (v: unknown) => Number(v);

// ─── Local → row ──────────────────────────────────────────────────────────────

function txRow(t: Transaction, userId: string): Row {
  return {
    id: t.id,
    user_id: userId,
    amount: t.amount,
    type: t.type,
    merchant: t.merchant,
    category_id: t.category.id,
    payment_method: t.paymentMethod,
    notes: t.note ?? null,
    raw: t.raw,
    confidence: t.confidence,
    is_recurring: t.isRecurring ?? false,
    is_reimbursement: t.isReimbursement ?? false,
    // `tags` is deliberately omitted: mobile can't edit tags yet, and upserting
    // a stale copy would wipe tags added on web. A PostgREST upsert only writes
    // the columns it's sent, so leaving it out preserves them.
    date: t.date,
    created_at: t.createdAt,
  };
}

function customCategoryRow(c: CustomCategory, userId: string): Row {
  return {
    id: c.id,
    user_id: userId,
    name: c.name,
    icon: c.icon,
    text_color: c.textColor,
    bg_color: c.bgColor,
    created_at: c.createdAt,
  };
}

function allocationRow(a: BudgetAllocation | IncomeAllocation, userId: string): Row {
  return { id: a.id, user_id: userId, name: a.name, is_active: a.isActive, created_at: a.createdAt };
}

function budgetItemRows(a: BudgetAllocation): Row[] {
  // UNIQUE (allocation_id, category_id) — last entry per category wins.
  const byCat = new Map(a.items.map((i) => [i.categoryId, i.limit]));
  return [...byCat].map(([categoryId, limit]) => ({ allocation_id: a.id, category_id: categoryId, limit_amount: limit }));
}

function incomeItemRows(a: IncomeAllocation): Row[] {
  // Web stores only sources with an amount; UNIQUE (allocation_id, source_id).
  const bySource = new Map(a.items.filter((i) => i.amount > 0).map((i) => [i.sourceId, i.amount]));
  return [...bySource].map(([sourceId, amount]) => ({ allocation_id: a.id, source_id: sourceId, amount }));
}

function debtRow(d: Debt, userId: string): Row {
  return {
    id: d.id,
    user_id: userId,
    person_name: d.personName,
    direction: d.direction,
    principal: d.principal,
    note: d.note ?? null,
    is_settled: d.isSettled,
    due_date: d.dueDate ?? null,
    transaction_id: d.transactionId ?? null,
    created_at: d.createdAt,
  };
}

function repaymentRows(d: Debt): (Row & { id: string })[] {
  return d.repayments.map((r) => ({
    id: r.id,
    debt_id: d.id,
    amount: r.amount,
    interest: r.interest ?? 0,
    date: r.date,
    transaction_id: r.transactionId ?? null,
    interest_transaction_id: r.interestTransactionId ?? null,
    created_at: r.createdAt,
  }));
}

function walletRow(w: Wallet, userId: string): Row {
  return {
    id: w.id,
    user_id: userId,
    name: w.name,
    kind: w.kind,
    icon: w.icon,
    color: w.color,
    target: w.target ?? null,
    note: w.note ?? null,
    is_archived: w.isArchived,
    created_at: w.createdAt,
  };
}

function movementRows(w: Wallet): (Row & { id: string })[] {
  return w.movements.map((m) => ({
    id: m.id,
    wallet_id: w.id,
    type: m.type,
    amount: m.amount,
    date: m.date,
    note: m.note ?? null,
    source: m.source,
    transaction_id: m.transactionId ?? null,
    created_at: m.createdAt,
  }));
}

function carryoverRow(c: BudgetCarryover, userId: string): Row {
  return {
    id: c.id,
    user_id: userId,
    category_id: c.categoryId,
    from_month: c.fromMonth,
    to_month: c.toMonth,
    amount: c.amount,
    destination: c.destination,
    wallet_id: c.walletId ?? null,
    transaction_id: c.transactionId ?? null,
    created_at: c.createdAt,
  };
}

function limitRows(limits: BudgetLimit[], month: string, userId: string): Row[] {
  // UNIQUE (user_id, category_id, month) — last entry per category wins.
  const byCat = new Map(limits.map((l) => [l.categoryId, l.limit]));
  return [...byCat].map(([categoryId, limit]) => ({ user_id: userId, category_id: categoryId, limit_amount: limit, month }));
}

// ─── Diff + push ──────────────────────────────────────────────────────────────

interface Diff {
  upserts: Row[];
  deletes: string[];
}

function diffRows<T extends { id: string }>(prev: T[], next: T[], toRow: (x: T) => Row): Diff {
  const before = new Map(prev.map((x) => [x.id, JSON.stringify(toRow(x))]));
  const upserts: Row[] = [];
  for (const x of next) {
    const row = toRow(x);
    if (before.get(x.id) !== JSON.stringify(row)) upserts.push(row);
  }
  const nextIds = new Set(next.map((x) => x.id));
  const deletes = prev.filter((x) => !nextIds.has(x.id)).map((x) => x.id);
  return { upserts, deletes };
}

/** Child rows already carry their own `id`, so diff them directly. */
function diffChildRows(prev: (Row & { id: string })[], next: (Row & { id: string })[], deletedParents: Set<string>, parentKey: string): Diff {
  const d = diffRows(prev, next, (r) => r);
  // Children of a deleted parent go with it via ON DELETE CASCADE.
  const prevById = new Map(prev.map((r) => [r.id, r]));
  d.deletes = d.deletes.filter((id) => !deletedParents.has(String(prevById.get(id)?.[parentKey])));
  return d;
}

/** Ids whose nested item list differs (or that are new). */
function changedItemSets<T extends { id: string }>(prev: T[], next: T[], items: (x: T) => Row[]): T[] {
  const before = new Map(prev.map((x) => [x.id, JSON.stringify(items(x))]));
  return next.filter((x) => before.get(x.id) !== JSON.stringify(items(x)));
}

async function upsertRows(table: string, rows: Row[]) {
  for (const part of chunks(rows)) {
    const { error } = await getSupabase().from(table).upsert(part);
    check(error);
  }
}

async function deleteIds(table: string, ids: string[], column = 'id') {
  for (const part of chunks(ids)) {
    const { error } = await getSupabase().from(table).delete().in(column, part);
    check(error);
  }
}

async function replaceChildren(table: string, parentIds: string[], rows: Row[]) {
  if (parentIds.length === 0) return;
  await deleteIds(table, parentIds, 'allocation_id');
  for (const part of chunks(rows)) {
    const { error } = await getSupabase().from(table).insert(part);
    check(error);
  }
}

function normalizeLimits(byMonth: Record<string, BudgetLimit[]>): Map<string, string> {
  // An empty snapshot and an absent one are the same thing in the cloud.
  const out = new Map<string, string>();
  for (const [month, limits] of Object.entries(byMonth)) {
    if (limits.length > 0) out.set(month, JSON.stringify(limitRows(limits, month, '')));
  }
  return out;
}

/** True when `next` holds nothing that differs from `prev` in the cloud's eyes. */
export function hasChanges(prev: SyncData, next: SyncData): boolean {
  return (
    prev.transactions !== next.transactions ||
    prev.customCategories !== next.customCategories ||
    prev.budgetAllocations !== next.budgetAllocations ||
    prev.incomeAllocations !== next.incomeAllocations ||
    prev.debts !== next.debts ||
    prev.wallets !== next.wallets ||
    prev.budgetCarryovers !== next.budgetCarryovers ||
    prev.budgetLimitsByMonth !== next.budgetLimitsByMonth ||
    prev.hiddenCategories !== next.hiddenCategories ||
    prev.lastRecapMonth !== next.lastRecapMonth
  );
}

/**
 * Push every difference between `prev` (what the cloud is known to hold) and
 * `next` (current local data). Deletes run first so re-created rows don't trip
 * unique constraints; parents are upserted before their children.
 */
export async function pushChanges(userId: string, prev: SyncData, next: SyncData): Promise<void> {
  const supabase = getSupabase();

  const tx = diffRows(prev.transactions, next.transactions, (t) => txRow(t, userId));
  const cats = diffRows(prev.customCategories, next.customCategories, (c) => customCategoryRow(c, userId));
  const allocs = diffRows(prev.budgetAllocations, next.budgetAllocations, (a) => allocationRow(a, userId));
  const incomes = diffRows(prev.incomeAllocations, next.incomeAllocations, (a) => allocationRow(a, userId));
  const debts = diffRows(prev.debts, next.debts, (d) => debtRow(d, userId));
  const wallets = diffRows(prev.wallets, next.wallets, (w) => walletRow(w, userId));
  const carry = diffRows(prev.budgetCarryovers, next.budgetCarryovers, (c) => carryoverRow(c, userId));
  const repay = diffChildRows(prev.debts.flatMap(repaymentRows), next.debts.flatMap(repaymentRows), new Set(debts.deletes), 'debt_id');
  const moves = diffChildRows(prev.wallets.flatMap(movementRows), next.wallets.flatMap(movementRows), new Set(wallets.deletes), 'wallet_id');
  const allocItems = changedItemSets(prev.budgetAllocations, next.budgetAllocations, budgetItemRows);
  const incomeItems = changedItemSets(prev.incomeAllocations, next.incomeAllocations, incomeItemRows);

  // ── Deletes ──
  await deleteIds('budget_carryovers', carry.deletes);
  await deleteIds('wallet_movements', moves.deletes);
  await deleteIds('debt_repayments', repay.deletes);
  await deleteIds('wallets', wallets.deletes);
  await deleteIds('debts', debts.deletes);
  await deleteIds('budget_allocations', allocs.deletes);
  await deleteIds('income_allocations', incomes.deletes);
  await deleteIds('transactions', tx.deletes);
  await deleteIds('custom_categories', cats.deletes);

  // ── Upserts ──
  // Deactivate before activating so "one active plan" never sees two at once.
  const byActive = (a: Row, b: Row) => Number(a.is_active) - Number(b.is_active);
  await upsertRows('custom_categories', cats.upserts);
  await upsertRows('transactions', tx.upserts);
  await upsertRows('budget_allocations', allocs.upserts.sort(byActive));
  await replaceChildren('budget_allocation_items', allocItems.map((a) => a.id), allocItems.flatMap(budgetItemRows));
  await upsertRows('income_allocations', incomes.upserts.sort(byActive));
  await replaceChildren('income_allocation_items', incomeItems.map((a) => a.id), incomeItems.flatMap(incomeItemRows));
  await upsertRows('wallets', wallets.upserts);
  await upsertRows('wallet_movements', moves.upserts);
  await upsertRows('debts', debts.upserts);
  await upsertRows('debt_repayments', repay.upserts);
  await upsertRows('budget_carryovers', carry.upserts);

  // ── Per-month budget snapshots (replace whole month, like web) ──
  const prevLimits = normalizeLimits(prev.budgetLimitsByMonth);
  const nextLimits = normalizeLimits(next.budgetLimitsByMonth);
  const months = new Set([...prevLimits.keys(), ...nextLimits.keys()]);
  for (const month of months) {
    if (prevLimits.get(month) === nextLimits.get(month)) continue;
    const { error: delError } = await supabase.from('budget_limits').delete().eq('user_id', userId).eq('month', month);
    check(delError);
    const limits = next.budgetLimitsByMonth[month] ?? [];
    if (limits.length > 0) {
      const { error } = await supabase.from('budget_limits').insert(limitRows(limits, month, userId));
      check(error);
    }
  }

  // ── Settings ──
  const hiddenChanged = JSON.stringify(prev.hiddenCategories) !== JSON.stringify(next.hiddenCategories);
  if (hiddenChanged || prev.lastRecapMonth !== next.lastRecapMonth) {
    const { error } = await supabase.from('user_settings').upsert(
      {
        user_id: userId,
        hidden_categories: next.hiddenCategories,
        last_recap_month: next.lastRecapMonth,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    check(error);
  }
}

// ─── Fetch ───────────────────────────────────────────────────────────────────

async function fetchAll<T>(table: string, select: string, userId: string, ascending = false): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await getSupabase()
      .from(table)
      .select(select)
      .eq('user_id', userId)
      .order('created_at', { ascending })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    check(error);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

/** Load the user's full dataset from Supabase in the local store's shape. */
export async function fetchCloudData(userId: string): Promise<SyncData> {
  const supabase = getSupabase();

  const catRows = await fetchAll<Row>('custom_categories', '*', userId, true);
  const customCategories: CustomCategory[] = catRows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    icon: String(r.icon),
    textColor: String(r.text_color),
    bgColor: String(r.bg_color),
    createdAt: String(r.created_at),
  }));

  const [txRows, allocRows, incomeRows, debtRows, walletRows, carryRows, limitRowsRaw, settingsRes] = await Promise.all([
    fetchAll<Row>('transactions', '*', userId),
    fetchAll<Row>('budget_allocations', '*, budget_allocation_items(*)', userId),
    fetchAll<Row>('income_allocations', '*, income_allocation_items(*)', userId),
    fetchAll<Row>('debts', '*, debt_repayments(*)', userId),
    fetchAll<Row>('wallets', '*, wallet_movements(*)', userId),
    fetchAll<Row>('budget_carryovers', '*', userId),
    supabase.from('budget_limits').select('category_id, limit_amount, month').eq('user_id', userId),
    supabase.from('user_settings').select('hidden_categories, last_recap_month').eq('user_id', userId).maybeSingle(),
  ]);
  check(limitRowsRaw.error);
  check(settingsRes.error);

  const transactions: Transaction[] = txRows.map((r) => ({
    id: String(r.id),
    raw: String(r.raw ?? ''),
    amount: num(r.amount),
    merchant: String(r.merchant ?? ''),
    category: resolveCategory(String(r.category_id), customCategories),
    date: day(r.date),
    type: r.type as TransactionType,
    paymentMethod: (r.payment_method ?? 'cash') as PaymentMethodId,
    confidence: num(r.confidence),
    isRecurring: Boolean(r.is_recurring),
    isReimbursement: Boolean(r.is_reimbursement),
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    note: (r.notes as string | null) ?? undefined,
    createdAt: String(r.created_at),
  }));

  const budgetAllocations: BudgetAllocation[] = allocRows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    isActive: Boolean(r.is_active),
    createdAt: String(r.created_at),
    items: ((r.budget_allocation_items as Row[]) ?? []).map((i) => ({
      categoryId: i.category_id as CategoryId,
      limit: num(i.limit_amount),
    })),
  }));

  const incomeAllocations: IncomeAllocation[] = incomeRows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    isActive: Boolean(r.is_active),
    createdAt: String(r.created_at),
    items: ((r.income_allocation_items as Row[]) ?? []).map((i) => ({
      sourceId: String(i.source_id),
      amount: num(i.amount),
    })),
  }));

  const debts: Debt[] = debtRows.map((r) => ({
    id: String(r.id),
    personName: String(r.person_name),
    direction: r.direction as DebtDirection,
    principal: num(r.principal),
    note: (r.note as string | null) ?? undefined,
    isSettled: Boolean(r.is_settled),
    dueDate: r.due_date ? day(r.due_date) : undefined,
    transactionId: (r.transaction_id as string | null) ?? undefined,
    repayments: ((r.debt_repayments as Row[]) ?? [])
      .map((p) => ({
        id: String(p.id),
        amount: num(p.amount),
        interest: num(p.interest ?? 0),
        date: day(p.date),
        transactionId: (p.transaction_id as string | null) ?? undefined,
        interestTransactionId: (p.interest_transaction_id as string | null) ?? undefined,
        createdAt: String(p.created_at),
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    createdAt: String(r.created_at),
  }));

  const wallets: Wallet[] = walletRows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    kind: r.kind as WalletKind,
    icon: String(r.icon),
    color: String(r.color),
    target: r.target != null ? num(r.target) : undefined,
    note: (r.note as string | null) ?? undefined,
    isArchived: Boolean(r.is_archived),
    movements: ((r.wallet_movements as Row[]) ?? [])
      .map((m) => ({
        id: String(m.id),
        type: m.type as WalletMovementType,
        amount: num(m.amount),
        date: day(m.date),
        note: (m.note as string | null) ?? undefined,
        source: (m.source ?? 'manual') as WalletMovementSource,
        transactionId: (m.transaction_id as string | null) ?? undefined,
        createdAt: String(m.created_at),
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    createdAt: String(r.created_at),
  }));

  const budgetCarryovers: BudgetCarryover[] = carryRows.map((r) => ({
    id: String(r.id),
    categoryId: String(r.category_id),
    fromMonth: String(r.from_month),
    toMonth: String(r.to_month),
    amount: num(r.amount),
    destination: r.destination as CarryoverDestination,
    walletId: (r.wallet_id as string | null) ?? undefined,
    transactionId: (r.transaction_id as string | null) ?? undefined,
    createdAt: String(r.created_at),
  }));

  const budgetLimitsByMonth: Record<string, BudgetLimit[]> = {};
  for (const r of (limitRowsRaw.data ?? []) as Row[]) {
    const month = String(r.month);
    (budgetLimitsByMonth[month] ??= []).push({
      categoryId: r.category_id as CategoryId,
      limit: num(r.limit_amount),
      cycle: 'monthly',
    });
  }

  const settings = settingsRes.data as { hidden_categories: string[] | null; last_recap_month: string | null } | null;

  return {
    transactions,
    budgetLimitsByMonth,
    budgetAllocations,
    customCategories,
    hiddenCategories: settings?.hidden_categories ?? [],
    incomeAllocations,
    debts,
    wallets,
    budgetCarryovers,
    lastRecapMonth: settings?.last_recap_month ?? null,
  };
}

/**
 * First link of a device to an account: keep everything already in the cloud
 * and add local-only rows (UUIDs make id collisions a non-issue). Anything that
 * would break a cloud uniqueness rule yields to the cloud copy.
 */
export function mergeForFirstLink(cloud: SyncData, local: SyncData): SyncData {
  const addMissing = <T extends { id: string }>(remote: T[], mine: T[]) => {
    const ids = new Set(remote.map((x) => x.id));
    return [...remote, ...mine.filter((x) => !ids.has(x.id))];
  };
  // Only one active plan per user: the cloud's active plan wins.
  const demote = <T extends { isActive: boolean }>(remote: T[], mine: T[]) =>
    remote.some((a) => a.isActive) ? mine.map((a) => ({ ...a, isActive: false })) : mine;
  // One carryover per (category, fromMonth).
  const cloudCarryKeys = new Set(cloud.budgetCarryovers.map((c) => `${c.categoryId}|${c.fromMonth}`));
  const localCarry = local.budgetCarryovers.filter((c) => !cloudCarryKeys.has(`${c.categoryId}|${c.fromMonth}`));

  return {
    transactions: addMissing(cloud.transactions, local.transactions),
    customCategories: addMissing(cloud.customCategories, local.customCategories),
    budgetAllocations: addMissing(cloud.budgetAllocations, demote(cloud.budgetAllocations, local.budgetAllocations)),
    incomeAllocations: addMissing(cloud.incomeAllocations, demote(cloud.incomeAllocations, local.incomeAllocations)),
    debts: addMissing(cloud.debts, local.debts),
    wallets: addMissing(cloud.wallets, local.wallets),
    budgetCarryovers: addMissing(cloud.budgetCarryovers, localCarry),
    budgetLimitsByMonth: { ...local.budgetLimitsByMonth, ...cloud.budgetLimitsByMonth },
    hiddenCategories: [...new Set([...cloud.hiddenCategories, ...local.hiddenCategories])],
    lastRecapMonth:
      [cloud.lastRecapMonth, local.lastRecapMonth].filter((m): m is string => Boolean(m)).sort().pop() ?? null,
  };
}
