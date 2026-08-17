import { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { ArrowFatLineUp, ArrowFatLineDown } from 'phosphor-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { formatCurrency } from '@ledgeit/core';
import { useStore } from '@/lib/store';

function useCountUp(target: number, duration = 1000) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const prevTarget = useRef(0);

  useEffect(() => {
    const from = prevTarget.current;
    prevTarget.current = target;
    const start = Date.now();

    const tick = () => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (target - from) * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return display;
}

export default function BalanceMetric() {
  const transactions = useStore((s) => s.transactions);

  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const monthlyIncome = transactions
    .filter((t) => t.type === 'income' && t.date.startsWith(yearMonth))
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpense = transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(yearMonth))
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyNet = monthlyIncome - monthlyExpense;
  const isPositive = monthlyNet >= 0;

  const displayNet = useCountUp(monthlyNet);
  const displayIncome = useCountUp(monthlyIncome, 900);
  const displayExpense = useCountUp(monthlyExpense, 900);

  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <View>
      <Text
        className="mb-1 text-[11px] font-semibold uppercase tracking-[2px]"
        style={{ color: 'rgba(255,255,255,0.55)' }}
      >
        {monthLabel}
      </Text>

      <View className="flex-row items-baseline">
        <Text
          className="font-mono-bold text-[42px] leading-[46px]"
          style={{ color: isPositive ? '#ffffff' : '#fca5a5' }}
        >
          {isPositive ? '' : '−'}
          {formatCurrency(Math.abs(displayNet))}
        </Text>
      </View>
      <Text className="mt-1 text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Net this month
      </Text>

      <Animated.View entering={FadeInUp.delay(400).springify()} className="mt-4 flex-row gap-2">
        <View
          className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{ backgroundColor: 'rgba(255,255,255,0.13)' }}
        >
          <ArrowFatLineUp size={11} weight="fill" color="rgba(255,255,255,0.7)" />
          <Text className="font-mono-bold text-[12px]" style={{ color: '#ffffff' }}>
            {formatCurrency(displayIncome)}
          </Text>
        </View>
        <View
          className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{ backgroundColor: 'rgba(255,100,100,0.2)' }}
        >
          <ArrowFatLineDown size={11} weight="fill" color="rgba(255,160,160,0.9)" />
          <Text className="font-mono-bold text-[12px]" style={{ color: '#fca5a5' }}>
            {formatCurrency(displayExpense)}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}
