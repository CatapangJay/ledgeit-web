import { useMemo, useState } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Bell, Sparkle, UserCircle } from 'phosphor-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useDeferredMount } from '@/lib/useDeferredMount';
import { SkeletonCard } from '@/components/ui/Skeleton';

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
import WalletSummaryCard from '@/components/dashboard/WalletSummaryCard';
import RecurringPaymentsCard from '@/components/dashboard/RecurringPaymentsCard';
import SmartEntrySheet from '@/components/entry/SmartEntrySheet';
import OnboardingBudgetSetup from '@/components/budget/OnboardingBudgetSetup';

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
  const [entryDate, setEntryDate] = useState<string | undefined>(undefined);
  const greeting = useMemo(() => getGreeting(), []);
  const dateLabel = useMemo(() => getDateLabel(), []);
  const router = useRouter();
  // Paint the header + hero immediately; mount the heavy card stack one frame
  // later (after the nav transition) so navigation feels instant.
  const contentReady = useDeferredMount();

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
            <View className="relative z-10">
              {/* Balance + income/expense pills */}
              <BalanceMetric />

              {/* Divider */}
              <View className="my-4 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }} />

              {/* Secondary stats — even horizontal row */}
              <HeroSideStats />

              {/* Smart Entry — full-width primary action */}
              <Pressable
                onPress={() => {
                  setEntryDate(undefined);
                  setSheetOpen(true);
                }}
                className="mt-5 flex-row items-center justify-center gap-2 rounded-full py-3 active:opacity-80"
                style={{ backgroundColor: 'rgba(255,255,255,0.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
              >
                <Sparkle size={14} weight="fill" color="#ffffff" />
                <Text className="text-[13px] font-semibold tracking-wide text-white">Smart Entry</Text>
              </Pressable>
            </View>
          </View>

          {!contentReady ? (
            /* Lightweight placeholders while the heavy cards mount a frame later */
            <>
              <SkeletonCard height={150} />
              <SkeletonCard height={120} />
              <SkeletonCard height={110} />
            </>
          ) : (
            <>
              {/* This month overview */}
              <MonthOverview />

              {/* 7-day spending trend */}
              <WeeklyTrendChart />

              {/* Top spending categories */}
              <TopCategoryBars />

              {/* Biggest expense — own row (highlights group) */}
              <View className="mt-3">
                <BiggestExpenseCard />
              </View>

              {/* Transfers — own row */}
              <TransferInfoCard />

              {/* Today (daily group) */}
              <View className="mt-3">
                <SpendStrip />
              </View>

              {/* Spending calendar */}
              <SpendingHeatmap
                onAddForDate={(iso) => {
                  setEntryDate(iso);
                  setSheetOpen(true);
                }}
                onViewDate={(iso) => router.push({ pathname: '/ledger', params: { date: iso } })}
              />

              {/* Recent activity */}
              <ExpenseFeed />

              {/* Debts snapshot (accounts group) */}
              <View className="mt-3">
                <DebtSummaryCard />
              </View>

              {/* Wallets — total set aside + top wallets (self-hides when empty) */}
              <WalletSummaryCard />

              {/* Recurring bills */}
              <RecurringPaymentsCard />
            </>
          )}
        </Animated.View>
      </ScrollView>

      <SmartEntrySheet open={sheetOpen} onClose={() => setSheetOpen(false)} initialDate={entryDate} />
      <OnboardingBudgetSetup />
    </View>
  );
}
