import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { formatCurrency } from '@ledgeit/core';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  spent: number;
  saved: number;
}

const SIZE = 96;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function SpendDonut({ spent, saved }: Props) {
  const total = spent + saved;
  const spentRatio = total > 0 ? spent / total : 0;
  const spentDash = CIRCUMFERENCE * spentRatio;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(spentDash, { duration: 700 });
  }, [spentDash, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE - progress.value,
  }));

  return (
    <View className="flex-row items-center gap-6 rounded-2xl p-5" style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.06, shadowRadius: 12, elevation: 1 }}>
      {/* SVG ring */}
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#f0f4f2" strokeWidth={STROKE} />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="#ba1a1a"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          animatedProps={animatedProps}
        />
      </Svg>

      {/* Legend */}
      <View className="min-w-0 gap-3">
        <View>
          <Text className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
            Spent
          </Text>
          <Text className="font-mono text-xl font-bold" style={{ color: '#ba1a1a' }}>
            {formatCurrency(spent)}
          </Text>
        </View>
        <View>
          <Text className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
            Saved
          </Text>
          <Text className="font-mono text-xl font-bold" style={{ color: '#1f6950' }}>
            {formatCurrency(saved)}
          </Text>
        </View>
      </View>
    </View>
  );
}
