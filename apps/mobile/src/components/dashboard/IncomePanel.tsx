import { useMemo } from 'react';
import { View, Text } from 'react-native';
import { formatCurrencyCompact, isEarn } from '@ledgeit/core';
import { useStore } from '@/lib/store';

export default function IncomePanel() {
  const transactions = useStore((s) => s.transactions);
  const budgetLimits = useStore((s) => s.budgetLimits);

  const { totalIncome, monthlyBudget } = useMemo(() => {
    const totalIncome = transactions.filter((t) => isEarn(t)).reduce((s, t) => s + t.amount, 0);

    const monthlyBudget = budgetLimits
      .filter((b) => b.cycle === 'monthly')
      .reduce((s, b) => s + b.limit, 0);

    return { totalIncome, monthlyBudget };
  }, [transactions, budgetLimits]);

  return (
    <View className="overflow-hidden rounded-2xl" style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.06, shadowRadius: 20, elevation: 1 }}>
      {/* Section label row */}
      <View className="flex-row items-center justify-between px-5 pb-4 pt-4">
        <Text className="text-[12px] font-bold uppercase tracking-[1.4px]" style={{ color: '#00352e' }}>
          Income
        </Text>
        <Text className="text-[11px] font-medium" style={{ color: '#6e9990' }}>
          All Time
        </Text>
      </View>

      {/* Two-stat row */}
      <View className="flex-row gap-4 px-5 pb-5">
        {/* Total Income */}
        <View className="flex-1 gap-1.5">
          <Text className="text-[10px] font-bold uppercase tracking-[1.4px]" style={{ color: '#6e9990' }}>
            Total Income
          </Text>
          <Text className="font-mono text-xl font-bold leading-none" style={{ color: '#1f6950' }}>
            +{formatCurrencyCompact(totalIncome)}
          </Text>
        </View>

        {/* Monthly Budget */}
        <View className="flex-1 gap-1.5 pl-4" style={{ borderLeftWidth: 1, borderLeftColor: '#e7edeb' }}>
          <Text className="text-[10px] font-bold uppercase tracking-[1.4px]" style={{ color: '#6e9990' }}>
            Monthly Budget
          </Text>
          <Text className="font-mono text-xl font-bold leading-none" style={{ color: '#191c1c' }}>
            {formatCurrencyCompact(monthlyBudget)}
          </Text>
        </View>
      </View>
    </View>
  );
}
