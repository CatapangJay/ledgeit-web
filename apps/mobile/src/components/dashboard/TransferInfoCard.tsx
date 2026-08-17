import { useMemo } from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ArrowsLeftRight } from 'phosphor-react-native';
import { formatCurrencyCompact } from '@ledgeit/core';
import { useStore } from '@/lib/store';

/**
 * Explains the "transfer" type (credit-card payments, moving to savings) and
 * shows this month's transfer total. Designed to sit beside a half-width card
 * (e.g. Biggest Expense) so keep it compact.
 */
export default function TransferInfoCard() {
  const transactions = useStore((s) => s.transactions);

  const monthTransfers = useMemo(() => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return transactions.filter((t) => t.type === 'transfer' && t.date.startsWith(month)).reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  return (
    <View className="flex-1 rounded-2xl px-5 py-4" style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.07, shadowRadius: 24, elevation: 1 }}>
      {/* Header */}
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-[12px] font-bold uppercase tracking-[1.7px]" style={{ color: '#00352e' }}>
          Transfers
        </Text>
        <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: '#eef2f4' }}>
          <ArrowsLeftRight size={12} weight="bold" color="#475569" />
        </View>
      </View>

      <Animated.View entering={FadeInUp.duration(320)} className="flex-1 justify-between gap-3">
        <Text className="text-[12px] leading-relaxed" style={{ color: '#6e9990' }}>
          Paying a credit card or moving money to savings isn&apos;t spending — it&apos;s a{' '}
          <Text className="font-semibold" style={{ color: '#3f4946' }}>
            transfer
          </Text>
          . Log it as <Text style={{ color: '#475569' }}>&ldquo;cc payment 5000&rdquo;</Text> and it stays out of your
          totals and budgets.
        </Text>

        <View className="flex-row items-center justify-between rounded-xl px-3 py-2" style={{ backgroundColor: '#f4f6f7' }}>
          <Text className="text-[11px] font-semibold" style={{ color: '#6e9990' }}>
            This month
          </Text>
          <Text className="font-mono text-[13px] font-bold" style={{ color: '#475569' }}>
            {monthTransfers > 0 ? formatCurrencyCompact(monthTransfers) : '—'}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}
