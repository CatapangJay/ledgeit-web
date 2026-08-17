import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { CaretDown, MagnifyingGlass, SlidersHorizontal, X } from 'phosphor-react-native';
import { PAYMENT_METHODS, formatCurrency, type PaymentMethodId, type Transaction } from '@ledgeit/core';
import FilterChips, { type FilterValue } from '@/components/ledger/FilterChips';
import DateFilterBar, { type DatePeriod } from '@/components/ledger/DateFilterBar';
import DateGroup from '@/components/ledger/DateGroup';
import TransactionRow from '@/components/ledger/TransactionRow';
import TransactionEditSheet from '@/components/ledger/TransactionEditSheet';
import CategoryBreakdownBar from '@/components/ledger/CategoryBreakdownBar';
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
    <View className="items-start gap-2 py-14">
      <Text className="text-sm font-medium" style={{ color: '#6e9990' }}>
        {hasActiveFilters ? 'No transactions match these filters.' : 'No transactions yet.'}
      </Text>
      <Text className="text-xs" style={{ color: '#cde0db' }}>
        {hasActiveFilters ? 'Try widening the date range or clearing filters.' : 'Log your first entry to see it here.'}
      </Text>
    </View>
  );
}

export default function LedgerScreen() {
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const transactions = useStore((s) => s.transactions);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const customCategories = useStore((s) => s.customCategories);

  const [filter, setFilter] = useState<FilterValue>('all');
  const [period, setPeriod] = useState<DatePeriod>('all');
  const [customDate, setCustomDate] = useState<string | null>(null);

  // Deep-link from the dashboard heatmap: `/ledger?date=YYYY-MM-DD` scopes the
  // list to that single day.
  useEffect(() => {
    if (dateParam) {
      setCustomDate(dateParam);
      setPeriod('custom');
    }
  }, [dateParam]);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<PaymentMethodId | 'all'>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const customChips = customCategories.map((c) => ({ value: c.id, label: c.name }));

  const range = useMemo(() => periodRange(period, customDate), [period, customDate]);
  const query = search.trim().toLowerCase();
  const hasActiveFilters = filter !== 'all' || period !== 'all' || query !== '' || methodFilter !== 'all';
  const activePanelFilters = (filter !== 'all' ? 1 : 0) + (period !== 'all' ? 1 : 0) + (methodFilter !== 'all' ? 1 : 0);

  function clearAll() {
    setFilter('all');
    setPeriod('all');
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

  const totalAmount = useMemo(() => filtered.reduce((s, t) => s + (t.type === 'expense' ? t.amount : 0), 0), [filtered]);
  const groups = groupByDate(filtered);

  return (
    <View className="flex-1" style={{ backgroundColor: '#f8faf9' }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-baseline justify-between gap-3 pb-4 pt-16">
          <View className="flex-row items-baseline gap-3">
            <Text className="text-base font-bold tracking-tight" style={{ color: '#00352e' }}>
              Activity
            </Text>
            <Text className="text-xs font-semibold" style={{ color: '#6e9990' }}>
              {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
            </Text>
          </View>
          {totalAmount > 0 && (
            <Text className="font-mono text-xs font-semibold" style={{ color: '#ba1a1a' }}>
              −{formatCurrency(totalAmount)}
            </Text>
          )}
        </View>

        {/* Search */}
        <View className="mb-3 flex-row items-center gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.05, shadowRadius: 12, elevation: 1 }}>
          <MagnifyingGlass size={15} weight="bold" color="#6e9990" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search merchant, category, or note…"
            placeholderTextColor="#8eaeaa"
            className="min-w-0 flex-1 text-sm"
            style={{ color: '#191c1c', paddingVertical: 0 }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} className="h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: '#f0f4f2' }}>
              <X size={10} weight="bold" color="#6e9990" />
            </Pressable>
          )}
        </View>

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
              <FilterChips active={filter} onChange={setFilter} customChips={customChips} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginBottom: 12 }}>
              {([{ id: 'all' as const, short: 'Any method' }, ...PAYMENT_METHODS]).map((m) => {
                const active = methodFilter === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setMethodFilter(m.id as PaymentMethodId | 'all')}
                    className="shrink-0 rounded-full px-3.5 py-1.5"
                    style={{ backgroundColor: active ? '#475569' : '#f0f4f2' }}
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
                    <TransactionRow tx={tx} onDelete={deleteTransaction} onEdit={setEditingTx} />
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TransactionEditSheet
        tx={editingTx}
        customCategories={customCategories}
        onClose={() => setEditingTx(null)}
        onSave={updateTransaction}
        onDelete={deleteTransaction}
      />
    </View>
  );
}
