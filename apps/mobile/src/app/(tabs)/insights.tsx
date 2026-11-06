import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { CaretLeft, CaretRight, CaretRight as CaretRightSmall, Sliders } from 'phosphor-react-native';
import { CATEGORIES, applyCarryoversToLimits, formatCurrency, formatMonthLabel, isSpend, spendAmount, type BudgetCarryover } from '@ledgeit/core';
import MetricStrip from '@/components/insights/MetricStrip';
import BudgetBar from '@/components/insights/BudgetBar';
import SpendDonut from '@/components/insights/SpendDonut';
import CategoryBreakdownList from '@/components/insights/CategoryBreakdownList';
import { CarryoverAction, CarryoverBadges } from '@/components/insights/CategoryCarryover';
import WalletInsightsCard from '@/components/insights/WalletInsightsCard';
import MonthTrendChart from '@/components/dashboard/MonthTrendChart';
import WeeklyTrendChart from '@/components/dashboard/WeeklyTrendChart';
import BiggestExpenseCard from '@/components/dashboard/BiggestExpenseCard';
import BudgetAllocationSheet from '@/components/budget/BudgetAllocationSheet';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { useDeferredMount } from '@/lib/useDeferredMount';
import { useStore } from '@/lib/store';

function getMonthBounds(offset: number): { start: string; end: string; label: string } {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const year = d.getFullYear();
  const month = d.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const pad = (n: number) => String(n + 1).padStart(2, '0');
  const start = `${year}-${pad(month)}-01`;
  const end = `${year}-${pad(month)}-${String(daysInMonth).padStart(2, '0')}`;
  return { start, end, label: formatMonthLabel(start) };
}

