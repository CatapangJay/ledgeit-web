import { useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { ArrowsLeftRight, Info, X } from 'phosphor-react-native';
import { formatCurrency, formatCurrencyCompact, formatDate } from '@ledgeit/core';
import { useStore } from '@/lib/store';

/**
 * This month's transfers as a compact list (credit-card payments, moving money
 * to savings, debt principal). Transfers move money between your own pockets, so
 * they stay out of spend/income totals. The full explanation lives behind an
 * (i) toggle instead of a permanent paragraph.
 */
export default function TransferInfoCard() {
  const transactions = useStore((s) => s.transactions);
  const [showInfo, setShowInfo] = useState(false);

  const { list, total } = useMemo(() => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthTransfers = transactions
      .filter((t) => t.type === 'transfer' && t.date.startsWith(month))
      .sort((a, b) => b.date.localeCompare(a.date));
    const total = monthTransfers.reduce((s, t) => s + t.amount, 0);
    return { list: monthTransfers.slice(0, 4), total };
  }, [transactions]);

  return (
    <View className="rounded-2xl px-5 py-4" style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.06, shadowRadius: 20, elevation: 1 }}>
      {/* Header */}
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-[12px] font-bold uppercase tracking-[1.7px]" style={{ color: '#00352e' }}>
            Transfers
          </Text>
          <Pressable
            onPress={() => setShowInfo((v) => !v)}
            hitSlop={8}
            accessibilityLabel="What counts as a transfer?"
            className="h-5 w-5 items-center justify-center rounded-full"
            style={{ backgroundColor: showInfo ? '#1f695d' : '#eef2f4' }}
          >
            <Info size={12} weight="bold" color={showInfo ? '#ffffff' : '#475569'} />
          </Pressable>
        </View>
        <View className="flex-row items-center gap-2">
          <Text className="font-mono text-[13px] font-bold" style={{ color: '#475569' }}>
            {total > 0 ? formatCurrencyCompact(total) : '—'}
          </Text>
          <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: '#eef2f4' }}>
            <ArrowsLeftRight size={12} weight="bold" color="#475569" />
          </View>
        </View>
      </View>

      {/* Explainer — only when the (i) is tapped */}
      {showInfo && (
        <Animated.View
          entering={FadeIn.duration(180)}
          className="mb-3 flex-row gap-2 rounded-xl px-3 py-2.5"
          style={{ backgroundColor: '#f4f6f7' }}
        >
          <Text className="flex-1 text-[12px] leading-relaxed" style={{ color: '#6e9990' }}>
            Paying a credit card or moving money to savings isn&apos;t spending — it&apos;s a{' '}
            <Text className="font-semibold" style={{ color: '#3f4946' }}>
              transfer
            </Text>
            . Log it like <Text style={{ color: '#475569' }}>&ldquo;cc payment 5000&rdquo;</Text> and it stays out of your totals and budgets.
          </Text>
          <Pressable onPress={() => setShowInfo(false)} hitSlop={8} className="h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: '#e3e9ea' }}>
            <X size={10} weight="bold" color="#6e9990" />
          </Pressable>
        </Animated.View>
      )}

      {/* Transfer list */}
      {list.length === 0 ? (
        <Text className="py-1 text-[12px]" style={{ color: '#3f4946' }}>
          No transfers this month.
        </Text>
      ) : (
        <View className="gap-2.5">
          {list.map((t, i) => (
            <Animated.View
              key={t.id}
              entering={FadeInUp.delay(i * 50).duration(280)}
              className="flex-row items-center justify-between gap-3"
            >
              <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
                <View className="h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: '#eef2f4' }}>
                  <ArrowsLeftRight size={13} weight="bold" color="#475569" />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[13px] font-semibold" style={{ color: '#191c1c' }} numberOfLines={1}>
                    {t.merchant}
                  </Text>
                  <Text className="mt-0.5 text-[11px]" style={{ color: '#6e9990' }}>
                    {formatDate(t.date)}
                  </Text>
                </View>
              </View>
              <Text
                className="shrink-0 font-mono text-[13px] font-semibold"
                style={{ color: '#475569' }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {formatCurrency(t.amount)}
              </Text>
            </Animated.View>
          ))}
        </View>
      )}
    </View>
  );
}
