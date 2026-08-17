import { useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { CATEGORIES, formatCurrencyCompact, type Transaction } from '@ledgeit/core';

// Muted hex palette — matches the category color vocabulary used elsewhere.
const SEGMENT_HEX: Record<string, string> = {
  restaurants: '#c2410c',
  groceries: '#4d7c0f',
  transport: '#0369a1',
  shopping: '#7c3aed',
  utilities: '#b45309',
  entertainment: '#be185d',
  health: '#be123c',
  other: '#64748b',
};

interface Props {
  transactions: Transaction[];
}

export default function CategoryBreakdownBar({ transactions }: Props) {
  const [active, setActive] = useState<string | null>(null);

  const { breakdown, total, incomeTotal } = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === 'expense');
    const total = expenses.reduce((s, t) => s + t.amount, 0);
    const incomeTotal = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);

    const map = new Map<string, number>();
    for (const t of expenses) {
      map.set(t.category.id, (map.get(t.category.id) ?? 0) + t.amount);
    }

    const breakdown = CATEGORIES.filter((c) => c.id !== 'income' && map.has(c.id))
      .map((c) => ({
        id: c.id,
        label: c.label.split(/[\s&]/)[0],
        amount: map.get(c.id)!,
        pct: total > 0 ? (map.get(c.id)! / total) * 100 : 0,
        color: SEGMENT_HEX[c.id] ?? '#64748b',
      }))
      .sort((a, b) => b.amount - a.amount);

    return { breakdown, total, incomeTotal };
  }, [transactions]);

  if (total === 0 && incomeTotal === 0) return null;

  const activeSeg = breakdown.find((s) => s.id === active);

  return (
    <View className="mb-4 rounded-2xl p-4" style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.06, shadowRadius: 12, elevation: 1 }}>
      {/* Header */}
      <View className="mb-3 flex-row items-baseline justify-between">
        <Text className="text-[11px] font-bold uppercase tracking-[1.4px]" style={{ color: '#00352e' }}>
          {total > 0 && incomeTotal > 0 ? 'Breakdown' : total > 0 ? 'Expenses' : 'Income'}
        </Text>
        <View className="flex-row items-baseline gap-2">
          {incomeTotal > 0 && (
            <Text className="font-mono text-sm font-bold" style={{ color: '#1f6950' }}>
              +{formatCurrencyCompact(incomeTotal)}
            </Text>
          )}
          {total > 0 && (
            <Text className="font-mono text-sm font-bold" style={{ color: '#ba1a1a' }}>
              −{formatCurrencyCompact(total)}
            </Text>
          )}
        </View>
      </View>

      {total > 0 && (
        <>
          <View className="h-3 w-full flex-row gap-px overflow-hidden rounded-full">
            {breakdown.map((seg) => {
              const isActive = active === seg.id;
              return (
                <Pressable
                  key={seg.id}
                  onPress={() => setActive((prev) => (prev === seg.id ? null : seg.id))}
                  style={{
                    height: '100%',
                    width: `${seg.pct}%`,
                    backgroundColor: seg.color,
                    opacity: active && !isActive ? 0.45 : 1,
                  }}
                />
              );
            })}
          </View>

          <View className="mt-3" style={{ minHeight: 22 }}>
            {activeSeg ? (
              <View className="flex-row items-center gap-1.5">
                <View className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: activeSeg.color }} />
                <Text className="text-[12px] font-semibold" style={{ color: '#191c1c' }}>
                  {activeSeg.label}
                </Text>
                <Text className="font-mono text-[12px] font-bold" style={{ color: activeSeg.color }}>
                  −{formatCurrencyCompact(activeSeg.amount)}
                </Text>
                <Text className="text-[11px] font-medium" style={{ color: '#6e9990' }}>
                  {activeSeg.pct.toFixed(0)}%
                </Text>
              </View>
            ) : (
              <Text className="text-[11px]" style={{ color: '#cde0db' }}>
                Tap a segment to see details
              </Text>
            )}
          </View>
        </>
      )}
    </View>
  );
}
