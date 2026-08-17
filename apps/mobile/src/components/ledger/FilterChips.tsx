import { ScrollView, Pressable, Text } from 'react-native';
import { CATEGORIES } from '@ledgeit/core';

export type FilterValue = 'all' | 'expense' | 'income' | 'transfer' | string;

interface Chip {
  value: FilterValue;
  label: string;
}

const BASE_CHIPS: Chip[] = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfers' },
];

// `transfers` is surfaced via the top-level "Transfers" type chip above, so it's
// excluded here to avoid a duplicate category chip.
const PRESET_CATEGORY_CHIPS: Chip[] = CATEGORIES.filter(
  (c) => c.id !== 'other' && c.id !== 'income' && c.id !== 'transfers',
).map((c) => ({ value: c.id, label: c.label }));

interface Props {
  active: FilterValue;
  onChange: (val: FilterValue) => void;
  /** Extra chips from user-created custom categories */
  customChips?: Chip[];
}

export default function FilterChips({ active, onChange, customChips = [] }: Props) {
  const allChips = [...BASE_CHIPS, ...PRESET_CATEGORY_CHIPS, ...customChips];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {allChips.map((chip) => {
        const isActive = chip.value === active;
        return (
          <Pressable
            key={chip.value}
            onPress={() => onChange(chip.value)}
            className="shrink-0 rounded-full px-4 py-1.5 active:opacity-80"
            style={
              isActive
                ? { backgroundColor: '#00352e', shadowColor: '#00352e', shadowOpacity: 0.2, shadowRadius: 8 }
                : { backgroundColor: '#f0f4f2' }
            }
          >
            <Text className="text-[12px] font-semibold" style={{ color: isActive ? '#ffffff' : '#3f4946' }}>
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
