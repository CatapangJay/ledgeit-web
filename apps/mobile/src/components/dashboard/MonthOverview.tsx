import { useEffect, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { CaretRight, SlidersHorizontal } from 'phosphor-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { CATEGORIES, formatCurrency, formatCurrencyCompact } from '@ledgeit/core';
import { useStore } from '@/lib/store';

interface Props {
  /** Opens the budget plan manager (wired once BudgetAllocationSheet is ported). */
  onManageBudget?: () => void;
}

// Category color vocabulary — mirrors SpendStrip so a category reads the same
// hue wherever it appears (DESIGN.md: category colors are a fixed vocabulary).
const CATEGORY_HEX: Record<string, string> = {
  restaurants: '#e05c2a',
  groceries: '#28a46a',
  transport: '#0284c7',
  shopping: '#7c3aed',
  utilities: '#d97706',
  entertainment: '#db2777',
  health: '#e91e63',
  savings: '#0f766e',
  investments: '#4338ca',
  education: '#1d4ed8',
  personal_care: '#a21caf',
  income: '#1f6950',
  other: '#6e9990',
};

// Budget-usage bar color escalates only as a real signal, never decoration.
function usageColor(ratio: number): string {
  if (ratio > 0.9) return '#ba1a1a';
  if (ratio > 0.75) return '#d97706';
  return '#1f695d';
}

function AnimatedBarFill({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(pct, { duration: 700 });
  }, [pct, width]);
  const style = useAnimatedStyle(() => ({ width: `${width.value}%` as const }));
  return <Animated.View className="absolute left-0 top-0 h-full rounded-full" style={[style, { backgroundColor: color }]} />;
}

const TOP_N = 3;

