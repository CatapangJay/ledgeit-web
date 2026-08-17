import { useMemo } from 'react';
import { View, Text } from 'react-native';
import { TrendUp, TrendDown, CalendarBlank, ChartLineUp, type Icon } from 'phosphor-react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { formatCurrencyCompact } from '@ledgeit/core';
import { useStore } from '@/lib/store';

function ym(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

interface Row {
  key: string;
  icon: Icon;
  label: string;
  value: string;
  tint: string;
}

export default function HeroSideStats() {
  const transactions = useStore((s) => s.transactions);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = ym(now);
    const lastMonth = ym(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = daysInMonth - dayOfMonth;

    let thisExpense = 0;
    let thisIncome = 0;
    let lastNet = 0;
    for (const tx of transactions) {
      if (tx.date.startsWith(thisMonth)) {
        if (tx.type === 'expense') thisExpense += tx.amount;
        else thisIncome += tx.amount;
      } else if (tx.date.startsWith(lastMonth)) {
        lastNet += tx.type === 'income' ? tx.amount : -tx.amount;
      }
    }

    const thisNet = thisIncome - thisExpense;
    const avgDay = thisExpense / Math.max(dayOfMonth, 1);
    const projectedSpend = avgDay * daysInMonth;

    let deltaPct: number | null = null;
    if (lastNet !== 0) {
      deltaPct = ((thisNet - lastNet) / Math.abs(lastNet)) * 100;
    }

    return { avgDay, projectedSpend, daysLeft, deltaPct };
  }, [transactions]);

  const deltaUp = (stats.deltaPct ?? 0) >= 0;

  const rows: Row[] = [
    {
      key: 'delta',
      icon: deltaUp ? TrendUp : TrendDown,
      label: 'vs Last Month',
      value: stats.deltaPct === null ? '—' : `${deltaUp ? '+' : '−'}${Math.abs(Math.round(stats.deltaPct))}%`,
      tint: stats.deltaPct === null ? 'rgba(255,255,255,0.85)' : deltaUp ? '#7ee2a8' : '#f6a9a4',
    },
    {
      key: 'avg',
      icon: ChartLineUp,
      label: 'Avg / Day',
      value: formatCurrencyCompact(stats.avgDay),
      tint: 'rgba(255,255,255,0.92)',
    },
    {
      key: 'proj',
      icon: CalendarBlank,
      label: 'Proj. Spend',
      value: formatCurrencyCompact(stats.projectedSpend),
      tint: 'rgba(255,255,255,0.92)',
    },
  ];

  return (
    <View
      className="shrink-0 justify-center gap-4 self-stretch pl-4"
      style={{ borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.14)', minWidth: 118 }}
    >
      {rows.map((row, i) => {
        const RowIcon = row.icon;
        return (
          <Animated.View key={row.key} entering={FadeInRight.delay(350 + i * 80).springify()} className="gap-1">
            <View className="flex-row items-center gap-1.5">
              <RowIcon size={12} weight="bold" color="rgba(255,255,255,0.5)" />
              <Text
                className="text-[10px] font-semibold uppercase tracking-[1.4px]"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                {row.label}
              </Text>
            </View>
            <Text className="font-mono-bold text-[17px] leading-none" style={{ color: row.tint }}>
              {row.value}
            </Text>
          </Animated.View>
        );
      })}

      <View className="mt-1 flex-row items-center gap-1.5">
        <Text
          className="rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold overflow-hidden"
          style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.82)' }}
        >
          {stats.daysLeft} {stats.daysLeft === 1 ? 'day' : 'days'} left
        </Text>
      </View>
    </View>
  );
}
