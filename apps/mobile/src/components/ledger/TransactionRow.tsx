import { View, Text, Pressable } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Trash } from 'phosphor-react-native';
import { formatCurrency, formatDate, resolvePaymentMethod, type Transaction } from '@ledgeit/core';
import { getIconComponent, getIconBg } from '@/lib/iconMap';

interface Props {
  tx: Transaction;
  onDelete: (id: string) => void;
  onEdit: (tx: Transaction) => void;
}

function RightAction({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="w-20 items-center justify-center"
      style={{ backgroundColor: 'rgba(186,26,26,0.08)' }}
    >
      <Trash size={16} weight="fill" color="#ba1a1a" />
    </Pressable>
  );
}

export default function TransactionRow({ tx, onDelete, onEdit }: Props) {
  const Icon = getIconComponent(tx.category.icon);
  const hex = getIconBg({ id: tx.category.id, color: tx.category.color });
  const isIncome = tx.type === 'income';
  const isTransfer = tx.type === 'transfer';
  // Transfers move money between the user's own pockets — shown neutrally with no
  // +/− since they're neither spending nor income.
  const amountColor = isTransfer ? '#6e9990' : isIncome ? '#1f6950' : '#ba1a1a';
  const amountSign = isTransfer ? '' : isIncome ? '+' : '−';
  const method = resolvePaymentMethod(tx.paymentMethod);

  return (
    <Swipeable renderRightActions={() => <RightAction onPress={() => onDelete(tx.id)} />} overshootRight={false}>
      <Pressable
        onPress={() => onEdit(tx)}
        className="flex-row items-center gap-3 px-4 py-3.5 active:opacity-80"
        style={{ backgroundColor: '#ffffff' }}
      >
        {/* Icon */}
        <View className="h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: hex }}>
          <Icon size={16} weight="fill" color="#ffffff" />
        </View>

        {/* Details */}
        <View className="min-w-0 flex-1">
          <View className="flex-row items-baseline justify-between gap-3">
            <Text className="shrink truncate text-sm font-semibold" style={{ color: '#191c1c' }} numberOfLines={1}>
              {tx.merchant}
            </Text>
            <Text className="shrink-0 font-mono text-sm font-medium" style={{ color: amountColor }}>
              {amountSign}
              {formatCurrency(tx.amount)}
            </Text>
          </View>
          <View className="mt-0.5 flex-row items-center gap-1.5">
            <Text className="text-xs" style={{ color: hex, opacity: 0.9 }}>
              {tx.category.label}
            </Text>
            <Text className="text-xs" style={{ color: '#cde0db' }}>
              ·
            </Text>
            <Text className="font-mono text-xs" style={{ color: '#6e9990' }}>
              {formatDate(tx.date)}
            </Text>
            {tx.paymentMethod !== 'cash' && (
              <>
                <Text className="text-xs" style={{ color: '#cde0db' }}>
                  ·
                </Text>
                <Text className="text-xs" style={{ color: '#6e9990' }}>
                  {method.short}
                </Text>
              </>
            )}
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
}
