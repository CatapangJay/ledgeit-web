import { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { CaretRight } from 'phosphor-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { formatCurrencyCompact, formatDate, isReimbursement, netAmount, type Transaction } from '@ledgeit/core';
import { getIconComponent, getIconBg } from '@/lib/iconMap';
import { useStore } from '@/lib/store';

const MAX_FEED = 5;

/** Amount sign + color per type. Transfers are neutral (money you still own);
 *  reimbursements read as a credit (money back) like income. */
function amountStyle(tx: Transaction): { sign: string; color: string } {
  if (tx.type === 'income' || isReimbursement(tx)) return { sign: '+', color: '#1f6950' };
  if (tx.type === 'transfer') return { sign: '', color: '#6e9990' };
  return { sign: '−', color: '#ba1a1a' };
}

export default function ExpenseFeed() {
  const transactions = useStore((s) => s.transactions);

  const sorted = useMemo(
    () => [...transactions].sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date))),
    [transactions],
  );
  const recent = useMemo(() => sorted.slice(0, MAX_FEED), [sorted]);
  const totalCount = transactions.length;

  // Net this month across income (+) and expense (−); transfers and debts excluded.
  const monthNet = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return transactions
      .filter((t) => t.date.startsWith(ym))
      .reduce((s, t) => s + netAmount(t), 0);
  }, [transactions]);

  return (
    <View className="overflow-hidden rounded-2xl" style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.06, shadowRadius: 20, elevation: 1 }}>
      <View className="flex-row items-center justify-between px-5 pb-3 pt-4">
        <Text className="text-[12px] font-bold uppercase tracking-[1.4px]" style={{ color: '#00352e' }}>
          Recent Activity
        </Text>
        <Text className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold overflow-hidden" style={{ backgroundColor: '#f0f4f2', color: '#6e9990' }}>
          {totalCount}
        </Text>
      </View>

      {recent.length === 0 ? (
        <View className="px-5 pb-5">
          <Text className="text-sm" style={{ color: '#6e9990' }}>
            Nothing recorded yet.
          </Text>
        </View>
      ) : (
        <>
          {recent.map((tx, i) => {
            const Icon = getIconComponent(tx.category.icon);
            const hex = getIconBg({ id: tx.category.id, color: tx.category.color });
            const { sign, color } = amountStyle(tx);
            return (
              <Animated.View
                key={tx.id}
                entering={FadeInUp.delay(i * 50).springify()}
                className="flex-row items-center gap-3 px-5 py-3"
                style={i > 0 ? { borderTopWidth: 1, borderTopColor: '#f7f9f8' } : undefined}
              >
                <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${hex}1f` }}>
                  <Icon size={16} weight="fill" color={hex} />
                </View>

                <View className="min-w-0 flex-1">
                  <Text className="text-[13px] font-semibold" style={{ color: '#191c1c' }} numberOfLines={1}>
                    {tx.merchant}
                  </Text>
                  <Text className="mt-0.5 text-[11px]" style={{ color: '#6e9990' }} numberOfLines={1}>
                    {tx.category.label} · {formatDate(tx.date)}
                  </Text>
                </View>

                <Text className="shrink-0 font-mono text-[13px] font-bold" style={{ color }}>
                  {sign}
                  {formatCurrencyCompact(tx.amount)}
                </Text>
              </Animated.View>
            );
          })}

          <Link href="/history" asChild>
            <Pressable
              className="flex-row items-center justify-between px-5 py-3"
              style={{ borderTopWidth: 1, borderTopColor: '#f0f4f2', backgroundColor: '#fcfefe' }}
            >
              <View className="flex-row items-center gap-1">
                <Text className="text-[11px] font-semibold" style={{ color: '#1f695d' }}>
                  View all
                </Text>
                <CaretRight size={11} weight="bold" color="#1f695d" />
              </View>
              <View className="flex-row items-baseline gap-1.5">
                <Text className="text-[11px] font-semibold" style={{ color: '#6e9990' }}>
                  Net this month
                </Text>
                <Text className="font-mono text-[13px] font-bold" style={{ color: monthNet >= 0 ? '#1f6950' : '#ba1a1a' }}>
                  {monthNet >= 0 ? '+' : '−'}
                  {formatCurrencyCompact(Math.abs(monthNet))}
                </Text>
              </View>
            </Pressable>
          </Link>
        </>
      )}
    </View>
  );
}
