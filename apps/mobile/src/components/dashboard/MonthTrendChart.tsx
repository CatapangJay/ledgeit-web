import { useMemo, useState } from 'react';
import { View, Text, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { formatCurrencyCompact, isSpend, isEarn, spendAmount } from '@ledgeit/core';
import { useStore } from '@/lib/store';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Every ISO date (YYYY-MM-DD) from start to end, inclusive. */
function daysInRange(start: string, end: string): string[] {
  const out: string[] = [];
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  const cur = new Date(sy, sm - 1, sd);
  const last = new Date(ey, em - 1, ed);
  while (cur <= last) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    out.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** Day-of-month number as the axis label (e.g. "1", "15", "31"). */
function dayLabel(dateStr: string): string {
  return String(Number(dateStr.split('-')[2]));
}

interface DayDatum {
  date: string;
  expense: number;
  income: number;
  label: string;
}

interface Props {
  /** Inclusive ISO bounds of the month to chart (from the insights page). */
  start: string;
  end: string;
}

const CHART_H = 170;

/**
 * Full-month daily expense area chart. Reimplemented with react-native-svg
 * (recharts isn't available on RN). The Svg is rendered at true pixel
 * dimensions (measured width × fixed height) so the viewBox aspect ratio
 * matches the rendered box — no `preserveAspectRatio="none"` distortion.
 * X-axis day labels are positioned by absolute x so each sits under its point.
 */
export default function MonthTrendChart({ start, end }: Props) {
  const transactions = useStore((s) => s.transactions);
  const [chartW, setChartW] = useState(0);

  const days = useMemo(() => daysInRange(start, end), [start, end]);

  const data = useMemo<DayDatum[]>(() => {
    // Bucket the month's transactions by date in one pass, then map days.
    const byDate = new Map<string, { expense: number; income: number }>();
    for (const t of transactions) {
      if (t.date < start || t.date > end) continue;
      // Debts + transfers move money between your own pockets — never charted.
      if (!isSpend(t) && !isEarn(t)) continue;
      const bucket = byDate.get(t.date) ?? { expense: 0, income: 0 };
      if (isSpend(t)) bucket.expense += spendAmount(t);
      else bucket.income += t.amount;
      byDate.set(t.date, bucket);
    }
    return days.map((date) => {
      const b = byDate.get(date);
      return { date, expense: b?.expense ?? 0, income: b?.income ?? 0, label: dayLabel(date) };
    });
  }, [days, transactions, start, end]);

  const totalMonth = data.reduce((s, d) => s + d.expense, 0);
  const activeDays = data.filter((d) => d.expense > 0).length;
  const avgActiveDay = activeDays > 0 ? totalMonth / activeDays : 0;
  const isEmpty = totalMonth === 0 && data.every((d) => d.income === 0);

  const { linePath, areaPath } = useMemo(() => {
    if (chartW <= 0) return { linePath: '', areaPath: '' };
    const max = Math.max(...data.map((d) => d.expense), 0);
    const domainMax = max <= 0 ? 1 : max * 1.15;
    const stepX = data.length > 1 ? chartW / (data.length - 1) : chartW;
    const points = data.map((d, i) => ({
      x: i * stepX,
      y: CHART_H - (d.expense / domainMax) * CHART_H,
    }));
    const line = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');
    const area = `${line} L ${chartW} ${CHART_H} L 0 ${CHART_H} Z`;
    return { linePath: line, areaPath: area };
  }, [data, chartW]);

  // Show a tick roughly every 3rd day (≈10 labels across a month) so the axis is
  // detailed but not crowded, and always include the last day of the month. Each
  // shown label is positioned by its absolute fraction along the x-axis so it
  // sits directly under its data point rather than drifting with justify-between.
  const step = 3;
  const lastIdx = days.length - 1;
  const tickLabels = data
    .map((d, i) => ({ label: d.label, i }))
    .filter(({ i }) => i % step === 0 || i === lastIdx)
    .map(({ label, i }) => ({ label, frac: lastIdx > 0 ? i / lastIdx : 0 }));

  return (
    <View className="rounded-2xl px-5 py-4" style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.06, shadowRadius: 20, elevation: 1 }}>
      {/* Header */}
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-[12px] font-bold uppercase tracking-[1.4px]" style={{ color: '#00352e' }}>
          Daily Trend
        </Text>
        <Text className="font-mono text-[10px] font-semibold" style={{ color: '#6e9990' }}>
          {isEmpty ? 'No activity' : `Avg ${formatCurrencyCompact(avgActiveDay)}/active day`}
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
              <LinearGradient id="monthTrendFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#1f695d" stopOpacity={0.24} />
                <Stop offset="100%" stopColor="#1f695d" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path d={areaPath} fill="url(#monthTrendFill)" stroke="none" />
            <Path d={linePath} fill="none" stroke="#1f695d" strokeWidth={2} />
          </Svg>
        )}
      </View>

      {/* Day-of-month labels — each positioned under its data point */}
      <View className="mt-1" style={{ height: 12 }}>
        {tickLabels.map(({ label, frac }, i) => (
          <Text
            key={`${label}-${i}`}
            className="absolute text-[9px] font-semibold"
            style={{
              color: '#6e9990',
              left: `${frac * 100}%`,
              transform: [{ translateX: i === 0 ? 0 : i === tickLabels.length - 1 ? -12 : -6 }],
            }}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}
