import { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { ArrowFatLineUp, ArrowFatLineDown } from 'phosphor-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { formatCurrency, isSpend, isEarn, spendAmount } from '@ledgeit/core';
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
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate();

  // Exclude the debts category entirely — lending/borrowing/repayments move money
  // between your own pockets and shouldn't shift your net for the month.
  const monthlyIncome = transactions
    .filter((t) => isEarn(t) && t.date.startsWith(yearMonth))
    .reduce((sum, t) => sum + t.amount, 0);
  // spendAmount nets out reimbursements (a refund reduces the month's spend).
  const monthlyExpense = transactions
    .filter((t) => isSpend(t) && t.date.startsWith(yearMonth))
    .reduce((sum, t) => sum + spendAmount(t), 0);
  const monthlyNet = monthlyIncome - monthlyExpense;
  const isPositive = monthlyNet >= 0;

  const displayNet = useCountUp(monthlyNet);
  const displayIncome = useCountUp(monthlyIncome, 900);
  const displayExpense = useCountUp(monthlyExpense, 900);

  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <View>
      {/* Label row — month + days-left, on one baseline */}
      <View className="mb-2 flex-row items-center justify-between">
        <Text
          className="text-[11px] font-semibold uppercase tracking-[2px]"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          {monthLabel}
        </Text>
        <Text
          className="rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold"
          style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.82)', overflow: 'hidden' }}
        >
          {daysLeft}d left
        </Text>
      </View>

      {/* Balance — full card width, single line, auto-fit */}
      <Text
        className="font-mono-bold text-[44px] leading-[48px]"
        style={{ color: isPositive ? '#ffffff' : '#fca5a5' }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
      >
        {isPositive ? '' : '−'}
        {formatCurrency(Math.abs(displayNet))}
      </Text>
      <Text className="mt-1.5 text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Net this month
      </Text>

      {/* Income / expense pills */}
      <Animated.View entering={FadeInUp.delay(400).springify()} className="mt-4 flex-row gap-2">
        <View
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-full py-2"
          style={{ backgroundColor: 'rgba(255,255,255,0.13)' }}
        >
          <ArrowFatLineUp size={12} weight="fill" color="rgba(255,255,255,0.7)" />
          <Text className="font-mono-bold text-[13px]" style={{ color: '#ffffff' }}>
            {formatCurrency(displayIncome)}
          </Text>
        </View>
        <View
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-full py-2"
          style={{ backgroundColor: 'rgba(255,100,100,0.2)' }}
        >
          <ArrowFatLineDown size={12} weight="fill" color="rgba(255,160,160,0.9)" />
          <Text className="font-mono-bold text-[13px]" style={{ color: '#fca5a5' }}>
            {formatCurrency(displayExpense)}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}
