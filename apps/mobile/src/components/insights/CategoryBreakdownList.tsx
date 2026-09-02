import { useMemo } from 'react';
import { View, Text } from 'react-native';
import { formatCurrency, formatDate, type Transaction } from '@ledgeit/core';

interface Props {
  /** The selected month's transactions already filtered to this category. */
  transactions: Transaction[];
}

/**
 * List of a category's transactions for the selected month, shown inside an
 * expanded BudgetBar accordion. Newest first; shows every transaction.
 */
export default function CategoryBreakdownList({ transactions }: Props) {
  const sorted = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)),
    [transactions],
  );

  if (transactions.length === 0) {
    return (
      <Text className="py-1 text-[12px]" style={{ color: '#3f4946' }}>
        No transactions in this category this month.
      </Text>
    );
  }

  return (
    <View className="gap-2">
      {sorted.map((tx) => (
        <View key={tx.id} className="flex-row items-center justify-between gap-2">
          <View className="min-w-0 flex-1">
            <Text className="text-[12px] font-semibold" style={{ color: '#191c1c' }} numberOfLines={1}>
              {tx.merchant}
            </Text>
            <Text className="text-[10px]" style={{ color: '#6e9990' }}>
              {formatDate(tx.date)}
            </Text>
          </View>
          <Text
            className="shrink-0 font-mono text-[12px] font-semibold"
            style={{ color: tx.type === 'income' ? '#1f6950' : '#3f4946' }}
          >
            {tx.type === 'income' ? '+' : ''}
            {formatCurrency(tx.amount)}
          </Text>
        </View>
      ))}
    </View>
  );
}