export default function InsightsScreen() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [planSheetOpen, setPlanSheetOpen] = useState(false);
  // Defer the charts/metrics so the header + month switcher paint instantly.
  const contentReady = useDeferredMount();
  const transactions = useStore((s) => s.transactions);
  const budgetLimitsByMonth = useStore((s) => s.budgetLimitsByMonth);
  const liveBudgetLimits = useStore((s) => s.budgetLimits);
  const loadBudgetLimitsForMonth = useStore((s) => s.loadBudgetLimitsForMonth);
  const budgetCarryovers = useStore((s) => s.budgetCarryovers);
  const wallets = useStore((s) => s.wallets);
  const budgetAllocations = useStore((s) => s.budgetAllocations);
  const customCategories = useStore((s) => s.customCategories);
  const hiddenCategories = useStore((s) => s.hiddenCategories);

  const activePlan = budgetAllocations.find((a) => a.isActive);

  const toggleCategory = (id: string) => setExpandedCategory((prev) => (prev === id ? null : id));

  const { start, end, label } = useMemo(() => getMonthBounds(monthOffset), [monthOffset]);

  // 'YYYY-MM' of the viewed month, shared by transactions and budget snapshots.
  const monthKey = start.slice(0, 7);

  // Historical months show the budget that applied then (a per-month snapshot),
  // not today's active plan. The current/future month is served live.
  useEffect(() => {
    loadBudgetLimitsForMonth(monthKey);
  }, [monthKey, loadBudgetLimitsForMonth]);

  // Current (and future) month reflects the live active plan; past months use
  // their frozen snapshot. Either way, carryovers that landed in the viewed
  // month are layered on top so the budget matches what the user had to spend.
  const budgetLimits = useMemo(() => {
    const base = monthOffset < 0 ? (budgetLimitsByMonth[monthKey] ?? []) : liveBudgetLimits;
    return applyCarryoversToLimits(base, budgetCarryovers, monthKey);
  }, [monthOffset, monthKey, budgetLimitsByMonth, liveBudgetLimits, budgetCarryovers]);

  // Carryovers leaving the viewed month (to a wallet or next month's budget) and
  // those landing in its budget, keyed by category for the Budget Flow rows.
  const { outgoingByCat, incomingByCat } = useMemo(() => {
    const outgoing: Record<string, BudgetCarryover> = {};
    const incoming: Record<string, BudgetCarryover[]> = {};
    for (const c of budgetCarryovers) {
      if (c.fromMonth === monthKey) outgoing[c.categoryId] = c;
      if (c.toMonth === monthKey && c.destination === 'category') (incoming[c.categoryId] ??= []).push(c);
    }
    return { outgoingByCat: outgoing, incomingByCat: incoming };
  }, [budgetCarryovers, monthKey]);

  const monthTxns = useMemo(() => transactions.filter((t) => t.date >= start && t.date <= end), [transactions, start, end]);

  const totalIncome = monthTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  // spendAmount nets out reimbursements from the month's expense total.
  const totalExpense = monthTxns.filter((t) => isSpend(t)).reduce((s, t) => s + spendAmount(t), 0);
  const netCashflow = totalIncome - totalExpense;

  // Average daily spend — use days elapsed (capped at today for current month)
  const now = new Date();
  const isCurrentMonth = monthOffset === 0;
  const daysElapsed = isCurrentMonth
    ? Math.max(now.getDate(), 1)
    : new Date(parseInt(end.split('-')[0]), parseInt(end.split('-')[1]) - 1 + 1, 0).getDate();
  const avgDaySpend = totalExpense / daysElapsed;

  const daysInMonth = new Date(parseInt(end.split('-')[0]), parseInt(end.split('-')[1]), 0).getDate();
  const projectedEOM = avgDaySpend * daysInMonth;

  const categorySpend = useMemo(() => {
    // spendAmount signs reimbursements negative, so a category's net spend can
    // drop (or go negative) when refunds exceed spending.
    return monthTxns
      .filter(isSpend)
      .reduce<Record<string, number>>((acc, t) => {
        acc[t.category.id] = (acc[t.category.id] ?? 0) + spendAmount(t);
        return acc;
      }, {});
  }, [monthTxns]);

  // Per-category spend transactions (newest first) for the accordion breakdown.
  const txnsByCategory = useMemo(() => {
    const map: Record<string, typeof monthTxns> = {};
    for (const t of monthTxns) {
      if (!isSpend(t)) continue;
      (map[t.category.id] ??= []).push(t);
    }
    for (const id in map) {
      map[id].sort((a, b) => b.date.localeCompare(a.date));
    }
    return map;
  }, [monthTxns]);

  const metrics = [
    {
      label: 'Net Cashflow',
      value: `${netCashflow < 0 ? '−' : ''}${formatCurrency(Math.abs(netCashflow))}`,
      color: netCashflow >= 0 ? '#1f6950' : '#ba1a1a',
      sub: netCashflow >= 0 ? 'positive' : 'negative',
    },
    { label: 'Avg / Day', value: formatCurrency(avgDaySpend), sub: 'spending' },
    { label: 'Proj. EOM', value: formatCurrency(projectedEOM), sub: 'at this rate' },
  ];

  const budgetCategories = useMemo(
    () => [
      ...CATEGORIES.filter((c) => c.id !== 'income' && c.id !== 'other' && !hiddenCategories.includes(c.id)),
      ...customCategories.map((c) => ({ id: c.id, label: c.name, icon: c.icon, color: c.textColor, bgColor: c.bgColor, keywords: [] as string[] })),
    ],
    [customCategories, hiddenCategories],
  );

  return (
    <View className="flex-1" style={{ backgroundColor: '#f8faf9' }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between pb-2 pt-16">
          <Text className="text-xl font-bold tracking-tight" style={{ color: '#00352e' }}>
            Your Financial Breath
          </Text>
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => setMonthOffset((o) => o - 1)}
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: '#f0f4f2' }}
            >
              <CaretLeft size={13} weight="bold" color="#3f4946" />
            </Pressable>
            <Text className="min-w-[96px] text-center text-[11px] font-semibold" style={{ color: '#3f4946' }}>
              {label}
            </Text>
            <Pressable
              onPress={() => setMonthOffset((o) => Math.min(o + 1, 0))}
              disabled={monthOffset >= 0}
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: '#f0f4f2', opacity: monthOffset >= 0 ? 0.3 : 1 }}
            >
              <CaretRight size={13} weight="bold" color="#3f4946" />
            </Pressable>
          </View>
        </View>

        {/* Active budget plan row — opens the allocation editor */}
        <Pressable
          onPress={() => setPlanSheetOpen(true)}
          className="mb-3 flex-row items-center gap-2 rounded-2xl px-3.5 py-2.5 active:opacity-80"
          style={{ backgroundColor: '#f0f4f2' }}
        >
          <Sliders size={14} weight="bold" color="#1f695d" />
          <Text className="flex-1 text-xs font-semibold" style={{ color: '#191c1c' }} numberOfLines={1}>
            {activePlan ? activePlan.name : 'Set up a budget plan'}
          </Text>
          <CaretRightSmall size={13} weight="bold" color="#6e9990" />
        </Pressable>

        {!contentReady ? (
          <View className="mt-1 gap-4">
            <Skeleton height={72} radius={16} />
            <SkeletonCard height={160} />
            <SkeletonCard height={140} />
          </View>
        ) : (
          <>
        {/* Metric strip */}
        <View className="mt-1">
          <MetricStrip metrics={metrics} />
        </View>

        {/* Spend vs Saved donut */}
        <View className="mt-4">
          <SpendDonut spent={totalExpense} saved={Math.max(totalIncome - totalExpense, 0)} />
        </View>

        {/* Daily spending trend for the selected month */}
        <View className="mt-4">
          <MonthTrendChart start={start} end={end} />
        </View>

        {/* How your wallets grew this month (self-hides when none) */}
        <View className="mt-4">
          <WalletInsightsCard start={start} end={end} />
        </View>

        <View className="mt-4">
          <BiggestExpenseCard start={start} end={end} />
        </View>

        {/* Budget Flow */}
        <View className="mt-6 pb-2">
          <Text className="text-[12px] font-bold uppercase tracking-[1.4px]" style={{ color: '#00352e' }}>
            Budget Flow
          </Text>
        </View>

        {budgetCategories.map((cat) => {
          const limit = budgetLimits.find((b) => b.categoryId === cat.id)?.limit ?? 0;
          const spent = categorySpend[cat.id] ?? 0;
          if (limit === 0 && spent === 0) return null;
          const outgoing = outgoingByCat[cat.id];
          const incoming = incomingByCat[cat.id] ?? [];
          const leftover = limit > 0 ? Math.round((limit - spent) * 100) / 100 : 0;
          return (
            <BudgetBar
              key={cat.id}
              category={cat}
              spent={spent}
              limit={limit}
              hasLimit={limit > 0}
              expanded={expandedCategory === cat.id}
              onToggle={toggleCategory}
              badges={<CarryoverBadges outgoing={outgoing} incoming={incoming} wallets={wallets} />}
            >
              {monthOffset < 0 && (outgoing || leftover > 0) && (
                <CarryoverAction
                  key={`${monthKey}-${cat.id}`}
                  categoryId={cat.id}
                  categoryLabel={cat.label}
                  fromMonth={monthKey}
                  leftover={leftover}
                  allowBudget={monthOffset === -1}
                  applied={outgoing}
                />
              )}
              <CategoryBreakdownList transactions={txnsByCategory[cat.id] ?? []} />
            </BudgetBar>
          );
        })}

        {Object.keys(categorySpend).length === 0 && (
          <View className="items-center gap-2 py-10">
            <Text className="text-center text-sm font-semibold" style={{ color: '#3f4946' }}>
              No spending data for this period.
            </Text>
            <Text className="text-center text-xs" style={{ color: '#6e9990' }}>
              Add transactions to see your patterns.
            </Text>
          </View>
        )}

        {/* Spending patterns */}
        <View className="mt-4">
          <WeeklyTrendChart />
        </View>
          </>
        )}
      </ScrollView>

      <BudgetAllocationSheet open={planSheetOpen} onClose={() => setPlanSheetOpen(false)} />
    </View>
  );
}
