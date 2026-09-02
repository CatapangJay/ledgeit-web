import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { CaretDown, MagnifyingGlass, SlidersHorizontal, X, ListChecks, Tag, CalendarBlank, Trash } from 'phosphor-react-native';
import { PAYMENT_METHODS, formatCurrency, isSpend, spendAmount, type Category, type PaymentMethodId, type Transaction } from '@ledgeit/core';
import FilterChips, { type FilterValue } from '@/components/ledger/FilterChips';
import DateFilterBar, { type DatePeriod } from '@/components/ledger/DateFilterBar';
import DateGroup from '@/components/ledger/DateGroup';
import TransactionRow from '@/components/ledger/TransactionRow';
import TransactionEditSheet from '@/components/ledger/TransactionEditSheet';
import CategoryBreakdownBar from '@/components/ledger/CategoryBreakdownBar';
import CategoryPickerSheet from '@/components/ledger/CategoryPickerSheet';
import WalletStrip from '@/components/ledger/WalletStrip';
import DatePickerSheet from '@/components/ui/DatePickerSheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDeferredMount } from '@/lib/useDeferredMount';
import { useStore } from '@/lib/store';

function groupByDate(txns: Transaction[]): [string, Transaction[]][] {
  const map = new Map<string, Transaction[]>();
  for (const tx of txns) {
    const list = map.get(tx.date) ?? [];
    list.push(tx);
    map.set(tx.date, list);
  }
  return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Inclusive [start, end] ISO bounds for a period, or null for "all time". */
function periodRange(period: DatePeriod, customDate: string | null): { start: string; end: string } | null {
  const now = new Date();
  const today = toISO(now);
  if (period === 'thisMonth') {
    return { start: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), end: today };
  }
  if (period === 'last7' || period === 'last30') {
    const span = period === 'last7' ? 6 : 29;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - span);
    return { start: toISO(start), end: today };
  }
  if (period === 'custom' && customDate) {
    return { start: customDate, end: customDate };
  }
  return null;
}

function EmptyFiltered({ hasActiveFilters }: { hasActiveFilters: boolean }) {
  return (
    <View className="items-center gap-2 py-14">
      <MagnifyingGlass size={26} weight="duotone" color="#a9c2bd" />
      <Text className="text-center text-sm font-semibold" style={{ color: '#3f4946' }}>
        {hasActiveFilters ? 'No transactions match these filters.' : 'No transactions yet.'}
      </Text>
      <Text className="text-center text-xs" style={{ color: '#6e9990' }}>
        {hasActiveFilters ? 'Try widening the date range or clearing filters.' : 'Log your first entry to see it here.'}
      </Text>
    </View>
  );
}

