import { useEffect, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { CaretDown } from 'phosphor-react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { formatCurrency, type Category } from '@ledgeit/core';

interface Props {
  category: Category;
  spent: number;
  limit: number;
  /** When set, the bar becomes an accordion toggle showing `children` when open. */
  expanded?: boolean;
  onToggle?: (categoryId: string) => void;
  /** Breakdown content revealed when expanded. */
  children?: ReactNode;
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

export default function BudgetBar({ category, spent, limit, expanded = false, onToggle, children }: Props) {
  const hasLimit = limit > 0;
  // A reimbursement-heavy category can net negative; clamp the bar ratio at 0 so
  // the fill never inverts (the label still shows the real signed amount).
  const ratio = hasLimit ? Math.min(Math.max(spent, 0) / limit, 1) : 0;
  const pct = Math.round(ratio * 100);
  const clickable = !!onToggle;

  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(pct, { duration: 700 });
  }, [pct, width]);
  const barStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as const }));

  const caret = useSharedValue(0);
  useEffect(() => {
    caret.value = withSpring(expanded ? 180 : 0, { stiffness: 400, damping: 28 });
  }, [expanded, caret]);
  const caretStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${caret.value}deg` }] }));

  const Header = clickable ? Pressable : View;

  return (
    <View className="mb-2 rounded-2xl p-4" style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.06, shadowRadius: 20, elevation: 1 }}>
      {/* Header row — toggles the accordion when clickable */}
      <Header
        {...(clickable ? { onPress: () => onToggle!(category.id) } : {})}
        className="gap-3"
      >
        {/* Row 1: Category + amounts */}
        <View className="flex-row items-baseline justify-between gap-2">
          <View className="flex-row items-center gap-1.5">
            {clickable && (
              <Animated.View style={caretStyle} className="items-center justify-center">
                <CaretDown size={12} weight="bold" color="#6e9990" />
              </Animated.View>
            )}
            <Text className="text-sm font-semibold" style={{ color: '#191c1c' }}>
              {category.label}
            </Text>
          </View>
          <View className="flex-row items-baseline gap-1 shrink-0">
            <Text className="font-mono text-sm font-bold" style={{ color: hasLimit ? getLabelColor(ratio) : '#191c1c' }}>
              {formatCurrency(spent)}
            </Text>
            {hasLimit ? (
              <>
                <Text className="font-mono text-[11px] font-medium" style={{ color: '#6e9990' }}>
                  / {formatCurrency(limit)}
                </Text>
                <Text className="text-[11px] font-semibold" style={{ color: getLabelColor(ratio) }}>
                  · {pct}%
                </Text>
              </>
            ) : (
              <Text className="text-[11px] font-medium" style={{ color: '#6e9990' }}>
                · no budget
              </Text>
            )}
          </View>
        </View>

        {/* Progress bar — track only when there's no limit set */}
        <View className="h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: '#f0f4f2' }}>
          {hasLimit && (
            <Animated.View className="h-full rounded-full" style={[barStyle, { backgroundColor: getBarColor(ratio) }]} />
          )}
        </View>
      </Header>

      {/* Expandable breakdown */}
      {expanded && (
        <Animated.View entering={FadeIn.duration(220)} className="mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: '#f0f4f2' }}>
          {children}
        </Animated.View>
      )}
    </View>
  );
}
