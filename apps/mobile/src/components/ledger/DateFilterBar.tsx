import { ScrollView, Pressable, Text } from 'react-native';

export type DatePeriod = 'all' | 'thisMonth' | 'last7' | 'last30' | 'custom';

interface Preset {
  value: Exclude<DatePeriod, 'custom'>;
  label: string;
}

const PRESETS: Preset[] = [
  { value: 'all', label: 'All time' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
];

interface Props {
  period: DatePeriod;
  onPeriodChange: (period: DatePeriod) => void;
}

/**
 * Date-scoping row for the ledger: preset periods only. The web version also
 * offers a single-day calendar picker (via DatePickerSheet) — that's deferred
 * on mobile; a specific day can still be reached via a deep link (e.g. from
 * the dashboard heatmap), which sets `period` to 'custom' programmatically.
 */
export default function DateFilterBar({ period, onPeriodChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {PRESETS.map((preset) => {
        const isActive = period === preset.value;
        return (
          <Pressable
            key={preset.value}
            onPress={() => onPeriodChange(preset.value)}
            className="shrink-0 rounded-full px-4 py-1.5 active:opacity-80"
            style={
              isActive
                ? { backgroundColor: '#00352e', shadowColor: '#00352e', shadowOpacity: 0.2, shadowRadius: 8 }
                : { backgroundColor: '#f0f4f2' }
            }
          >
            <Text className="text-[12px] font-semibold" style={{ color: isActive ? '#ffffff' : '#3f4946' }}>
              {preset.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
