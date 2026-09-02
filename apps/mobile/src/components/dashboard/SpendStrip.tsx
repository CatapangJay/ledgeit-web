import { View, Text } from 'react-native';
import { CATEGORIES, formatCurrency, isSpend, spendAmount } from '@ledgeit/core';
import { useStore } from '@/lib/store';

const CATEGORY_HEX: Record<string, string> = {
  restaurants: '#e05c2a',
  groceries: '#28a46a',
  transport: '#0284c7',
  shopping: '#7c3aed',
  utilities: '#d97706',
  entertainment: '#db2777',
  health: '#e91e63',
  income: '#1f6950',
  other: '#6e9990',
};

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function SpendStrip() {
  const transactions = useStore((s) => s.transactions);
  const getDailyTotal = useStore((s) => s.getDailyTotal);
  const today = todayISO();
  const todayExpenses = transactions.filter((t) => t.date === today && isSpend(t));
  // spendAmount nets out reimbursements from today's spend total and breakdown.
  const total = todayExpenses.reduce((sum, t) => sum + spendAmount(t), 0);
  const todayIncome = getDailyTotal(today, 'income');

  const breakdown = todayExpenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.category.id] = (acc[t.category.id] ?? 0) + spendAmount(t);
    return acc;
  }, {});

  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <View
      className="rounded-2xl px-5 py-4"
      style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.06, shadowRadius: 20, elevation: 1 }}
    >
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-[12px] font-bold uppercase tracking-[1.4px]" style={{ color: '#00352e' }}>
          Today
        </Text>
        <Text className="font-mono text-[11px]" style={{ color: '#6e9990' }}>
          {dateLabel}
        </Text>
      </View>

      {todayExpenses.length === 0 ? (
        <View className="gap-1">
          <View className="h-2 w-full rounded-full" style={{ backgroundColor: '#f0f4f2' }} />
          <Text className="mt-2 text-[12px]" style={{ color: '#6e9990' }}>
            Nothing logged yet today.
          </Text>
        </View>
      ) : (
        <>
          <View className="mb-2 flex-row items-baseline justify-between">
            <Text className="font-mono text-base font-bold" style={{ color: '#ba1a1a' }}>
              −{formatCurrency(total)}
            </Text>
            {todayIncome > 0 && (
              <Text className="font-mono text-[13px] font-semibold" style={{ color: '#1f6950' }}>
                +{formatCurrency(todayIncome)}
              </Text>
            )}
          </View>

          <View className="h-2 w-full flex-row overflow-hidden rounded-full">
            {Object.entries(breakdown).map(([catId, amount], i) => (
              <View
                key={catId}
                style={{
                  // Guard against a zero/negative net total (reimbursements) and
                  // clamp per-segment widths so a refunded category can't go negative.
                  width: `${total > 0 ? Math.max((amount / total) * 100, 0) : 0}%`,
                  backgroundColor: CATEGORY_HEX[catId] ?? '#6e9990',
                  // Thin white separator between segments — a border stays inside
                  // the segment width (RN is border-box), so totals never overflow.
                  ...(i > 0 ? { borderLeftWidth: 2, borderLeftColor: '#ffffff' } : null),
                }}
              />
            ))}
          </View>

          <View className="mt-2.5 flex-row flex-wrap gap-2">
            {Object.entries(breakdown).map(([catId, amount]) => {
              const cat = CATEGORIES.find((c) => c.id === catId);
              return (
                <View key={catId} className="flex-row items-center gap-1">
                  <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CATEGORY_HEX[catId] ?? '#6e9990' }} />
                  <Text className="text-[11px] font-medium" style={{ color: '#3f4946' }}>
                    {cat?.label ?? catId}
                  </Text>
                  <Text className="font-mono text-[11px]" style={{ color: '#6e9990' }}>
                    {formatCurrency(amount)}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}
