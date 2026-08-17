import { useMemo, useState } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Bell, Sparkle, UserCircle } from 'phosphor-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import BalanceMetric from '@/components/dashboard/BalanceMetric';
import HeroSideStats from '@/components/dashboard/HeroSideStats';
import CoachLine from '@/components/dashboard/CoachLine';
import MonthOverview from '@/components/dashboard/MonthOverview';
import WeeklyTrendChart from '@/components/dashboard/WeeklyTrendChart';
import TopCategoryBars from '@/components/dashboard/TopCategoryBars';
import BiggestExpenseCard from '@/components/dashboard/BiggestExpenseCard';
import TransferInfoCard from '@/components/dashboard/TransferInfoCard';
import SpendStrip from '@/components/dashboard/SpendStrip';
import SpendingHeatmap from '@/components/dashboard/SpendingHeatmap';
import ExpenseFeed from '@/components/dashboard/ExpenseFeed';
import DebtSummaryCard from '@/components/dashboard/DebtSummaryCard';
import RecurringPaymentsCard from '@/components/dashboard/RecurringPaymentsCard';
import SmartEntrySheet from '@/components/entry/SmartEntrySheet';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDateLabel(): string {
  return new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function DashboardScreen() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const greeting = useMemo(() => getGreeting(), []);
  const dateLabel = useMemo(() => getDateLabel(), []);
  const router = useRouter();

  return (
    <View className="flex-1 bg-ledge-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between gap-4 px-5 pb-3 pt-16">
          <View className="min-w-0 flex-1">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.4px] text-ledge-muted">
              {dateLabel}
            </Text>
            <Text className="mt-0.5 text-[20px] font-bold tracking-tight text-ledge-accent">{greeting}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-ledge-surface active:scale-90">
              <Bell size={18} weight="regular" color="#3f4946" />
            </Pressable>
            <Link href="/account" asChild>
              <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-ledge-surface2 active:scale-90">
                <UserCircle size={17} weight="fill" color="#1f695d" />
              </Pressable>
            </Link>
          </View>
        </View>

        {/* Coach line */}
        <View className="px-5 pb-4">
          <CoachLine />
        </View>

        {/* Body — single column (hero → overview → top spending → today → activity) */}
        <Animated.View entering={FadeIn.duration(220)} className="gap-3 px-5">
          {/* Hero balance card */}
          <View
            className="relative overflow-hidden rounded-[28px] p-6"
            style={{
              backgroundColor: '#00352e',
              shadowColor: '#002820',
              shadowOpacity: 0.28,
              shadowRadius: 24,
              elevation: 6,
            }}
          >
            <View className="relative z-10 flex-row items-stretch justify-between gap-4">
              <View className="min-w-0 flex-1">
                <BalanceMetric />

                <Pressable
                  onPress={() => setSheetOpen(true)}
                  className="mt-5 flex-row items-center self-start gap-2 rounded-full px-4 py-2 active:opacity-80"
                  style={{ backgroundColor: 'rgba(255,255,255,0.11)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}
                >
                  <Sparkle size={13} weight="fill" color="#ffffff" />
                  <Text className="text-[12px] font-semibold tracking-wide text-white">Smart Entry</Text>
                </Pressable>
              </View>

              <HeroSideStats />
            </View>
          </View>

          {/* This month overview */}
          <MonthOverview />

          {/* 7-day spending trend */}
          <WeeklyTrendChart />

          {/* Top spending categories */}
          <TopCategoryBars />

          {/* Biggest expense + transfers explainer */}
          <View className="flex-row gap-3">
            <BiggestExpenseCard />
            <TransferInfoCard />
          </View>

          {/* Today */}
          <SpendStrip />

          {/* Spending calendar */}
          <SpendingHeatmap
            onAddForDate={() => setSheetOpen(true)}
            onViewDate={(iso) => router.push({ pathname: '/ledger', params: { date: iso } })}
          />

          {/* Recent activity */}
          <ExpenseFeed />

          {/* Debts snapshot */}
          <DebtSummaryCard />

          {/* Recurring bills */}
          <RecurringPaymentsCard />
        </Animated.View>
      </ScrollView>

      <SmartEntrySheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </View>
  );
}
