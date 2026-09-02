import { useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ArrowRight, CaretLeft, CaretRight, Plus } from 'phosphor-react-native';
import { formatCurrency, formatCurrencyCompact, isSpend, spendAmount } from '@ledgeit/core';
import { useStore } from '@/lib/store';

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Local, allocation-free date label: "Aug 8". */
function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Heatmap ramp — sage-white (no spend) → deep forest green (highest spend).
const RAMP = ['#e7f0ed', '#c3ddd5', '#8fc0b4', '#4f9385', '#1f695d', '#00352e'];

/** Map a day's spend to a ramp color, scaled against the month's busiest day. */
function rampColor(amount: number, max: number): string {
  if (amount <= 0 || max <= 0) return RAMP[0];
  const t = Math.sqrt(amount / max);
  const bucket = Math.min(RAMP.length - 1, 1 + Math.floor(t * (RAMP.length - 1)));
  return RAMP[bucket];
}

interface Props {
  /** Open Smart Entry pre-dated to this ISO day (for logging on an empty day). */
  onAddForDate: (iso: string) => void;
  /** Navigate to the ledger filtered to this ISO day. */
  onViewDate: (iso: string) => void;
}

export default function SpendingHeatmap({ onAddForDate, onViewDate }: Props) {
  const transactions = useStore((s) => s.transactions);

  const now = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => toISO(now), [now]);

  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));

  const atCurrentMonth = viewMonth.getFullYear() === now.getFullYear() && viewMonth.getMonth() === now.getMonth();

  const dailyTotals = useMemo(() => {
    const prefix = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}-`;
    const totals: Record<string, number> = {};
    for (const t of transactions) {
      if (!isSpend(t)) continue;
      if (!t.date.startsWith(prefix)) continue;
      // spendAmount nets out reimbursements from a day's spend total.
      totals[t.date] = (totals[t.date] ?? 0) + spendAmount(t);
    }
    return totals;
  }, [transactions, viewMonth]);

  const { weeks, monthTotal, maxDay, activeDays, elapsedDays } = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (string | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(toISO(new Date(year, month, d)));
    // Pad the trailing week so every row has exactly 7 cells — keeps columns
    // aligned and the final row the same height as the rest.
    while (cells.length % 7 !== 0) cells.push(null);

    // Chunk into fixed 7-cell weeks. Rendering each week as its own flex row
    // (cells at flex:1) guarantees 7 even squares per row that line up with the
    // weekday header — a single flex-wrap grid with percentage widths + gap
    // overflows and wraps a cell onto the next line.
    const weeks: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    const amounts = Object.values(dailyTotals);
    const monthTotal = amounts.reduce((s, a) => s + a, 0);
    const maxDay = amounts.length ? Math.max(...amounts) : 0;
    const activeDays = amounts.filter((a) => a > 0).length;
    const elapsedDays = atCurrentMonth ? now.getDate() : daysInMonth;

    return { weeks, monthTotal, maxDay, activeDays, elapsedDays };
  }, [viewMonth, dailyTotals, atCurrentMonth, now]);

  const daysWithoutEntry = Math.max(elapsedDays - activeDays, 0);
  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  function shiftMonth(delta: number) {
    setSelectedIso(null);
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  const selectedAmount = selectedIso ? (dailyTotals[selectedIso] ?? 0) : 0;

  return (
    <View className="rounded-2xl px-5 py-4" style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.06, shadowRadius: 20, elevation: 1 }}>
      {/* Header */}
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-[12px] font-bold uppercase tracking-[1.4px]" style={{ color: '#00352e' }}>
          Spending Map
        </Text>
        <View className="flex-row items-center gap-1">
          <Pressable onPress={() => shiftMonth(-1)} className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: '#f0f4f2' }}>
            <CaretLeft size={11} weight="bold" color="#3f4946" />
          </Pressable>
          <Text className="min-w-[78px] text-center font-mono text-[10px] font-semibold" style={{ color: '#6e9990' }}>
            {monthLabel}
          </Text>
          <Pressable
            onPress={() => !atCurrentMonth && shiftMonth(1)}
            disabled={atCurrentMonth}
            className="h-6 w-6 items-center justify-center rounded-full"
            style={{ backgroundColor: '#f0f4f2', opacity: atCurrentMonth ? 0.3 : 1 }}
          >
            <CaretRight size={11} weight="bold" color="#3f4946" />
          </Pressable>
        </View>
      </View>

      {/* Weekday labels */}
      <View className="mb-1 flex-row" style={{ gap: 4 }}>
        {WEEKDAYS.map((w, i) => (
          <View key={i} className="flex-1 items-center justify-center" style={{ height: 14 }}>
            <Text className="text-[9px] font-bold uppercase" style={{ color: '#6e9990' }}>
              {w}
            </Text>
          </View>
        ))}
      </View>

      {/* Day grid — one flex row per week; cells at flex:1 stay even squares
          and align with the weekday header above. */}
      <View style={{ gap: 4 }}>
        {weeks.map((week, wi) => (
          <View key={wi} className="flex-row" style={{ gap: 4 }}>
            {week.map((iso, i) => {
              if (!iso) return <View key={`empty-${wi}-${i}`} style={{ flex: 1, aspectRatio: 1 }} />;
              const amount = dailyTotals[iso] ?? 0;
              const isFuture = iso > todayIso;
              const isToday = iso === todayIso;
              const day = Number(iso.slice(-2));
              const hasSpend = amount > 0;
              const isSelected = iso === selectedIso;
              const bg = isFuture || !hasSpend ? 'transparent' : rampColor(amount, maxDay);
              const darkBg = hasSpend && amount / (maxDay || 1) > 0.4;
              return (
                <Pressable
                  key={iso}
                  disabled={isFuture}
                  onPress={() => setSelectedIso((cur) => (cur === iso ? null : iso))}
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    backgroundColor: bg,
                    borderWidth: isFuture ? 1 : !hasSpend ? 1 : 0,
                    borderColor: isFuture ? '#e2ecea' : !hasSpend ? '#d4e4e0' : 'transparent',
                    borderStyle: isFuture || !hasSpend ? 'dashed' : 'solid',
                    ...(isSelected
                      ? { borderWidth: 2, borderColor: '#1f695d', borderStyle: 'solid' as const }
                      : isToday
                        ? { borderWidth: 1.5, borderColor: '#00352e', borderStyle: 'solid' as const }
                        : null),
                  }}
                >
                  <Text
                    className="font-mono text-[10px] font-semibold"
                    style={{
                      color: darkBg ? '#ffffff' : isFuture ? '#cbdbd6' : hasSpend ? '#00352e' : '#8aa8a1',
                      textAlign: 'center',
                      textAlignVertical: 'center',
                      includeFontPadding: false,
                    }}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {/* Selected-day detail panel */}
      {selectedIso && (
        <Animated.View entering={FadeIn.duration(200)} className="mt-2.5 flex-row items-center justify-between gap-3 rounded-xl px-3 py-2.5" style={{ backgroundColor: '#f4f6f5' }}>
          <View className="min-w-0">
            <Text className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#6e9990' }}>
              {formatDateLabel(selectedIso)}
            </Text>
            <Text className="font-mono text-[15px] font-bold leading-tight" style={{ color: selectedAmount > 0 ? '#00352e' : '#8aa8a1' }}>
              {selectedAmount > 0 ? formatCurrency(selectedAmount) : 'No spending'}
            </Text>
          </View>

          {selectedAmount > 0 ? (
            <View className="flex-row shrink-0 items-center gap-2">
              <Pressable onPress={() => onAddForDate(selectedIso)} className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: '#e7edeb' }}>
                <Plus size={14} weight="bold" color="#1f695d" />
              </Pressable>
              <Pressable
                onPress={() => onViewDate(selectedIso)}
                className="flex-row items-center gap-1.5 rounded-full px-3.5 py-2"
                style={{ backgroundColor: '#1f695d' }}
              >
                <Text className="text-[12px] font-bold text-white">View details</Text>
                <ArrowRight size={12} weight="bold" color="#ffffff" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => onAddForDate(selectedIso)}
              className="flex-row shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2"
              style={{ backgroundColor: '#1f695d' }}
            >
              <Plus size={12} weight="bold" color="#ffffff" />
              <Text className="text-[12px] font-bold text-white">Add transaction</Text>
            </Pressable>
          )}
        </Animated.View>
      )}

      {/* Footer — summary + legend */}
      <View className="mt-2.5 flex-row items-center justify-between" style={{ borderTopWidth: 1, borderTopColor: '#f0f4f2', paddingTop: 8 }}>
        <Text className="text-[10px] font-medium" style={{ color: '#6e9990' }}>
          {monthTotal > 0
            ? `${formatCurrencyCompact(monthTotal)} · ${daysWithoutEntry} no ${daysWithoutEntry === 1 ? 'entry' : 'entries'}`
            : 'Nothing logged this month.'}
        </Text>
        <View className="flex-row items-center gap-0.5">
          <Text className="text-[8px] font-semibold" style={{ color: '#6e9990' }}>
            Less
          </Text>
          {RAMP.slice(1).map((c) => (
            <View key={c} className="h-2 w-2 rounded-sm" style={{ backgroundColor: c }} />
          ))}
          <Text className="text-[8px] font-semibold" style={{ color: '#6e9990' }}>
            More
          </Text>
        </View>
      </View>
    </View>
  );
}
