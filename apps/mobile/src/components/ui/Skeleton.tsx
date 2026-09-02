import { useEffect } from 'react';
import { View, type ViewStyle, type DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: ViewStyle;
}

/**
 * A single shimmering placeholder block. Uses a looping opacity pulse on the
 * UI thread (reanimated) so it stays smooth even while JS is busy mounting the
 * real content behind it.
 */
export function Skeleton({ width = '100%', height = 16, radius = 8, style }: SkeletonProps) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: '#e7edeb' },
        animatedStyle,
        style,
      ]}
    />
  );
}

/**
 * A card-shaped skeleton block matching the app's rounded surface cards. Handy
 * as a deferred-mount fallback for heavy dashboard/insight cards.
 */
export function SkeletonCard({ height = 120, style }: { height?: number; style?: ViewStyle }) {
  return (
    <View
      className="overflow-hidden rounded-[20px] bg-white p-4"
      style={[{ shadowColor: '#00352e', shadowOpacity: 0.05, shadowRadius: 12, elevation: 1 }, style]}
    >
      <Skeleton width="40%" height={12} />
      <Skeleton width="70%" height={22} radius={6} style={{ marginTop: 12 }} />
      <Skeleton width="100%" height={height - 78} radius={12} style={{ marginTop: 14 }} />
    </View>
  );
}