export default function LedgerScreen() {
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  // Defer the breakdown + transaction list so the screen shell + filters paint
  // instantly on navigation; the list mounts a frame later behind a skeleton.
  const listReady = useDeferredMount();
  const transactions = useStore((s) => s.transactions);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const bulkChangeCategory = useStore((s) => s.bulkChangeCategory);
  const bulkChangeDate = useStore((s) => s.bulkChangeDate);
  const bulkDelete = useStore((s) => s.bulkDelete);
  const customCategories = useStore((s) => s.customCategories);
  const hiddenCategories = useStore((s) => s.hiddenCategories);

  const [filter, setFilter] = useState<FilterValue>('all');
  const [period, setPeriod] = useState<DatePeriod>('all');
  const [customDate, setCustomDate] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<PaymentMethodId | 'all'>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Bulk selection state.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPickerOpen, setBulkPickerOpen] = useState(false);
  const [bulkDatePickerOpen, setBulkDatePickerOpen] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkError, setBulkError] = useState(false);

  // Deep-link from the dashboard heatmap: `/ledger?date=YYYY-MM-DD` scopes the
  // list to that single day.
  useEffect(() => {
    if (dateParam) {
      setCustomDate(dateParam);
      setPeriod('custom');
    }
  }, [dateParam]);

  const customChips = customCategories.map((c) => ({ value: c.id, label: c.name }));

  const range = useMemo(() => periodRange(period, customDate), [period, customDate]);
  const query = search.trim().toLowerCase();
  const hasActiveFilters = filter !== 'all' || period !== 'all' || query !== '' || methodFilter !== 'all';
  const activePanelFilters = (filter !== 'all' ? 1 : 0) + (period !== 'all' ? 1 : 0) + (methodFilter !== 'all' ? 1 : 0);

  function clearAll() {
    setFilter('all');
    setPeriod('all');
    setCustomDate(null);
    setSearch('');
    setMethodFilter('all');
  }

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter === 'expense' && t.type !== 'expense') return false;
      else if (filter === 'income' && t.type !== 'income') return false;
      else if (filter === 'transfer' && t.type !== 'transfer') return false;
      else if (filter !== 'all' && filter !== 'expense' && filter !== 'income' && filter !== 'transfer' && t.category.id !== filter) return false;
      if (range && (t.date < range.start || t.date > range.end)) return false;
      if (methodFilter !== 'all' && t.paymentMethod !== methodFilter) return false;
      if (query) {
        const haystack = `${t.merchant} ${t.category.label} ${t.raw}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [transactions, filter, range, query, methodFilter]);

  // spendAmount nets out reimbursements from the filtered expense total.
  const totalAmount = useMemo(() => filtered.reduce((s, t) => s + (isSpend(t) ? spendAmount(t) : 0), 0), [filtered]);
  const groups = groupByDate(filtered);

  // Debt-linked entries can't be recategorized here (managed on the Debts
  // screen), so they're excluded from selection and select-all.
  const selectableFiltered = useMemo(() => filtered.filter((t) => t.category.id !== 'debts'), [filtered]);
  // Selection is scoped to what's currently visible.
  const visibleSelectedIds = useMemo(
    () => selectableFiltered.filter((t) => selectedIds.has(t.id)).map((t) => t.id),
    [selectableFiltered, selectedIds],
  );
  const selectedCount = visibleSelectedIds.length;
  const allSelected = selectableFiltered.length > 0 && selectedCount === selectableFiltered.length;

  function enterSelectMode() {
    setSelectMode(true);
    setSelectedIds(new Set());
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
    setBulkPickerOpen(false);
    setBulkDatePickerOpen(false);
    setBulkDeleteConfirm(false);
    setBulkError(false);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const t of selectableFiltered) next.delete(t.id);
      } else {
        for (const t of selectableFiltered) next.add(t.id);
      }
      return next;
    });
  }

  async function handleBulkCategory(category: Category) {
    const ids = visibleSelectedIds;
    setBulkPickerOpen(false);
    setBulkError(false);
    const ok = await bulkChangeCategory(ids, category);
    if (ok) exitSelectMode();
    else setBulkError(true);
  }

  async function handleBulkDate(date: string) {
    const ids = visibleSelectedIds;
    setBulkDatePickerOpen(false);
    setBulkError(false);
    const ok = await bulkChangeDate(ids, date);
    if (ok) exitSelectMode();
    else setBulkError(true);
  }

  async function handleBulkDelete() {
    const ids = visibleSelectedIds;
    setBulkDeleteConfirm(false);
    setBulkError(false);
    const ok = await bulkDelete(ids);
    if (ok) exitSelectMode();
    else setBulkError(true);
  }

  return (
    <View className="flex-1" style={{ backgroundColor: '#f8faf9' }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-baseline justify-between gap-3 pb-4 pt-16">
          <View className="flex-row items-baseline gap-3">
            <Text className="text-xl font-bold tracking-tight" style={{ color: '#00352e' }}>
              Activity
            </Text>
            <Text className="text-xs font-semibold" style={{ color: '#6e9990' }}>
              {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            {totalAmount > 0 && !selectMode && (
              <Text className="font-mono text-xs font-semibold" style={{ color: '#ba1a1a' }}>
                −{formatCurrency(totalAmount)}
              </Text>
            )}
            {filtered.length > 0 && (
              <Pressable
                onPress={selectMode ? exitSelectMode : enterSelectMode}
                className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
                style={selectMode ? { backgroundColor: '#00352e' } : { backgroundColor: '#f0f4f2' }}
              >
                <ListChecks size={13} weight="bold" color={selectMode ? '#ffffff' : '#3f4946'} />
                <Text className="text-[12px] font-semibold" style={{ color: selectMode ? '#ffffff' : '#3f4946' }}>
                  {selectMode ? 'Done' : 'Select'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Bulk selection toolbar */}
        {selectMode && (
          <View className="mb-3 gap-2 rounded-2xl px-4 py-3" style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.06, shadowRadius: 20, elevation: 1 }}>
            {/* Row 1: select-all + count */}
            <View className="flex-row items-center justify-between gap-2">
              <Pressable onPress={toggleSelectAll} className="flex-row items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: '#f0f4f2' }}>
                <Text className="text-[12px] font-semibold" style={{ color: '#1f695d' }}>
                  {allSelected ? 'Clear all' : 'Select all'}
                </Text>
              </Pressable>
              <Text className="text-[12px] font-semibold" style={{ color: '#3f4946' }}>
                {selectedCount} selected
              </Text>
            </View>

            {/* Row 2: bulk actions */}
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => setBulkPickerOpen(true)}
                disabled={selectedCount === 0}
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2"
                style={{ backgroundColor: '#1f695d', opacity: selectedCount === 0 ? 0.4 : 1 }}
              >
                <Tag size={13} weight="bold" color="#ffffff" />
                <Text className="text-[12px] font-bold text-white">Category</Text>
              </Pressable>
              <Pressable
                onPress={() => setBulkDatePickerOpen(true)}
                disabled={selectedCount === 0}
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2"
                style={{ backgroundColor: '#e7edeb', opacity: selectedCount === 0 ? 0.4 : 1 }}
              >
                <CalendarBlank size={13} weight="bold" color="#1f695d" />
                <Text className="text-[12px] font-bold" style={{ color: '#1f695d' }}>Date</Text>
              </Pressable>
              <Pressable
                onPress={() => setBulkDeleteConfirm(true)}
                disabled={selectedCount === 0}
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2"
                style={{ backgroundColor: '#fbeaea', opacity: selectedCount === 0 ? 0.4 : 1 }}
              >
                <Trash size={13} weight="bold" color="#ba1a1a" />
                <Text className="text-[12px] font-bold" style={{ color: '#ba1a1a' }}>Delete</Text>
              </Pressable>
            </View>
          </View>
        )}
        {selectMode && bulkError && (
          <Text className="mb-3 rounded-2xl px-4 py-2.5 text-[12px] font-semibold" style={{ backgroundColor: '#fbeaea', color: '#ba1a1a' }}>
            Couldn&apos;t update those transactions. Try again.
          </Text>
        )}

        {/* Search */}
        <View className="mb-3 flex-row items-center gap-2 rounded-2xl px-4 py-3" style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.06, shadowRadius: 20, elevation: 1 }}>
          <MagnifyingGlass size={15} weight="bold" color="#6e9990" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search merchant, category, or note…"
            placeholderTextColor="#6e9990"
            className="min-w-0 flex-1 text-sm"
            style={{ color: '#191c1c', paddingVertical: 0 }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={12} className="h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: '#f0f4f2' }}>
              <X size={10} weight="bold" color="#6e9990" />
            </Pressable>
          )}
        </View>

        {/* Wallet balances — quick context (hidden in select mode to keep the
            bulk toolbar uncluttered). */}
        {!selectMode && <WalletStrip />}

        {/* Filters toggle */}
        <View className="mb-2.5 flex-row items-center justify-between gap-2">
          <Pressable
            onPress={() => setFiltersOpen((o) => !o)}
            className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ backgroundColor: '#f0f4f2' }}
          >
            <SlidersHorizontal size={13} weight="bold" color="#3f4946" />
            <Text className="text-[12px] font-semibold" style={{ color: '#3f4946' }}>
              Filters
            </Text>
            {activePanelFilters > 0 && (
              <View className="h-4 min-w-4 items-center justify-center rounded-full px-1" style={{ backgroundColor: '#1f695d' }}>
                <Text className="text-[10px] font-bold text-white">{activePanelFilters}</Text>
              </View>
            )}
            <CaretDown size={12} weight="bold" color="#3f4946" style={{ transform: [{ rotate: filtersOpen ? '180deg' : '0deg' }] }} />
          </Pressable>

          {hasActiveFilters && (
            <Pressable onPress={clearAll} className="flex-row items-center gap-1 rounded-full px-3 py-1.5" style={{ backgroundColor: '#e7edeb' }}>
              <Text className="text-[11px] font-semibold" style={{ color: '#1f695d' }}>
                Clear all
              </Text>
              <X size={10} weight="bold" color="#1f695d" />
            </Pressable>
          )}
        </View>

        {/* Collapsible filter controls */}
        {filtersOpen && (
          <View className="mb-1">
            <View className="mb-2.5">
              <DateFilterBar period={period} onPeriodChange={setPeriod} />
            </View>
            <View className="mb-2.5">
              <FilterChips active={filter} onChange={setFilter} customChips={customChips} hiddenCategories={hiddenCategories} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginBottom: 12 }}>
              {([{ id: 'all' as const, short: 'Any method' }, ...PAYMENT_METHODS]).map((m) => {
                const active = methodFilter === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setMethodFilter(m.id as PaymentMethodId | 'all')}
                    className="shrink-0 rounded-full px-3.5 py-1.5"
                    style={{ backgroundColor: active ? '#00352e' : '#f0f4f2' }}
                  >
                    <Text className="text-[12px] font-semibold" style={{ color: active ? '#ffffff' : '#3f4946' }}>
                      {m.short}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {!listReady ? (
          /* Skeleton while the breakdown + list mount a frame after navigation */
          <View className="gap-3">
            <Skeleton height={10} radius={6} />
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} className="flex-row items-center gap-3 rounded-2xl bg-white p-4" style={{ shadowColor: '#00352e', shadowOpacity: 0.05, shadowRadius: 10, elevation: 1 }}>
                <Skeleton width={40} height={40} radius={20} />
                <View className="flex-1 gap-2">
                  <Skeleton width="50%" height={13} />
                  <Skeleton width="30%" height={11} />
                </View>
                <Skeleton width={56} height={16} />
              </View>
            ))}
          </View>
        ) : (
          <>
        {/* Category breakdown */}
        <CategoryBreakdownBar transactions={filtered} />

        {/* Transaction list */}
        {filtered.length === 0 ? (
          <EmptyFiltered hasActiveFilters={hasActiveFilters} />
        ) : (
          groups.map(([date, txns]) => (
            <View key={date} className="mb-4">
              <DateGroup date={date} transactions={txns} />
              <View className="overflow-hidden rounded-2xl" style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.06, shadowRadius: 12, elevation: 1 }}>
                {txns.map((tx, i) => (
                  <View key={tx.id} style={i > 0 ? { borderTopWidth: 1, borderTopColor: '#f0f4f2' } : undefined}>
                    <TransactionRow
                      tx={tx}
                      onDelete={deleteTransaction}
                      onEdit={setEditingTx}
                      selectMode={selectMode}
                      selected={selectedIds.has(tx.id)}
                      onToggleSelect={tx.category.id === 'debts' ? undefined : toggleSelect}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
          </>
        )}
      </ScrollView>

      <TransactionEditSheet
        tx={editingTx}
        customCategories={customCategories}
        hiddenCategories={hiddenCategories}
        onClose={() => setEditingTx(null)}
        onSave={updateTransaction}
        onDelete={deleteTransaction}
      />

      <CategoryPickerSheet
        open={bulkPickerOpen}
        title={`Move ${selectedCount} to…`}
        customCategories={customCategories}
        hiddenCategories={hiddenCategories}
        onPick={handleBulkCategory}
        onClose={() => setBulkPickerOpen(false)}
      />

      <DatePickerSheet
        open={bulkDatePickerOpen}
        value={toISO(new Date())}
        onSelect={handleBulkDate}
        onClose={() => setBulkDatePickerOpen(false)}
      />

      {/* Bulk delete confirmation */}
      {bulkDeleteConfirm && (
        <View className="absolute inset-0 items-center justify-center px-6" style={{ backgroundColor: 'rgba(0,53,46,0.28)' }}>
          <View className="w-full max-w-sm rounded-3xl p-5" style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.24, shadowRadius: 40, elevation: 12 }}>
            <View className="mb-3 flex-row items-center gap-2.5">
              <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(186,26,26,0.12)' }}>
                <Trash size={17} weight="fill" color="#ba1a1a" />
              </View>
              <Text className="flex-1 text-sm font-bold" style={{ color: '#00352e' }}>
                Delete {selectedCount} {selectedCount === 1 ? 'transaction' : 'transactions'}?
              </Text>
            </View>
            <Text className="mb-4 text-[13px] leading-relaxed" style={{ color: '#3f4946' }}>
              This permanently removes the selected {selectedCount === 1 ? 'entry' : 'entries'}. This can&apos;t be undone.
            </Text>
            <View className="flex-row gap-2">
              <Pressable onPress={() => setBulkDeleteConfirm(false)} className="flex-1 items-center rounded-xl py-2.5" style={{ backgroundColor: '#f0f4f2' }}>
                <Text className="text-[13px] font-semibold" style={{ color: '#3f4946' }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleBulkDelete} className="flex-1 items-center rounded-xl py-2.5" style={{ backgroundColor: '#ba1a1a' }}>
                <Text className="text-[13px] font-bold text-white">Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
