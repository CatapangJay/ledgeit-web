import { useEffect, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight } from 'phosphor-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { CATEGORIES, formatCurrencyCompact } from '@ledgeit/core';
import { getIconComponent, getIconBg } from '@/lib/iconMap';
import { useStore } from '@/lib/store';

const TOP_N = 4;

function AnimatedBarFill({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(pct, { duration: 600 });
  }, [pct, width]);
  const style = useAnimatedStyle(() => ({ width: `${width.value}%` as const }));
  return <Animated.View className="h-full rounded-full" style={[style, { backgroundColor: color }]} />;
}

export default function TopCategoryBars() {
  const router = useRouter();
  const transactions = useStore((s) => s.transactions);
  const budgetLimits = useStore((s) => s.budgetLimits);

  const categories = useMemo(() => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const byCategory: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.type !== 'expense' || !tx.date.startsWith(month)) continue;
      byCategory[tx.category.id] = (byCategory[tx.category.id] ?? 0) + tx.amount;
    }

    const maxSpent = Math.max(...Object.values(byCategory), 1);

    return Object.entries(byCategory)
      .map(([id, spent]) => {
        const limit = budgetLimits.find((b) => b.categoryId === id)?.limit ?? 0;
        const cat = CATEGORIES.find((c) => c.id === id);
        const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : (spent / maxSpent) * 100;
        return {
          id,
          spent,
          limit,
          pct,
          label: cat?.label ?? id,
          icon: cat?.icon ?? 'DotsThree',
          color: cat?.color ?? 'text-slate-500',
        };
      })
      .sort((a, b) => b.spent - a.spent)
      .slice(0, TOP_N);
  }, [transactions, budgetLimits]);

  return (
    <View className="rounded-2xl px-5 py-4" style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.07, shadowRadius: 24, elevation: 2 }}>
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-[12px] font-bold uppercase tracking-[1.4px]" style={{ color: '#00352e' }}>
          Top Spending
        </Text>
        <Pressable onPress={() => router.push('/insights')} className="flex-row items-center gap-1">
          <Text className="text-[11px] font-semibold" style={{ color: '#1f695d' }}>
            All categories
          </Text>
          <ArrowRight size={11} weight="bold" color="#1f695d" />
        </Pressable>
      </View>

      {categories.length === 0 ? (
        <Text className="text-[12px]" style={{ color: '#a9c2bd' }}>
          Nothing logged this month. Your top categories will appear here once you add expenses.
        </Text>
      ) : (
        <View className="gap-4">
          {categories.map((cat) => {
            const Icon = getIconComponent(cat.icon);
            const hex = getIconBg({ id: cat.id, color: cat.color });
            const barColor = cat.limit > 0 && cat.pct > 90 ? '#ba1a1a' : cat.limit > 0 && cat.pct > 70 ? '#d97706' : hex;

            return (
              <View key={cat.id}>
                <View className="mb-1.5 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="h-6 w-6 items-center justify-center rounded-lg" style={{ backgroundColor: `${hex}18` }}>
                      <Icon size={13} weight="fill" color={hex} />
                    </View>
                    <Text className="text-[13px] font-semibold" style={{ color: '#191c1c' }}>
                      {cat.label}
                    </Text>
                  </View>
                  <View className="flex-row items-baseline gap-1">
                    <Text className="font-mono text-[13px] font-bold" style={{ color: '#191c1c' }}>
                      {formatCurrencyCompact(cat.spent)}
                    </Text>
                    {cat.limit > 0 && (
                      <Text className="font-mono text-[11px]" style={{ color: '#6e9990' }}>
                        / {formatCurrencyCompact(cat.limit)}
                      </Text>
                    )}
                  </View>
                </View>
                <View className="h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: '#f0f4f2' }}>
                  <AnimatedBarFill pct={cat.pct} color={barColor} />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
