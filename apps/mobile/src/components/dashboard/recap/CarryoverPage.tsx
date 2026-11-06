import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowBendDownRight, Check, Wallet as WalletIcon, ArrowCounterClockwise, CaretDown, ArrowLeft, ArrowRight,
} from 'phosphor-react-native';
import { formatCurrencyCompact } from '@ledgeit/core';
import { useStore } from '@/lib/store';
import type { MonthlyRecap, RecapCarryoverCandidate } from '@/lib/monthlyRecap';
import { C, F, INK, INK_DIM, INK_HAIRLINE, TABULAR, catHex, nextMonthName } from './theme';
import { CategoryGlyph, PageFrame, Reveal, T } from './parts';

// ─── Carry-over — roll leftovers / overages into next month ─────────────────────
// Each budgeted category ended either UNDER its limit (a leftover) or OVER it (an
// overage). Per category the user decides whether to carry that balance into the
// coming month: into next month's category budget, or into/out of a wallet. Each
// choice logs a `transfer` — tracked in history, excluded from next month's totals.
// The rows sit on a light panel so they keep the recap's original card styling.

const CTA_COLORS = ['#1f695d', '#00352e'] as const;

function carryoverRowLabel(nextMonth: string, delta: number): string {
  return delta > 0 ? `Top up ${nextMonth}` : `Reduce ${nextMonth}`;
}

