import { useMemo, useState } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SlidersHorizontal, Tag, Wallet, HandCoins, ClockCounterClockwise, CaretRight, Confetti, Cloud } from 'phosphor-react-native';
import { debtOutstanding, walletBalance, formatCurrency } from '@ledgeit/core';
import { useStore } from '@/lib/store';
import BudgetAllocationSheet from '@/components/budget/BudgetAllocationSheet';
import CategoryManagerSheet from '@/components/budget/CategoryManagerSheet';
import MonthlyRecapModal from '@/components/dashboard/MonthlyRecapModal';
import { computeMonthlyRecap, previousMonthKey } from '@/lib/monthlyRecap';
import { usePreviousMonthLimits } from '@/lib/usePreviousMonthLimits';
import { useCloud, type CloudStatus } from '@/lib/sync/cloud';

const CLOUD_SUBTITLE: Record<CloudStatus, string> = {
  unconfigured: 'Saved on this device',
  loading: 'Checking…',
  'signed-out': 'Sign in — Premium syncs to web & mobile',
  free: 'Free · Saved on this device only',
  syncing: 'Premium · Syncing…',
  synced: 'Premium · Synced',
  error: 'Premium · Sync pending',
};

interface RowProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

function SettingsRow({ icon, iconBg, title, subtitle, onPress }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl px-4 py-4 active:opacity-80"
      style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7edeb' }}
    >
      <View className="h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: iconBg }}>
        {icon}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-semibold" style={{ color: '#191c1c' }}>
          {title}
        </Text>
        <Text className="text-[11px]" style={{ color: '#6e9990' }} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <CaretRight size={15} weight="bold" color="#6e9990" />
    </Pressable>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const [budgetSheetOpen, setBudgetSheetOpen] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);

  const budgetAllocations = useStore((s) => s.budgetAllocations);
  const activePlan = budgetAllocations.find((a) => a.isActive) ?? null;
  const debts = useStore((s) => s.debts);
  const openDebtCount = debts.filter((d) => !d.isSettled && debtOutstanding(d) > 0).length;
  const wallets = useStore((s) => s.wallets);
  const activeWallets = wallets.filter((w) => !w.isArchived);
  const totalStashed = activeWallets.reduce((s, w) => s + walletBalance(w), 0);
  const customCategories = useStore((s) => s.customCategories);
  const hiddenCategories = useStore((s) => s.hiddenCategories);
  const transactions = useStore((s) => s.transactions);
  const cloudStatus = useCloud((s) => s.status);

  // Last month's recap — re-openable here any time (it auto-shows once on the
  // dashboard at the start of each month).
  const { limits: prevMonthLimits } = usePreviousMonthLimits();
  // Carryovers that landed in last month adjust its budget; their transfers aren't activity.
  const budgetCarryovers = useStore((s) => s.budgetCarryovers);
  const recap = useMemo(
    () => computeMonthlyRecap(previousMonthKey(new Date()), transactions, prevMonthLimits, customCategories, budgetCarryovers),
    [transactions, prevMonthLimits, customCategories, budgetCarryovers],
  );

  return (
    <View className="flex-1" style={{ backgroundColor: '#f8faf9' }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="pb-4 pt-16">
          <Text className="text-xl font-bold tracking-tight" style={{ color: '#00352e' }}>
            Account
          </Text>
          <Text className="mt-1 text-sm" style={{ color: '#6e9990' }}>
            Plans, categories, wallets & more.
          </Text>
        </View>

        <View className="gap-3">
          {/* Cloud sync (premium) */}
          <SettingsRow
            icon={<Cloud size={16} weight="bold" color="#1f695d" />}
            iconBg="#e7edeb"
            title="Cloud Sync"
            subtitle={CLOUD_SUBTITLE[cloudStatus]}
            onPress={() => router.push('/cloud-sync')}
          />

          {/* Budget plans */}
          <SettingsRow
            icon={<SlidersHorizontal size={16} weight="bold" color="#1f695d" />}
            iconBg="#e7edeb"
            title="Budget Plans"
            subtitle={activePlan ? `Active: ${activePlan.name}` : 'Create or switch plans'}
            onPress={() => setBudgetSheetOpen(true)}
          />

          {/* Manage categories */}
          <SettingsRow
            icon={<Tag size={16} weight="bold" color="#1f695d" />}
            iconBg="#e7edeb"
            title="Categories"
            subtitle={
              hiddenCategories.length > 0
                ? `${hiddenCategories.length} hidden${customCategories.length > 0 ? ` · ${customCategories.length} custom` : ''}`
                : customCategories.length > 0
                  ? `${customCategories.length} custom`
                  : 'Hide or restore categories'
            }
            onPress={() => setCategorySheetOpen(true)}
          />

          {/* Monthly recap — re-open last month's summary */}
          <SettingsRow
            icon={<Confetti size={16} weight="bold" color="#1f695d" />}
            iconBg="#e7edeb"
            title="Monthly Recap"
            subtitle={recap.isEmpty ? 'No activity last month yet' : `Revisit your ${recap.label} summary`}
            onPress={() => setRecapOpen(true)}
          />

          {/* Wallets */}
          <SettingsRow
            icon={<Wallet size={16} weight="bold" color="#1f695d" />}
            iconBg="#e7edeb"
            title="Wallets"
            subtitle={
              activeWallets.length > 0
                ? `${formatCurrency(totalStashed)} across ${activeWallets.length} wallet${activeWallets.length === 1 ? '' : 's'}`
                : 'Track savings, investments & goals'
            }
            onPress={() => router.push('/wallets')}
          />

          {/* Debts & Loans */}
          <SettingsRow
            icon={<HandCoins size={16} weight="bold" color="#b45309" />}
            iconBg="#fdf0dd"
            title="Debts & Loans"
            subtitle={openDebtCount > 0 ? `${openDebtCount} open` : 'Track money lent or borrowed'}
            onPress={() => router.push('/debts')}
          />

          {/* History */}
          <SettingsRow
            icon={<ClockCounterClockwise size={16} weight="bold" color="#1f695d" />}
            iconBg="#e7edeb"
            title="History"
            subtitle="Past months at a glance"
            onPress={() => router.push('/history')}
          />
        </View>
      </ScrollView>

      <BudgetAllocationSheet open={budgetSheetOpen} onClose={() => setBudgetSheetOpen(false)} />
      <CategoryManagerSheet open={categorySheetOpen} onClose={() => setCategorySheetOpen(false)} />
      <MonthlyRecapModal recap={recap} open={recapOpen} onClose={() => setRecapOpen(false)} />
    </View>
  );
}
