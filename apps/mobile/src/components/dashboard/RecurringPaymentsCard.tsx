import { useMemo } from 'react';
import { View, Text } from 'react-native';
import { ArrowsClockwise } from 'phosphor-react-native';
import { formatCurrencyCompact } from '@ledgeit/core';
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

const MAX_ROWS = 3;

export default function RecurringPaymentsCard() {
  const transactions = useStore((s) => s.transactions);

  const { rows, monthlyTotal } = useMemo(() => {
    // De-dupe recurring bills by merchant, keeping the most recent occurrence.
    const byMerchant = new Map<string, (typeof transactions)[number]>();
    for (const tx of transactions) {
      if (!tx.isRecurring || tx.type !== 'expense') continue;
      const existing = byMerchant.get(tx.merchant);
      if (!existing || tx.date > existing.date) byMerchant.set(tx.merchant, tx);
    }
    const rows = Array.from(byMerchant.values()).sort((a, b) => b.amount - a.amount);
    const monthlyTotal = rows.reduce((s, r) => s + r.amount, 0);
    return { rows, monthlyTotal };
  }, [transactions]);

  return (
    <View className="flex-1 rounded-2xl px-5 py-4" style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.06, shadowRadius: 20, elevation: 1 }}>
      {/* Header */}
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-[12px] font-bold uppercase tracking-[1.4px]" style={{ color: '#00352e' }}>
          Recurring Bills
        </Text>
        <ArrowsClockwise size={15} weight="bold" color="#a9c2bd" />
      </View>

      {rows.length === 0 ? (
        <Text className="text-[12px]" style={{ color: '#3f4946' }}>
          Mark a transaction as recurring to track subscriptions and bills here.
        </Text>
      ) : (
        <>
          <View className="flex-1 gap-3">
            {rows.slice(0, MAX_ROWS).map((tx) => {
              const Icon = getIconComponent(tx.category.icon);
              const hex = CATEGORY_HEX[tx.category.id] ?? '#64748b';
              return (
                <View key={tx.merchant} className="flex-row items-center gap-2.5">
                  <View className="h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${hex}18` }}>
                    <Icon size={14} weight="fill" color={hex} />
                  </View>
                  <Text className="min-w-0 flex-1 text-[12px] font-semibold" style={{ color: '#191c1c' }} numberOfLines={1}>
                    {tx.merchant}
                  </Text>
                  <Text className="shrink-0 font-mono text-[12px] font-semibold" style={{ color: '#3f4946' }}>
                    {formatCurrencyCompact(tx.amount)}
                  </Text>
                </View>
              );
            })}
          </View>

          <View className="mt-3 flex-row items-center justify-between" style={{ borderTopWidth: 1, borderTopColor: '#f0f4f2', paddingTop: 10 }}>
            <Text className="text-[10px] font-semibold uppercase tracking-[1.1px]" style={{ color: '#6e9990' }}>
              Est. monthly
            </Text>
            <Text className="font-mono text-[13px] font-bold" style={{ color: '#191c1c' }}>
              {formatCurrencyCompact(monthlyTotal)}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}
