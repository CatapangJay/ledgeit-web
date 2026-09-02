import { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Sparkle, Flame, CircleIcon as Circle, Gauge, PiggyBank, type Icon } from 'phosphor-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { getCoachMessage, type CoachIcon, type CoachTone } from '@ledgeit/core';
import { useStore } from '@/lib/store';

const ICONS: Record<CoachIcon, Icon> = {
  sparkle: Sparkle,
  flame: Flame,
  circle: Circle,
  gauge: Gauge,
  piggy: PiggyBank,
};

// Tone → tint. Warnings use amber (watch), never crimson (alarm) — the brand
// must never amplify money stress. Positive uses the teal/gain family.
const TONE: Record<CoachTone, { fg: string; bg: string }> = {
  positive: { fg: '#1f6950', bg: 'rgba(31,105,80,0.10)' },
  neutral: { fg: '#3f4946', bg: 'rgba(110,153,144,0.12)' },
  warn: { fg: '#b45309', bg: 'rgba(217,119,6,0.12)' },
};

export default function CoachLine() {
  const transactions = useStore((s) => s.transactions);
  const budgetLimits = useStore((s) => s.budgetLimits);
  const hasSetup = useStore((s) => s.hasSetupBudget());
  const budgetAllocations = useStore((s) => s.budgetAllocations);
  const activePlan = budgetAllocations.find((a) => a.isActive) ?? null;

  const message = useMemo(
    () =>
      getCoachMessage({
        transactions,
        budgetLimits,
        hasSetupBudget: hasSetup,
        now: new Date(),
        activePlanName: activePlan?.name ?? null,
        activePlanDays: 0,
      }),
    [transactions, budgetLimits, hasSetup, activePlan],
  );

  if (!message) return null;

  const MessageIcon = ICONS[message.icon];
  const tone = TONE[message.tone];

  return (
    <Animated.View
      key={message.id}
      entering={FadeIn.duration(220)}
      className="mt-2 flex-row items-center self-start gap-2 rounded-2xl py-1.5 pl-2.5 pr-3.5"
      style={{ backgroundColor: tone.bg }}
    >
      <MessageIcon size={14} weight="fill" color={tone.fg} />
      <Text className="flex-shrink text-[12px] font-medium leading-snug" style={{ color: tone.fg }} numberOfLines={2}>
        {message.text}
      </Text>
    </Animated.View>
  );
}
