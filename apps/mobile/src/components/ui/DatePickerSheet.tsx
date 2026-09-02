import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { CaretLeft, CaretRight, CaretDown } from 'phosphor-react-native';
import { formatDate } from '@ledgeit/core';

// ─── Local-date helpers (avoid UTC drift from toISOString) ──────────────────────

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

interface Props {
  open: boolean;
  /** Currently selected date, ISO YYYY-MM-DD. */
  value: string;
  onSelect: (date: string) => void;
  onClose: () => void;
  /** Latest selectable date, ISO. Defaults to today (no future dates). */
  max?: string;
}

/**
 * Native month/day picker in a gorhom bottom sheet, porting the web
 * DatePickerSheet's calendar (day grid + month/year chooser). Tap the header to
 * toggle between the day grid and the month picker; arrows step months (day
 * view) or years (month view). Mirrors the mobile sheet idiom (backdrop,
 * handle, brand tokens) from TransactionEditSheet.
 */
export default function DatePickerSheet({ open, value, onSelect, onClose, max }: Props) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['62%'], []);

  const todayISO = useMemo(() => toISO(new Date()), []);
  const maxISO = max ?? todayISO;

  // Month currently shown in the grid — seeded from the selected value.
  const [viewMonth, setViewMonth] = useState(() => {
    const d = value ? fromISO(value) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // 'days' → day grid · 'months' → month + year chooser (fast year jumping).
  const [mode, setMode] = useState<'days' | 'months'>('days');

  useEffect(() => {
    if (open) {
      sheetRef.current?.expand();
      const d = value ? fromISO(value) : new Date();
      setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      setMode('days');
    } else {
      sheetRef.current?.close();
    }
  }, [open, value]);

  const grid = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(toISO(new Date(year, month, d)));
    return cells;
  }, [viewMonth]);

  // Next-month navigation is disabled once the view reaches the max month.
  const maxDate = fromISO(maxISO);
  const atMaxMonth =
    viewMonth.getFullYear() === maxDate.getFullYear() &&
    viewMonth.getMonth() === maxDate.getMonth();

  function shiftMonth(delta: number) {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  const maxYear = maxDate.getFullYear();
  const viewYear = viewMonth.getFullYear();
  const minYear = maxYear - 120;

  function shiftYear(delta: number) {
    setViewMonth((m) => {
      const nextYear = Math.min(maxYear, Math.max(minYear, m.getFullYear() + delta));
      const maxMonth = nextYear === maxYear ? maxDate.getMonth() : 11;
      return new Date(nextYear, Math.min(m.getMonth(), maxMonth), 1);
    });
  }

  function pickMonth(monthIndex: number) {
    setViewMonth((m) => new Date(m.getFullYear(), monthIndex, 1));
    setMode('days');
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />}
      backgroundStyle={{ backgroundColor: '#f8faf9' }}
      handleIndicatorStyle={{ backgroundColor: '#cde0db' }}
    >
      <BottomSheetView style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
        {/* Header — tap the label to toggle the month/year chooser */}
        <View className="mb-4 flex-row items-center justify-between">
          <Pressable
            onPress={() => setMode((m) => (m === 'days' ? 'months' : 'days'))}
            className="flex-row items-center gap-1.5 rounded-xl py-0.5 pl-1 pr-2"
          >
            <View>
              <Text className="text-base font-bold tracking-tight" style={{ color: '#00352e' }}>
                {MONTH_NAMES[viewMonth.getMonth()]}
              </Text>
              <Text className="font-mono text-[11px] font-semibold" style={{ color: '#6e9990' }}>
                {viewMonth.getFullYear()}
              </Text>
            </View>
            <CaretDown size={12} weight="bold" color="#6e9990" />
          </Pressable>

          {/* Nav arrows: step months in day view, step years in month view */}
          <View className="flex-row items-center gap-1.5">
            {mode === 'days' ? (
              <>
                <Pressable
                  onPress={() => shiftMonth(-1)}
                  className="h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: '#f0f4f2' }}
                >
                  <CaretLeft size={13} weight="bold" color="#3f4946" />
                </Pressable>
                <Pressable
                  onPress={() => !atMaxMonth && shiftMonth(1)}
                  disabled={atMaxMonth}
                  className="h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: '#f0f4f2', opacity: atMaxMonth ? 0.3 : 1 }}
                >
                  <CaretRight size={13} weight="bold" color="#3f4946" />
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  onPress={() => shiftYear(-1)}
                  disabled={viewYear <= minYear}
                  className="h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: '#f0f4f2', opacity: viewYear <= minYear ? 0.3 : 1 }}
                >
                  <CaretLeft size={13} weight="bold" color="#3f4946" />
                </Pressable>
                <Pressable
                  onPress={() => shiftYear(1)}
                  disabled={viewYear >= maxYear}
                  className="h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: '#f0f4f2', opacity: viewYear >= maxYear ? 0.3 : 1 }}
                >
                  <CaretRight size={13} weight="bold" color="#3f4946" />
                </Pressable>
              </>
            )}
          </View>
        </View>

        {mode === 'days' ? (
          <View>
            {/* Weekday labels */}
            <View className="mb-1 flex-row">
              {WEEKDAYS.map((w, i) => (
                <View key={i} className="h-7 items-center justify-center" style={{ width: `${100 / 7}%` }}>
                  <Text className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#6e9990' }}>
                    {w}
                  </Text>
                </View>
              ))}
            </View>

            {/* Day grid */}
            <View className="flex-row flex-wrap">
              {grid.map((iso, i) => {
                if (!iso) return <View key={`empty-${i}`} style={{ width: `${100 / 7}%`, height: 40 }} />;
                const day = fromISO(iso).getDate();
                const isSelected = iso === value;
                const isToday = iso === todayISO;
                const isDisabled = iso > maxISO;
                return (
                  <View key={iso} style={{ width: `${100 / 7}%`, height: 40 }} className="items-center justify-center">
                    <Pressable
                      disabled={isDisabled}
                      onPress={() => { onSelect(iso); onClose(); }}
                      className="h-9 w-9 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: isSelected ? '#1f695d' : 'transparent',
                        opacity: isDisabled ? 0.25 : 1,
                      }}
                    >
                      <Text className="font-mono text-[13px] font-semibold" style={{ color: isSelected ? '#ffffff' : '#191c1c' }}>
                        {day}
                      </Text>
                      {isToday && !isSelected && (
                        <View
                          className="absolute h-1 w-1 rounded-full"
                          style={{ backgroundColor: '#1f695d', bottom: 4 }}
                        />
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View className="flex-row flex-wrap">
            {MONTH_ABBR.map((label, m) => {
              const isSelectedMonth =
                m === viewMonth.getMonth() &&
                (!value || viewYear === fromISO(value).getFullYear());
              const isDisabled = viewYear === maxYear && m > maxDate.getMonth();
              return (
                <View key={label} style={{ width: `${100 / 3}%` }} className="p-1">
                  <Pressable
                    disabled={isDisabled}
                    onPress={() => pickMonth(m)}
                    className="h-11 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: isSelectedMonth ? '#1f695d' : '#f0f4f2',
                      opacity: isDisabled ? 0.25 : 1,
                    }}
                  >
                    <Text className="text-[13px] font-bold" style={{ color: isSelectedMonth ? '#ffffff' : '#191c1c' }}>
                      {label}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {/* Footer — quick "Today" jump */}
        <View className="mt-4 flex-row justify-end">
          <Pressable
            onPress={() => { onSelect(todayISO); onClose(); }}
            className="rounded-full px-4 py-1.5"
            style={{ backgroundColor: '#e7edeb' }}
          >
            <Text className="text-[12px] font-bold" style={{ color: '#1f695d' }}>
              Today
            </Text>
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
