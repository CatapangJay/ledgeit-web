import { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { formatCurrencyCompact } from '@ledgeit/core';
import { useStore } from '@/lib/store';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLastNDays(n: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    days.push(`${y}-${m}-${day}`);
  }
  return days;
}

function weekdayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
}

interface DayDatum {
  date: string;
  expense: number;
  income: number;
  label: string;
}

const CHART_W = 300;
const CHART_H = 100;

/**
 * 7-day area chart. Reimplemented with react-native-svg (recharts isn't
 * available on RN); the viewBox is a fixed logical size scaled to the
 * container width via `preserveAspectRatio="none"`, so no onLayout is needed.
 */
export default function WeeklyTrendChart() {
  const transactions = useStore((s) => s.transactions);

  const days = useMemo(() => getLastNDays(7), []);

  const data = useMemo<DayDatum[]>(() => {
    return days.map((date) => {
      const dayTxns = transactions.filter((t) => t.date === date);
      const expense = dayTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const income = dayTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      return { date, expense, income, label: weekdayLabel(date) };
    });
  }, [days, transactions]);

  const totalWeek = data.reduce((s, d) => s + d.expense, 0);
  const avgDay = totalWeek / 7;
  const isEmpty = totalWeek === 0 && data.every((d) => d.income === 0);

  const { linePath, areaPath, points } = useMemo(() => {
    const max = Math.max(...data.map((d) => d.expense), 0);
    const domainMax = max <= 0 ? 1 : max * 1.15;
    const stepX = CHART_W / (data.length - 1);
    const points = data.map((d, i) => ({
      x: i * stepX,
      y: CHART_H - (d.expense / domainMax) * CHART_H,
    }));
    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L ${CHART_W} ${CHART_H} L 0 ${CHART_H} Z`;
    return { linePath: line, areaPath: area, points };
  }, [data]);

  return (
    <View className="rounded-2xl px-5 py-4" style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.07, shadowRadius: 24, elevation: 1 }}>
      {/* Header */}
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-[12px] font-bold uppercase tracking-[1.7px]" style={{ color: '#00352e' }}>
          7-Day Trend
        </Text>
        <Text className="font-mono text-[11px] font-semibold" style={{ color: '#6e9990' }}>
          {isEmpty ? 'No activity' : `Avg ${formatCurrencyCompact(avgDay)}/day`}
        </Text>
      </View>

      {/* Chart */}
      <View style={{ width: '100%', height: 120 }}>
        <Svg width="100%" height={120} viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#1f695d" stopOpacity={0.24} />
              <Stop offset="100%" stopColor="#1f695d" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={areaPath} fill="url(#trendFill)" stroke="none" />
          <Path d={linePath} fill="none" stroke="#1f695d" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
          {points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={3} fill="#ffffff" stroke="#1f695d" strokeWidth={2} />
          ))}
        </Svg>
      </View>

      {/* Weekday labels */}
      <View className="mt-1 flex-row justify-between">
        {data.map((d) => (
          <Text key={d.date} className="text-[10px] font-semibold" style={{ color: '#a9c2bd' }}>
            {d.label}
          </Text>
        ))}
      </View>

      {/* Legend */}
      <View className="mt-3 flex-row items-center gap-4" style={{ borderTopWidth: 1, borderTopColor: '#f0f4f2', paddingTop: 10 }}>
        {isEmpty ? (
          <Text className="text-[11px]" style={{ color: '#a9c2bd' }}>
            Log an expense to start your weekly trend.
          </Text>
        ) : (
          <View className="flex-row items-center gap-1.5">
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: '#1f695d' }} />
            <Text className="text-[10px] font-medium" style={{ color: '#6e9990' }}>
              Daily spending
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
