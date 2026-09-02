import { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Trash, Receipt } from 'phosphor-react-native';
import { formatCurrency, formatDate, formatTime, isReimbursement, netAmount, type Transaction } from '@ledgeit/core';
import { getIconComponent, getIconBg } from '@/lib/iconMap';
import { useStore } from '@/lib/store';

const ROW_LIMIT = 8;

// ─── Group by date ────────────────────────────────────────────────────────────

function groupByDate(txns: Transaction[]): [string, Transaction[]][] {
  const map = new Map<string, Transaction[]>();
  for (const tx of txns) {
    const list = map.get(tx.date) ?? [];
    list.push(tx);
    map.set(tx.date, list);
  }
  // Sort date groups descending.
  return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
}

// ─── Swipeable row ────────────────────────────────────────────────────────────

function RightAction({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="w-20 items-center justify-center" style={{ backgroundColor: 'rgba(186,26,26,0.06)' }}>
      <Trash size={17} weight="fill" color="#ba1a1a" />
    </Pressable>
  );
}

function TxRow({ tx, onDelete }: { tx: Transaction; onDelete: (id: string) => void }) {
  const Icon = getIconComponent(tx.category.icon);
  const hex = getIconBg({ id: tx.category.id, color: tx.category.color });
  // A reimbursement reads as a credit (money back), shown green with a '+'.
  const isCredit = tx.type === 'income' || isReimbursement(tx);

  return (
    <Swipeable renderRightActions={() => <RightAction onPress={() => onDelete(tx.id)} />} overshootRight={false}>
      <Animated.View entering={FadeInUp.springify()} className="flex-row items-center gap-3 py-3" style={{ backgroundColor: '#ffffff' }}>
        {/* Category icon */}
        <View className="h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: hex }}>
          <Icon size={16} weight="fill" color="#ffffff" />
        </View>

        {/* Text */}
        <View className="min-w-0 flex-1">
          <View className="flex-row items-baseline justify-between gap-2">
            <Text className="shrink text-sm font-semibold" style={{ color: '#191c1c' }} numberOfLines={1}>
              {tx.merchant}
            </Text>
            <Text className="shrink-0 font-mono text-sm font-medium" style={{ color: isCredit ? '#1f6950' : '#ba1a1a' }}>
              {isCredit ? '+' : '−'}
              {formatCurrency(tx.amount)}
            </Text>
          </View>
          <View className="mt-0.5 flex-row items-center gap-1.5">
            <Text className="text-xs font-medium" style={{ color: hex }}>
              {tx.category.label}
            </Text>
            <Text style={{ color: '#cde0db' }}>·</Text>
            <Text className="font-mono text-xs" style={{ color: '#6e9990' }}>
              {formatTime(tx.createdAt)}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Swipeable>
  );
}

// ─── Date group header ─────────────────────────────────────────────────────────

function DateHeader({ date, transactions }: { date: string; transactions: Transaction[] }) {
  // netAmount signs each entry (income +, expense −, reimbursement +) and nets
  // transfers/debts to zero.
  const subtotal = transactions.reduce((sum, t) => sum + netAmount(t), 0);
  const isNet = subtotal >= 0;
  return (
    <View className="flex-row items-center justify-between pb-1 pt-4" style={{ borderTopWidth: 1, borderTopColor: '#e7edeb' }}>
      <Text className="text-[11px] font-bold uppercase tracking-[1.4px]" style={{ color: '#6e9990' }}>
        {formatDate(date)}
      </Text>
      <Text className="font-mono text-xs font-medium" style={{ color: isNet ? '#1f6950' : '#ba1a1a' }}>
        {subtotal >= 0 ? '+' : '−'}
        {formatCurrency(Math.abs(subtotal))}
      </Text>
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyFeed() {
  return (
    <View className="items-start gap-2 py-10">
      <Receipt size={32} weight="regular" color="#e7edeb" />
      <Text className="text-sm font-medium" style={{ color: '#6e9990' }}>
        Nothing yet.
      </Text>
      <Text className="text-xs" style={{ color: '#6e9990' }}>
        Tap + to log your first entry.
      </Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RecentFeed() {
  const transactions = useStore((s) => s.transactions);
  const deleteTransaction = useStore((s) => s.deleteTransaction);

  const recent = useMemo(() => transactions.slice(0, ROW_LIMIT), [transactions]);
  const groups = useMemo(() => groupByDate(recent), [recent]);

  if (recent.length === 0) return <EmptyFeed />;

  return (
    <View>
      {groups.map(([date, txns]) => (
        <View key={date}>
          <DateHeader date={date} transactions={txns} />
          {txns.map((tx) => (
            <TxRow key={tx.id} tx={tx} onDelete={deleteTransaction} />
          ))}
        </View>
      ))}
    </View>
  );
}
