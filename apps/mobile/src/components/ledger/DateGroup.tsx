import { View, Text } from 'react-native';
import { formatCurrency, formatDate, netAmount, type Transaction } from '@ledgeit/core';

interface Props {
  date: string;
  transactions: Transaction[];
}

export default function DateGroup({ date, transactions }: Props) {
  // netAmount signs each entry (income +, expense −, reimbursement +) and nets
  // transfers/debts (money between the user's own pockets) to zero.
  const subtotal = transactions.reduce((sum, t) => sum + netAmount(t), 0);
  const isNet = subtotal >= 0;

  return (
    <View className="flex-row items-center justify-between pb-1.5 pt-5">
      <Text className="text-[11px] font-bold uppercase tracking-[1.4px]" style={{ color: '#6e9990' }}>
        {formatDate(date)}
      </Text>
      <Text className="font-mono text-xs font-bold" style={{ color: isNet ? '#1f6950' : '#ba1a1a' }}>
        {subtotal >= 0 ? '+' : '−'}
        {formatCurrency(Math.abs(subtotal))}
      </Text>
    </View>
  );
}