function CarryoverRow({ candidate, nextMonth, applied, wallets, onApply, onUndo }: {
  candidate: RecapCarryoverCandidate;
  nextMonth: string;
  applied: { destination: 'category' | 'wallet'; walletId?: string; amount: number } | null;
  wallets: { id: string; name: string }[];
  onApply: (dest: 'category' | 'wallet', walletId?: string) => Promise<void>;
  onUndo: () => Promise<void>;
}) {
  const hex = catHex(candidate.category.id);
  const isLeftover = candidate.delta > 0;
  const magnitude = Math.abs(candidate.delta);

  // A leftover DEPOSITS into the wallet; an overage WITHDRAWS from it — both are
  // valid, so the toggle shows whenever a wallet exists.
  const canChooseWallet = wallets.length > 0;
  const [destMode, setDestMode] = useState<'category' | 'wallet'>('category');
  const [walletPick, setWalletChoice] = useState<string>(wallets[0]?.id ?? '');
  // Fall back to the first open wallet if the picked one was deleted/archived (or
  // none existed when this row mounted), so Carry never targets a stale id.
  const walletChoice = wallets.some((w) => w.id === walletPick) ? walletPick : wallets[0]?.id ?? '';
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const appliedDestLabel = applied
    ? applied.destination === 'wallet'
      ? wallets.find((w) => w.id === applied.walletId)?.name ?? 'a wallet'
      : `${nextMonth} budget`
    : null;

  const useWallet = destMode === 'wallet' && canChooseWallet;
  // Keyed off `useWallet` so the row isn't stuck disabled if every wallet
  // disappears while "Account" is selected (the toggle is hidden then).
  const carryDisabled = busy || (useWallet && !walletChoice);

  // Card tints to the category's own colour so each card is scannable at a glance.
  return (
    <View className="gap-2.5 rounded-2xl p-3" style={{ backgroundColor: `${hex}14`, borderWidth: 1, borderColor: `${hex}2e` }}>
      {/* Header — icon, name, and the signed leftover/overage amount. */}
      <View className="flex-row items-center gap-2.5">
        <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${hex}26` }}>
          <CategoryGlyph name={candidate.category.icon} size={17} weight="fill" color={hex} />
        </View>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 14, color: C.numberInk }}>{candidate.category.label}</Text>
          <Text numberOfLines={1} style={[{ fontFamily: F.medium, fontSize: 12, color: C.labelInk }, TABULAR]}>
            {isLeftover ? 'Under' : 'Over'} · {formatCurrencyCompact(candidate.spent)}/{formatCurrencyCompact(candidate.limit)}
          </Text>
        </View>
        <Text style={[{ fontFamily: F.mono, fontSize: 15, color: isLeftover ? C.gainInk : C.dangerInk }, TABULAR]}>
          {isLeftover ? '+' : '−'}{formatCurrencyCompact(magnitude)}
        </Text>
      </View>

      {applied ? (
        <View className="flex-row items-center justify-between gap-2 rounded-xl pl-3 pr-1" style={{ minHeight: 48, backgroundColor: 'rgba(255,255,255,0.72)' }}>
          <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
            <Check size={14} weight="bold" color={C.gainInk} />
            <Text numberOfLines={1} className="min-w-0 flex-1" style={{ fontFamily: F.semibold, fontSize: 13, color: C.gainInk }}>
              {applied.amount > 0 ? '→ ' : '← '}{appliedDestLabel}
            </Text>
          </View>
          <Pressable
            onPress={() => run(onUndo)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Undo ${candidate.category.label} carry over`}
            className="flex-row items-center gap-1.5 rounded-full px-3.5 active:opacity-80"
            style={{ minHeight: 44, backgroundColor: 'rgba(0,53,46,0.06)', opacity: busy ? 0.4 : 1 }}
          >
            <ArrowCounterClockwise size={13} weight="bold" color={C.bodyInk} />
            <Text style={{ fontFamily: F.display, fontSize: 13, color: C.bodyInk }}>Undo</Text>
          </Pressable>
        </View>
      ) : (
        <View className="gap-2">
          {/* Destination toggle — budget vs. a wallet. */}
          {canChooseWallet && (
            <View className="flex-row gap-0.5 rounded-xl p-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(0,53,46,0.08)' }}>
              {([
                { mode: 'category' as const, icon: ArrowBendDownRight, label: 'Budget' },
                { mode: 'wallet' as const, icon: WalletIcon, label: 'Account' },
              ]).map(({ mode, icon: TabIcon, label }) => {
                const active = destMode === mode;
                return (
                  <Pressable
                    key={mode}
                    onPress={() => {
                      setDestMode(mode);
                      setPickerOpen(false);
                    }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Carry ${candidate.category.label} into ${label === 'Budget' ? `${nextMonth} budget` : 'an account'}`}
                    className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg"
                    style={active
                      ? { minHeight: 44, backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 }
                      : { minHeight: 44, backgroundColor: 'transparent' }}
                  >
                    <TabIcon size={14} weight="bold" color={active ? C.forest : C.labelInk} />
                    <Text style={{ fontFamily: F.display, fontSize: 13, color: active ? C.forest : C.labelInk }}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <View className="flex-row items-center gap-2">
            {/* Target label (budget) or wallet picker trigger (account). */}
            {useWallet ? (
              <WalletPickerTrigger
                wallets={wallets}
                value={walletChoice}
                open={pickerOpen}
                onToggle={() => setPickerOpen((o) => !o)}
                categoryLabel={candidate.category.label}
              />
            ) : (
              <View className="min-w-0 flex-1 justify-center rounded-xl px-3" style={{ minHeight: 44, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(0,53,46,0.08)' }}>
                <Text numberOfLines={1} style={{ fontFamily: F.semibold, fontSize: 13, color: C.bodyInk }}>
                  {carryoverRowLabel(nextMonth, candidate.delta)}
                </Text>
              </View>
            )}
            <Pressable
              onPress={() => run(() => (useWallet ? onApply('wallet', walletChoice) : onApply('category')))}
              disabled={carryDisabled}
              accessibilityRole="button"
              accessibilityLabel={`Carry ${candidate.category.label} over`}
              className="flex-row items-center gap-1.5 overflow-hidden rounded-xl px-4 active:opacity-90"
              style={{ minHeight: 44, opacity: carryDisabled ? 0.4 : 1 }}
            >
              <LinearGradient colors={CTA_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              {useWallet
                ? <WalletIcon size={14} weight="bold" color="#ffffff" />
                : <ArrowBendDownRight size={14} weight="bold" color="#ffffff" />}
              <Text style={{ fontFamily: F.display, fontSize: 13.5, color: '#ffffff' }}>{busy ? '…' : 'Carry'}</Text>
            </Pressable>
          </View>

          {useWallet && pickerOpen && (
            <WalletPickerList
              wallets={wallets}
              value={walletChoice}
              onChange={(id) => {
                setWalletChoice(id);
                setPickerOpen(false);
              }}
            />
          )}
        </View>
      )}
    </View>
  );
}

// ─── Wallet picker ───────────────────────────────────────────────────────────
// A compact trigger that expands an inline list of the user's wallets. An inline
// list (rather than a popover) avoids cross-card z-index clipping on RN.
function WalletPickerTrigger({ wallets, value, open, onToggle, categoryLabel }: {
  wallets: { id: string; name: string }[];
  value: string;
  open: boolean;
  onToggle: () => void;
  categoryLabel: string;
}) {
  const selected = wallets.find((w) => w.id === value) ?? wallets[0];
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={`Which account to carry ${categoryLabel} into`}
      accessibilityState={{ expanded: open }}
      className="min-w-0 flex-1 flex-row items-center gap-2 rounded-xl pl-3 pr-2.5"
      style={{ minHeight: 44, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(0,53,46,0.08)' }}
    >
      <WalletIcon size={14} weight="bold" color={C.gainInk} />
      <Text numberOfLines={1} className="min-w-0 flex-1" style={{ fontFamily: F.semibold, fontSize: 13, color: C.bodyInk }}>
        {selected?.name ?? 'Select'}
      </Text>
      <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
        <CaretDown size={12} weight="bold" color={C.labelInk} />
      </View>
    </Pressable>
  );
}

function WalletPickerList({ wallets, value, onChange }: {
  wallets: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(140)}
      className="rounded-xl p-1"
      style={{
        maxHeight: 200,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: 'rgba(0,53,46,0.08)',
        shadowColor: '#00352e',
        shadowOpacity: 0.16,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
      }}
    >
      <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
        {wallets.map((w) => {
          const active = w.id === value;
          return (
            <Pressable
              key={w.id}
              onPress={() => onChange(w.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className="flex-row items-center gap-2 rounded-lg px-3 active:opacity-80"
              style={{ minHeight: 44, backgroundColor: active ? 'rgba(14,122,90,0.1)' : 'transparent' }}
            >
              <Text numberOfLines={1} className="min-w-0 flex-1" style={{ fontFamily: F.semibold, fontSize: 13, color: active ? C.gainInk : C.bodyInk }}>
                {w.name}
              </Text>
              {active && <Check size={14} weight="bold" color={C.gainInk} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

// ─── Carry-over page ─────────────────────────────────────────────────────────
// The one interactive story page: no auto-advance and no tap zones, so it gets
// explicit Back / Continue buttons and its own scroll.
export default function CarryoverPage({ recap, bg, animateIt, onBack, onNext }: {
  recap: MonthlyRecap; bg: string; animateIt: boolean; onBack: () => void; onNext: () => void;
}) {
  const storeWallets = useStore((s) => s.wallets);
  const carryovers = useStore((s) => s.budgetCarryovers);
  const applyCarryover = useStore((s) => s.applyCarryover);
  const removeCarryover = useStore((s) => s.removeCarryover);

  const nextMonth = nextMonthName(recap.monthKey);
  const activeWallets = useMemo(
    () => storeWallets.filter((w) => !w.isArchived).map((w) => ({ id: w.id, name: w.name })),
    [storeWallets],
  );

  // Carryovers already recorded for the month being recapped, keyed by category.
  const appliedByCat = useMemo(() => {
    const map: Record<string, { id: string; destination: 'category' | 'wallet'; walletId?: string; amount: number }> = {};
    for (const c of carryovers) {
      if (c.fromMonth === recap.monthKey) {
        map[c.categoryId] = { id: c.id, destination: c.destination, walletId: c.walletId, amount: c.amount };
      }
    }
    return map;
  }, [carryovers, recap.monthKey]);

  // Under / over counts and totals for the header summary.
  const { underCount, overCount, leftoverTotal, overageTotal } = useMemo(() => {
    let under = 0, over = 0, leftover = 0, overage = 0;
    for (const c of recap.carryoverCandidates) {
      if (c.delta > 0) {
        under++;
        leftover += c.delta;
      } else {
        over++;
        overage += Math.abs(c.delta);
      }
    }
    return { underCount: under, overCount: over, leftoverTotal: leftover, overageTotal: overage };
  }, [recap.carryoverCandidates]);

  const total = recap.carryoverCandidates.length;
  const carriedCount = recap.carryoverCandidates.filter((c) => appliedByCat[c.category.id]).length;

  return (
    <PageFrame bg={bg} eyebrow={`Carry over · ${carriedCount} of ${total} done`} label={recap.label} align="top" animateIt={animateIt}>
      <Reveal animateIt={animateIt} delay={60}>
        <Text style={{ fontFamily: F.display, fontSize: 34, lineHeight: 38, letterSpacing: -1, color: INK, marginTop: 8 }}>
          Roll it into {nextMonth}.
        </Text>
      </Reveal>
      <Reveal animateIt={animateIt} delay={160}>
        <Text style={[T.context, { fontSize: 14, lineHeight: 21, marginTop: 10 }]}>
          Carried amounts adjust {nextMonth}&apos;s budget (or move into an account) and are logged as transfers — they won&apos;t count as {nextMonth} spending.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4, marginTop: 12 }}>
          {underCount > 0 && (
            <Text style={[{ fontFamily: F.semibold, fontSize: 13, color: INK }, TABULAR]}>
              {underCount} under · <Text style={{ fontFamily: F.mono }}>+{formatCurrencyCompact(leftoverTotal)}</Text>
            </Text>
          )}
          {overCount > 0 && (
            <Text style={[{ fontFamily: F.semibold, fontSize: 13, color: INK }, TABULAR]}>
              {overCount} over · <Text style={{ fontFamily: F.mono }}>−{formatCurrencyCompact(overageTotal)}</Text>
            </Text>
          )}
        </View>
      </Reveal>

      <Reveal animateIt={animateIt} delay={260} style={{ flex: 1, marginTop: 16, marginHorizontal: -12 }}>
        <ScrollView
          style={{ flex: 1, borderRadius: 24, backgroundColor: C.panel }}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          showsVerticalScrollIndicator={false}
        >
          {recap.carryoverCandidates.map((candidate) => {
            const applied = appliedByCat[candidate.category.id] ?? null;
            return (
              <CarryoverRow
                key={candidate.category.id}
                candidate={candidate}
                nextMonth={nextMonth}
                applied={applied}
                wallets={activeWallets}
                onApply={async (dest, walletId) => {
                  await applyCarryover({
                    categoryId: candidate.category.id,
                    categoryLabel: candidate.category.label,
                    fromMonth: recap.monthKey,
                    amount: candidate.delta,
                    destination: dest,
                    walletId,
                  });
                }}
                onUndo={async () => {
                  if (applied) await removeCarryover(applied.id);
                }}
              />
            );
          })}
        </ScrollView>
      </Reveal>

      {/* Explicit navigation — this page has no tap zones. */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Previous page"
          className="flex-row items-center justify-center gap-1.5 rounded-2xl px-5 active:opacity-80"
          style={{ minHeight: 52, borderWidth: 1, borderColor: INK_HAIRLINE }}
        >
          <ArrowLeft size={16} weight="bold" color={INK} />
          <Text style={{ fontFamily: F.display, fontSize: 14, color: INK }}>Back</Text>
        </Pressable>
        <Pressable
          onPress={onNext}
          accessibilityRole="button"
          accessibilityLabel={carriedCount >= total ? 'Continue to summary' : 'Skip the rest and continue to summary'}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl active:scale-[0.97]"
          style={{ minHeight: 52, backgroundColor: INK }}
        >
          <Text style={{ fontFamily: F.display, fontSize: 15, color: C.forest }}>
            {carriedCount > 0 ? 'Continue' : 'Decide later'}
          </Text>
          <ArrowRight size={16} weight="bold" color={C.forest} />
        </Pressable>
      </View>
      <Text style={{ fontFamily: F.medium, fontSize: 12, color: INK_DIM, marginTop: 10, textAlign: 'center' }}>
        Carrying over is optional — you can undo any row.
      </Text>
    </PageFrame>
  );
}
