import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { formatCurrency, type Category } from '@ledgeit/core';

interface Props {
  category: Category;
  spent: number;
  limit: number;
}

function getBarColor(ratio: number): string {
  if (ratio > 0.9) return '#ba1a1a';
  if (ratio > 0.75) return '#d97706';
  return '#1f695d';
}

function getLabelColor(ratio: number): string {
  if (ratio > 0.9) return '#ba1a1a';
  if (ratio > 0.75) return '#d97706';
  return '#1f6950';
}

export default function BudgetBar({ category, spent, limit }: Props) {
  const ratio = limit > 0 ? Math.min(spent / limit, 1) : 0;
  const pct = Math.round(ratio * 100);

  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(pct, { duration: 700 });
  }, [pct, width]);
  const style = useAnimatedStyle(() => ({ width: `${width.value}%` as const }));

  return (
    <View className="mb-2 rounded-2xl p-4" style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.06, shadowRadius: 12, elevation: 1 }}>
      {/* Row 1: Category + amounts */}
      <View className="mb-3 flex-row items-baseline justify-between gap-2">
        <Text className="text-sm font-semibold" style={{ color: '#191c1c' }}>
          {category.label}
        </Text>
        <View className="flex-row items-baseline gap-1">
          <Text className="font-mono text-sm font-bold" style={{ color: getLabelColor(ratio) }}>
            {formatCurrency(spent)}
          </Text>
          <Text className="font-mono text-[11px] font-medium" style={{ color: '#6e9990' }}>
            / {formatCurrency(limit)}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View className="h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: '#f0f4f2' }}>
        <Animated.View className="h-full rounded-full" style={[style, { backgroundColor: getBarColor(ratio) }]} />
      </View>

      {/* Percentage */}
      <View className="mt-2 items-end">
        <Text className="text-[11px] font-semibold" style={{ color: getLabelColor(ratio) }}>
          {pct}%
        </Text>
      </View>
    </View>
  );
}
