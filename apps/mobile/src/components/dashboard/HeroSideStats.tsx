import { useMemo } from 'react';
import { View, Text } from 'react-native';
import { TrendUp, TrendDown, CalendarBlank, ChartLineUp, type Icon } from 'phosphor-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { formatCurrencyCompact, isSpend, isEarn, spendAmount, netAmount } from '@ledgeit/core';
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

/**
 * The hero's three secondary stats, laid out as an even horizontal row beneath
 * the balance. Each stat gets an equal share of the card width (flex:1) so the
 * big balance figure above never has to compete for horizontal space.
 */
export default function HeroSideStats() {
  const transactions = useStore((s) => s.transactions);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = ym(now);
    const lastMonth = ym(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    let thisExpense = 0;
    let thisIncome = 0;
    let lastNet = 0;
    for (const tx of transactions) {
      // Only real earning/spending count — transfers and the debts category move
      // money between your own pockets, so they're skipped everywhere.
      const spend = isSpend(tx);
      const earn = isEarn(tx);
      if (!spend && !earn) continue;
      if (tx.date.startsWith(thisMonth)) {
        // spendAmount nets out reimbursements from the month's expense total.
        if (spend) thisExpense += spendAmount(tx);
        else thisIncome += tx.amount;
      } else if (tx.date.startsWith(lastMonth)) {
        lastNet += netAmount(tx);
      }
    }

    const thisNet = thisIncome - thisExpense;
    const avgDay = thisExpense / Math.max(dayOfMonth, 1);
    const projectedSpend = avgDay * daysInMonth;

    let deltaPct: number | null = null;
    if (lastNet !== 0) {
      deltaPct = ((thisNet - lastNet) / Math.abs(lastNet)) * 100;
    }

    return { avgDay, projectedSpend, deltaPct };
  }, [transactions]);

  const deltaUp = (stats.deltaPct ?? 0) >= 0;

  const rows: Row[] = [
    {
      key: 'delta',
      icon: deltaUp ? TrendUp : TrendDown,
      label: 'vs Last Mo.',
      value: stats.deltaPct === null ? '—' : `${deltaUp ? '+' : '−'}${Math.abs(Math.round(stats.deltaPct))}%`,
      tint: stats.deltaPct === null ? 'rgba(255,255,255,0.9)' : deltaUp ? '#7ee2a8' : '#f6a9a4',
    },
    {
      key: 'avg',
      icon: ChartLineUp,
      label: 'Avg / Day',
      value: formatCurrencyCompact(stats.avgDay),
      tint: '#ffffff',
    },
    {
      key: 'proj',
      icon: CalendarBlank,
      label: 'Proj. Spend',
      value: formatCurrencyCompact(stats.projectedSpend),
      tint: '#ffffff',
    },
  ];

  return (
    <View className="flex-row">
      {rows.map((row, i) => {
        const RowIcon = row.icon;
        return (
          <Animated.View
            key={row.key}
            entering={FadeInUp.delay(350 + i * 70).springify()}
            className="flex-1 gap-1.5"
            style={
              i > 0
                ? { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.12)', paddingLeft: 14 }
                : { paddingRight: 14 }
            }
          >
            <View className="flex-row items-center gap-1">
              <RowIcon size={11} weight="bold" color="rgba(255,255,255,0.5)" />
              <Text
                className="text-[9px] font-bold uppercase tracking-[1px]"
                style={{ color: 'rgba(255,255,255,0.5)' }}
                numberOfLines={1}
              >
                {row.label}
              </Text>
            </View>
            <Text
              className="font-mono-bold text-[16px] leading-none"
              style={{ color: row.tint }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {row.value}
            </Text>
          </Animated.View>
        );
      })}
    </View>
  );
}
