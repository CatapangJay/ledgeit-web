import { useMemo, useState } from 'react';
import { View, Text, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { formatCurrencyCompact, isSpend, isEarn, spendAmount } from '@ledgeit/core';
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

const CHART_H = 120;
const DOT_R = 3;

/**
 * 7-day area chart. Reimplemented with react-native-svg (recharts isn't
 * available on RN). The Svg is rendered at true pixel dimensions (measured
 * width × fixed height) so the viewBox aspect ratio matches the rendered box —
 * no `preserveAspectRatio="none"` distortion. The x-domain is inset by the dot
 * radius so the endpoint dots at day 0 and day 6 aren't clipped.
 */
export default function WeeklyTrendChart() {
  const transactions = useStore((s) => s.transactions);
  const [chartW, setChartW] = useState(0);

  const days = useMemo(() => getLastNDays(7), []);

  const data = useMemo<DayDatum[]>(() => {
    return days.map((date) => {
      const dayTxns = transactions.filter((t) => t.date === date);
      const expense = dayTxns.filter((t) => isSpend(t)).reduce((s, t) => s + spendAmount(t), 0);
      const income = dayTxns.filter((t) => isEarn(t)).reduce((s, t) => s + t.amount, 0);
      return { date, expense, income, label: weekdayLabel(date) };
    });
  }, [days, transactions]);

  const totalWeek = data.reduce((s, d) => s + d.expense, 0);
  const avgDay = totalWeek / 7;
  const isEmpty = totalWeek === 0 && data.every((d) => d.income === 0);

  const { linePath, areaPath, points } = useMemo(() => {
    if (chartW <= 0) return { linePath: '', areaPath: '', points: [] as { x: number; y: number }[] };
    const max = Math.max(...data.map((d) => d.expense), 0);
    const domainMax = max <= 0 ? 1 : max * 1.15;
    // Inset the x-domain by the dot radius so endpoint dots aren't clipped.
    const x0 = DOT_R;
    const x1 = chartW - DOT_R;
    const stepX = (x1 - x0) / (data.length - 1);
    const points = data.map((d, i) => ({
      x: x0 + i * stepX,
      y: CHART_H - (d.expense / domainMax) * CHART_H,
    }));
    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L ${points[points.length - 1].x.toFixed(1)} ${CHART_H} L ${points[0].x.toFixed(1)} ${CHART_H} Z`;
    return { linePath: line, areaPath: area, points };
  }, [data, chartW]);

  return (
    <View className="rounded-2xl px-5 py-4" style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.06, shadowRadius: 20, elevation: 1 }}>
      {/* Header */}
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-[12px] font-bold uppercase tracking-[1.4px]" style={{ color: '#00352e' }}>
          7-Day Trend
        </Text>
        <Text className="font-mono text-[11px] font-semibold" style={{ color: '#6e9990' }}>
          {isEmpty ? 'No activity' : `Avg ${formatCurrencyCompact(avgDay)}/day`}
        </Text>
      </View>

      {/* Chart */}
      <View
        style={{ width: '100%', height: CHART_H }}
        onLayout={(e: LayoutChangeEvent) => setChartW(e.nativeEvent.layout.width)}
      >
        {chartW > 0 && (
          <Svg width={chartW} height={CHART_H} viewBox={`0 0 ${chartW} ${CHART_H}`}>
            <Defs>
              <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#1f695d" stopOpacity={0.24} />
                <Stop offset="100%" stopColor="#1f695d" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path d={areaPath} fill="url(#trendFill)" stroke="none" />
            <Path d={linePath} fill="none" stroke="#1f695d" strokeWidth={2.5} />
            {points.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r={DOT_R} fill="#ffffff" stroke="#1f695d" strokeWidth={2} />
            ))}
          </Svg>
        )}
      </View>

      {/* Weekday labels */}
      <View className="mt-1 flex-row justify-between">
        {data.map((d) => (
          <Text key={d.date} className="text-[10px] font-semibold" style={{ color: '#6e9990' }}>
            {d.label}
          </Text>
        ))}
      </View>

      {/* Legend */}
      <View className="mt-3 flex-row items-center gap-4" style={{ borderTopWidth: 1, borderTopColor: '#f0f4f2', paddingTop: 10 }}>
        {isEmpty ? (
          <Text className="text-[11px]" style={{ color: '#3f4946' }}>
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
