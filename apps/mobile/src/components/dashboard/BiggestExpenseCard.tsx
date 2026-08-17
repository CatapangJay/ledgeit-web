import { useMemo } from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Trophy } from 'phosphor-react-native';
import { formatCurrency, formatDate } from '@ledgeit/core';
import { getIconComponent } from '@/lib/iconMap';
import { useStore } from '@/lib/store';

const CATEGORY_HEX: Record<string, string> = {
  restaurants: '#c2410c',
  groceries: '#4d7c0f',
  transport: '#0369a1',
  shopping: '#7c3aed',
  utilities: '#b45309',
  entertainment: '#be185d',
  health: '#be123c',
  savings: '#0f766e',
  investments: '#4338ca',
  education: '#1d4ed8',
  personal_care: '#a21caf',
  other: '#64748b',
};

export default function BiggestExpenseCard() {
  const transactions = useStore((s) => s.transactions);

  const biggest = useMemo(() => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const thisMonth = transactions.filter((t) => t.type === 'expense' && t.date.startsWith(month));
    const pool = thisMonth.length > 0 ? thisMonth : transactions.filter((t) => t.type === 'expense');

    return pool.reduce<(typeof transactions)[number] | null>((max, tx) => {
      if (!max || tx.amount > max.amount) return tx;
      return max;
    }, null);
  }, [transactions]);

  const hex = biggest ? (CATEGORY_HEX[biggest.category.id] ?? '#64748b') : '#64748b';
  const Icon = biggest ? getIconComponent(biggest.category.icon) : Trophy;

  return (
    <View className="flex-1 rounded-2xl px-5 py-4" style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.07, shadowRadius: 24, elevation: 1 }}>
      {/* Header */}
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-[12px] font-bold uppercase tracking-[1.7px]" style={{ color: '#00352e' }}>
          Biggest Expense
        </Text>
        <Trophy size={15} weight="fill" color="#d97706" />
      </View>

      {!biggest ? (
        <Text className="text-[12px]" style={{ color: '#a9c2bd' }}>
          No expenses yet — your largest purchase will be spotlighted here.
        </Text>
      ) : (
        <Animated.View entering={FadeInUp.duration(320)} className="flex-1 justify-between">
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${hex}18` }}>
              <Icon size={19} weight="fill" color={hex} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="truncate text-[13px] font-semibold" style={{ color: '#191c1c' }} numberOfLines={1}>
                {biggest.merchant}
              </Text>
              <Text className="mt-0.5 text-[11px]" style={{ color: '#8eaeaa' }}>
                {biggest.category.label} · {formatDate(biggest.date)}
              </Text>
            </View>
          </View>

          <Text className="mt-4 font-mono text-2xl font-bold leading-none" style={{ color: '#191c1c' }}>
            {formatCurrency(biggest.amount)}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}
