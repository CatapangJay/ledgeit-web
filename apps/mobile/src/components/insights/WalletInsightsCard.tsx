import { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { CaretRight, TrendUp } from 'phosphor-react-native';
import { formatCurrency, walletBalance, walletGoalProgress, type Wallet } from '@ledgeit/core';
import { getIconComponent } from '@/lib/iconMap';
import { walletAccent } from '@/lib/walletColors';
import { useStore } from '@/lib/store';

interface Props {
  /** Inclusive ISO date bounds (YYYY-MM-DD) of the month being viewed. */
  start: string;
  end: string;
}

/** Net amount moved into a wallet within [start, end] — deposits minus withdrawals. */
function netContribution(wallet: Wallet, start: string, end: string): number {
  return wallet.movements.reduce((sum, m) => {
    if (m.date < start || m.date > end) return sum;
    return m.type === 'deposit' ? sum + m.amount : sum - m.amount;
  }, 0);
}

/**
 * Insights widget: how the user's wallets grew (or shrank) over the selected
 * month. Shows total set aside, this month's net contribution across all
 * wallets, and a per-wallet row with balance + goal progress. Hidden when the
 * user has no active wallets.
 */
export default function WalletInsightsCard({ start, end }: Props) {
  const wallets = useStore((s) => s.wallets);

  const { active, totalStashed, monthNet } = useMemo(() => {
    const active = wallets.filter((w) => !w.isArchived);
    const totalStashed = active.reduce((s, w) => s + walletBalance(w), 0);
    const monthNet = active.reduce((s, w) => s + netContribution(w, start, end), 0);
    return { active, totalStashed, monthNet };
  }, [wallets, start, end]);

  if (active.length === 0) return null;

  return (
    <View className="rounded-2xl px-5 py-4" style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.06, shadowRadius: 20, elevation: 1 }}>
      {/* Header */}
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-[12px] font-bold uppercase tracking-[1.4px]" style={{ color: '#00352e' }}>
          Wallets
        </Text>
        <Link href="/wallets" asChild>
          <Pressable className="flex-row items-center gap-0.5 active:opacity-70">
            <Text className="text-[11px] font-semibold" style={{ color: '#1f695d' }}>
              Manage
            </Text>
            <CaretRight size={11} weight="bold" color="#1f695d" />
          </Pressable>
        </Link>
      </View>

      {/* Totals */}
      <View className="mb-3 flex-row gap-2">
        <View className="flex-1 rounded-xl px-3 py-2.5" style={{ backgroundColor: 'rgba(31,105,80,0.08)' }}>
          <Text className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#1f6950' }}>
            Total set aside
          </Text>
          <Text className="mt-0.5 font-mono text-[15px] font-bold" style={{ color: '#00352e' }}>
            {formatCurrency(totalStashed)}
          </Text>
        </View>
        <View className="flex-1 rounded-xl px-3 py-2.5" style={{ backgroundColor: monthNet >= 0 ? 'rgba(31,105,80,0.08)' : 'rgba(186,26,26,0.08)' }}>
          <View className="flex-row items-center gap-1">
            <TrendUp size={11} weight="bold" color={monthNet >= 0 ? '#1f6950' : '#ba1a1a'} />
            <Text className="text-[10px] font-bold uppercase tracking-wide" style={{ color: monthNet >= 0 ? '#1f6950' : '#ba1a1a' }}>
              This month
            </Text>
          </View>
          <Text className="mt-0.5 font-mono text-[15px] font-bold" style={{ color: monthNet >= 0 ? '#00352e' : '#ba1a1a' }}>
            {monthNet >= 0 ? '+' : '−'}
            {formatCurrency(Math.abs(monthNet))}
          </Text>
        </View>
      </View>

      {/* Per-wallet rows */}
      <View className="flex-col gap-2.5">
        {active.map((w) => {
          const Icon = getIconComponent(w.icon);
          const accent = walletAccent(w.color);
          const balance = walletBalance(w);
          const progress = walletGoalProgress(w);
          const net = netContribution(w, start, end);
          return (
            <View key={w.id}>
              <View className="flex-row items-center gap-2.5">
                <View className="h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}1a` }}>
                  <Icon size={13} weight="fill" color={accent} />
                </View>
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-baseline justify-between gap-2">
                    <Text className="shrink text-[12px] font-semibold" style={{ color: '#191c1c' }} numberOfLines={1}>
                      {w.name}
                    </Text>
                    <Text className="shrink-0 font-mono text-[12px] font-bold" style={{ color: '#3f4946' }}>
                      {formatCurrency(balance)}
                    </Text>
                  </View>
                  {progress != null && (
                    <View className="mt-1 h-1 w-full overflow-hidden rounded-full" style={{ backgroundColor: '#eef2f1' }}>
                      <View className="h-full rounded-full" style={{ width: `${progress * 100}%`, backgroundColor: accent }} />
                    </View>
                  )}
                </View>
                {/* This month's movement for this wallet — quiet unless nonzero. */}
                {net !== 0 && (
                  <Text className="shrink-0 font-mono text-[11px] font-semibold" style={{ color: net > 0 ? '#1f6950' : '#ba1a1a' }}>
                    {net > 0 ? '+' : '−'}
                    {formatCurrency(Math.abs(net))}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