export default function MonthOverview({ onManageBudget }: Props) {
  const transactions = useStore((s) => s.transactions);
  const budgetLimits = useStore((s) => s.budgetLimits);
  const budgetAllocations = useStore((s) => s.budgetAllocations);
  const activePlan = budgetAllocations.find((a) => a.isActive) ?? null;

  const now = new Date();
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long' });

  const { expense, saved, budgetTotal, budgetLeft, usageRatio, topCategories, isEmpty } = useMemo(() => {
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthTxns = transactions.filter((t) => t.date.startsWith(ym));

    let income = 0;
    let expense = 0;
    const byCategory: Record<string, number> = {};
    for (const t of monthTxns) {
      if (t.type === 'income') {
        income += t.amount;
      } else {
        expense += t.amount;
        byCategory[t.category.id] = (byCategory[t.category.id] ?? 0) + t.amount;
      }
    }

    const budgetTotal = budgetLimits.reduce((s, b) => s + b.limit, 0);
    const saved = Math.max(income - expense, 0);
    const budgetLeft = Math.max(budgetTotal - expense, 0);
    const usageRatio = budgetTotal > 0 ? expense / budgetTotal : 0;

    const topCategories = Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, TOP_N)
      .map(([id, amount]) => {
        const cat = CATEGORIES.find((c) => c.id === id);
        return { id, label: cat?.label ?? id, amount, hex: CATEGORY_HEX[id] ?? '#6e9990' };
      });

    return { expense, saved, budgetTotal, budgetLeft, usageRatio, topCategories, isEmpty: expense === 0 && income === 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, budgetLimits]);

  const usagePct = Math.round(Math.min(usageRatio, 1) * 100);
  const barColor = usageColor(usageRatio);
  const topMax = topCategories.length > 0 ? topCategories[0].amount : 1;

  return (
    <View className="rounded-2xl px-5 py-4" style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.06, shadowRadius: 16, elevation: 1 }}>
      <View className="mb-3 flex-row items-center justify-between gap-2">
        <Text className="text-[12px] font-bold uppercase tracking-[1.4px]" style={{ color: '#00352e' }}>
          This Month
        </Text>
        {onManageBudget && activePlan ? (
          <Pressable
            onPress={onManageBudget}
            className="flex-row items-center gap-1 rounded-full py-1 pl-2.5 pr-1.5"
            style={{ backgroundColor: '#f0f4f2' }}
          >
            <Text className="text-[11px] font-semibold" style={{ color: '#1f695d' }} numberOfLines={1}>
              {activePlan.name}
            </Text>
            <CaretRight size={11} weight="bold" color="#6e9990" />
          </Pressable>
        ) : (
          <Text className="text-[11px] font-medium" style={{ color: '#3f4946' }}>
            {monthLabel}
          </Text>
        )}
      </View>

      {isEmpty ? (
        <View className="gap-1">
          <View className="h-2 w-full rounded-full" style={{ backgroundColor: '#f0f4f2' }} />
          <Text className="mt-2 text-[12px]" style={{ color: '#3f4946' }}>
            Nothing logged this month yet. Your overview builds as you add entries.
          </Text>
          {onManageBudget && (
            <Pressable
              onPress={onManageBudget}
              className="mt-2 flex-row items-center self-start gap-1.5 rounded-full py-1.5 pl-3 pr-3.5"
              style={{ backgroundColor: '#f0f4f2' }}
            >
              <SlidersHorizontal size={12} weight="bold" color="#1f695d" />
              <Text className="text-[12px] font-semibold" style={{ color: '#1f695d' }}>
                {activePlan ? 'Adjust budget plan' : 'Set up a budget'}
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        <>
          <View className="mb-1 flex-row items-baseline justify-between gap-2">
            <Text className="font-mono text-[13px] font-bold" style={{ color: barColor }}>
              {formatCurrency(expense)}
            </Text>
            <Text className="font-mono text-[11px] font-medium" style={{ color: '#3f4946' }}>
              of {formatCurrency(budgetTotal)} budget
            </Text>
          </View>
          <View className="relative h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: '#f0f4f2' }}>
            <AnimatedBarFill pct={usagePct} color={barColor} />
          </View>
          <View className="mt-1.5 flex-row items-center justify-between">
            {onManageBudget ? (
              <Pressable onPress={onManageBudget} className="flex-row items-center gap-1">
                <SlidersHorizontal size={11} weight="bold" color="#6e9990" />
                <Text className="text-[11px] font-semibold" style={{ color: '#6e9990' }}>
                  Adjust
                </Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Text className="text-[11px] font-semibold" style={{ color: barColor }}>
              {usagePct}% used
            </Text>
          </View>

          <View className="mt-3 flex-row gap-2" style={{ borderTopWidth: 1, borderTopColor: '#f0f4f2', paddingTop: 12 }}>
            {[
              { label: 'Spent', value: expense, color: '#191c1c' },
              { label: 'Saved', value: saved, color: '#1f6950' },
              { label: 'Left', value: budgetLeft, color: barColor },
            ].map((stat) => (
              <View key={stat.label} className="flex-1 gap-0.5">
                <Text className="text-[10px] font-semibold uppercase tracking-[1px]" style={{ color: '#6e9990' }}>
                  {stat.label}
                </Text>
                <Text className="font-mono text-[14px] font-bold leading-none" style={{ color: stat.color }}>
                  {formatCurrencyCompact(stat.value)}
                </Text>
              </View>
            ))}
          </View>

          {topCategories.length > 0 && (
            <View className="mt-4 gap-2.5">
              <Text className="text-[10px] font-semibold uppercase tracking-[1px]" style={{ color: '#6e9990' }}>
                Top Categories
              </Text>
              {topCategories.map((cat) => {
                const pct = topMax > 0 ? Math.max((cat.amount / topMax) * 100, 4) : 0;
                return (
                  <View key={cat.id} className="flex-row items-center gap-2.5">
                    <Text className="w-24 shrink-0 text-[12px] font-medium" style={{ color: '#3f4946' }} numberOfLines={1}>
                      {cat.label}
                    </Text>
                    <View className="relative h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: '#f0f4f2' }}>
                      <AnimatedBarFill pct={pct} color={cat.hex} />
                    </View>
                    <Text className="shrink-0 font-mono text-[12px] font-semibold" style={{ color: '#191c1c' }}>
                      {formatCurrencyCompact(cat.amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </View>
  );
}
