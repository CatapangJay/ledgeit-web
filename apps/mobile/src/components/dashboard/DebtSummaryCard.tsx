import { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { ArrowDown, ArrowUp, CaretRight, HandCoins, Warning } from 'phosphor-react-native';
import { debtDueStatus, debtOutstanding, formatCurrencyCompact, formatDate, type Debt } from '@ledgeit/core';
import { useStore } from '@/lib/store';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Short label for the nearest-due reminder, e.g. "due today", "2d overdue". */
function duePhrase(days: number, overdue: boolean): string {
  if (overdue) return days === -1 ? '1 day overdue' : `${Math.abs(days)} days overdue`;
  if (days === 0) return 'due today';
  if (days === 1) return 'due tomorrow';
  return `due in ${days} days`;
}

/**
 * Dashboard widget: at-a-glance debt position (owed to me vs. I owe) plus the
 * single most-urgent upcoming/overdue repayment. Hidden entirely when the user
 * tracks no debts.
 */
export default function DebtSummaryCard() {
  const debts = useStore((s) => s.debts);

  const { totalOwedToMe, totalIOwe, openCount, nearest } = useMemo(() => {
    const today = todayISO();
    let totalOwedToMe = 0;
    let totalIOwe = 0;
    let openCount = 0;
    let nearest: { debt: Debt; days: number; overdue: boolean } | null = null;

    for (const d of debts) {
      if (d.isSettled) continue;
      openCount++;
      const outstanding = debtOutstanding(d);
      if (d.direction === 'owed_to_me') totalOwedToMe += outstanding;
      else totalIOwe += outstanding;

      const due = debtDueStatus(d, today);
      if (due.state === 'overdue' || due.state === 'due_soon' || due.state === 'upcoming') {
        if (!nearest || due.days < nearest.days) {
          nearest = { debt: d, days: due.days, overdue: due.state === 'overdue' };
        }
      }
    }
    return { totalOwedToMe, totalIOwe, openCount, nearest };
  }, [debts]);

  // Nothing to show — keep the dashboard clean for users not tracking debts.
  if (openCount === 0) return null;

  const showReminder = nearest !== null && nearest.days <= 7;

  return (
    <Link href="/debts" asChild>
      <Pressable className="rounded-2xl px-5 py-4 active:opacity-90" style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.06, shadowRadius: 20, elevation: 1 }}>
        {/* Header */}
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-[12px] font-bold uppercase tracking-[1.4px]" style={{ color: '#00352e' }}>
            Debts &amp; Loans
          </Text>
          <View className="flex-row items-center gap-1.5">
            <HandCoins size={15} weight="fill" color="#a9c2bd" />
            <CaretRight size={12} weight="bold" color="#cde0db" />
          </View>
        </View>

        {/* Owed to me / I owe totals */}
        <View className="flex-row gap-2">
          <View className="flex-1 rounded-xl px-3 py-2.5" style={{ backgroundColor: 'rgba(31,105,80,0.08)' }}>
            <View className="flex-row items-center gap-1">
              <ArrowDown size={11} weight="bold" color="#1f6950" />
              <Text className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#1f6950' }}>
                Owed to me
              </Text>
            </View>
            <Text className="mt-0.5 font-mono text-[15px] font-bold" style={{ color: '#00352e' }}>
              {formatCurrencyCompact(totalOwedToMe)}
            </Text>
          </View>
          <View className="flex-1 rounded-xl px-3 py-2.5" style={{ backgroundColor: 'rgba(180,83,9,0.08)' }}>
            <View className="flex-row items-center gap-1">
              <ArrowUp size={11} weight="bold" color="#b45309" />
              <Text className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#b45309' }}>
                I owe
              </Text>
            </View>
            <Text className="mt-0.5 font-mono text-[15px] font-bold" style={{ color: '#00352e' }}>
              {formatCurrencyCompact(totalIOwe)}
            </Text>
          </View>
        </View>

        {/* Nearest due reminder */}
        {showReminder && nearest && (
          <View
            className="mt-3 flex-row items-center gap-2 rounded-xl px-3 py-2"
            style={{ backgroundColor: nearest.overdue ? 'rgba(186,26,26,0.08)' : 'rgba(180,83,9,0.08)' }}
          >
            <Warning size={13} weight="fill" color={nearest.overdue ? '#ba1a1a' : '#b45309'} />
            <Text className="min-w-0 flex-1 text-[11px] font-semibold" style={{ color: '#3f4946' }} numberOfLines={1}>
              {nearest.debt.direction === 'owed_to_me'
                ? `${nearest.debt.personName} — ${duePhrase(nearest.days, nearest.overdue)}`
                : `Pay ${nearest.debt.personName} — ${duePhrase(nearest.days, nearest.overdue)}`}
            </Text>
            <Text className="shrink-0 text-[10px] font-medium" style={{ color: '#6e9990' }}>
              {formatDate(nearest.debt.dueDate!)}
            </Text>
          </View>
        )}
      </Pressable>
    </Link>
  );
}
