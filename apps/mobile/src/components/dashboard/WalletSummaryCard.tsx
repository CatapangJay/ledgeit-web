import { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { Wallet as WalletIcon, CaretRight, Plus } from 'phosphor-react-native';
import { formatCurrencyCompact, walletBalance, walletGoalProgress, type Wallet } from '@ledgeit/core';
import { getIconComponent } from '@/lib/iconMap';
import { walletAccent } from '@/lib/walletColors';
import { useStore } from '@/lib/store';

const accentFor = walletAccent;

/**
 * Dashboard widget: total money set aside across all active wallets, with the
 * top few wallets and their balances/goal progress. Hidden entirely when the
 * user has no active wallets — keeping the dashboard clean for non-users.
 */
export default function WalletSummaryCard() {
  const wallets = useStore((s) => s.wallets);

  const { active, totalStashed, top } = useMemo(() => {
    const active = wallets.filter((w) => !w.isArchived);
    const totalStashed = active.reduce((s, w) => s + walletBalance(w), 0);
    // Surface the fullest wallets first — that's where the money is.
    const top = [...active].sort((a, b) => walletBalance(b) - walletBalance(a)).slice(0, 3);
    return { active, totalStashed, top };
  }, [wallets]);

  // No wallets yet — show a compact prompt that still links to /wallets. This is
  // the primary way mobile users reach the Wallets page (there's no bottom-nav
  // slot for it), so it must be present even before the first wallet exists.
  if (active.length === 0) {
    return (
      <Link href="/wallets" asChild>
        <Pressable
          className="flex-row items-center gap-3 rounded-2xl px-5 py-4 active:opacity-90"
          style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.06, shadowRadius: 20, elevation: 1 }}
        >
          <View className="h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: '#e7edeb' }}>
            <WalletIcon size={18} weight="fill" color="#1f695d" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-bold" style={{ color: '#00352e' }}>
              Set money aside
            </Text>
            <Text className="text-[11px]" style={{ color: '#6e9990' }} numberOfLines={1}>
              Create a savings, investment, or goal wallet
            </Text>
          </View>
          <View className="h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: '#e7edeb' }}>
            <Plus size={15} weight="bold" color="#1f695d" />
          </View>
        </Pressable>
      </Link>
    );
  }

  return (
    <Link href="/wallets" asChild>
      <Pressable
        className="flex-1 flex-col rounded-2xl px-5 py-4 active:opacity-90"
        style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.06, shadowRadius: 20, elevation: 1 }}
      >
        {/* Header */}
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-[12px] font-bold uppercase tracking-[1.4px]" style={{ color: '#00352e' }}>
            Wallets
          </Text>
          <View className="flex-row items-center gap-1.5">
            <WalletIcon size={15} weight="fill" color="#a9c2bd" />
            <CaretRight size={12} weight="bold" color="#cde0db" />
          </View>
        </View>

        {/* Total stashed */}
        <View className="mb-3 rounded-xl px-3 py-2.5" style={{ backgroundColor: 'rgba(31,105,80,0.08)' }}>
          <Text className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#1f6950' }}>
            Total stashed away
          </Text>
          <Text className="mt-0.5 font-mono text-[17px] font-bold" style={{ color: '#00352e' }}>
            {formatCurrencyCompact(totalStashed)}
          </Text>
        </View>

        {/* Top wallets */}
        <View className="flex-col gap-2">
          {top.map((w: Wallet) => {
            const Icon = getIconComponent(w.icon);
            const accent = accentFor(w.color);
            const progress = walletGoalProgress(w);
            return (
              <View key={w.id} className="flex-row items-center gap-2.5">
                <View className="h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}1a` }}>
                  <Icon size={13} weight="fill" color={accent} />
                </View>
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-baseline justify-between gap-2">
                    <Text className="shrink text-[12px] font-semibold" style={{ color: '#191c1c' }} numberOfLines={1}>
                      {w.name}
                    </Text>
                    <Text className="shrink-0 font-mono text-[12px] font-bold" style={{ color: '#3f4946' }}>
                      {formatCurrencyCompact(walletBalance(w))}
                    </Text>
                  </View>
                  {progress != null && (
                    <View className="mt-1 h-1 w-full overflow-hidden rounded-full" style={{ backgroundColor: '#eef2f1' }}>
                      <View className="h-full rounded-full" style={{ width: `${progress * 100}%`, backgroundColor: accent }} />
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {active.length > top.length && (
          <Text className="mt-2 text-[11px] font-medium" style={{ color: '#6e9990' }}>
            +{active.length - top.length} more
          </Text>
        )}
      </Pressable>
    </Link>
  );
}
