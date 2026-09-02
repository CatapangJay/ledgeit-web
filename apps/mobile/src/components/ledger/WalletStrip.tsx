import { useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { CaretRight } from 'phosphor-react-native';
import { formatCurrencyCompact, walletBalance } from '@ledgeit/core';
import { getIconComponent } from '@/lib/iconMap';
import { walletAccent } from '@/lib/walletColors';
import { useStore } from '@/lib/store';

/**
 * A slim, horizontally scrollable row of wallet balance chips shown atop the
 * ledger. Gives quick context on how much is set aside while reviewing activity,
 * and each chip links straight to the Wallets page. Hidden when the user has no
 * active wallets (the dashboard carries the create prompt).
 */
export default function WalletStrip() {
  const wallets = useStore((s) => s.wallets);
  const active = useMemo(() => wallets.filter((w) => !w.isArchived), [wallets]);

  if (active.length === 0) return null;

  return (
    <View className="mb-3">
      <View className="mb-1.5 flex-row items-center justify-between">
        <Text className="text-[11px] font-bold uppercase tracking-[1.3px]" style={{ color: '#6e9990' }}>
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
        {active.map((w) => {
          const Icon = getIconComponent(w.icon);
          const accent = walletAccent(w.color);
          return (
            <Link key={w.id} href="/wallets" asChild>
              <Pressable
                className="shrink-0 flex-row items-center gap-2 rounded-xl px-3 py-2 active:opacity-90"
                style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.05, shadowRadius: 12, elevation: 1 }}
              >
                <View className="h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}1a` }}>
                  <Icon size={12} weight="fill" color={accent} />
                </View>
                <View className="flex-col">
                  <Text className="text-[11px] font-semibold leading-tight" style={{ color: '#3f4946' }}>
                    {w.name}
                  </Text>
                  <Text className="font-mono text-[12px] font-bold leading-tight" style={{ color: '#00352e' }}>
                    {formatCurrencyCompact(walletBalance(w))}
                  </Text>
                </View>
              </Pressable>
            </Link>
          );
        })}
      </ScrollView>
    </View>
  );
}
