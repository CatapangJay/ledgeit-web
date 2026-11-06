import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ArrowBendDownRight, ArrowBendUpLeft, ArrowCounterClockwise, Check, Wallet as WalletIcon, type Icon } from 'phosphor-react-native';
import { formatCurrency, type BudgetCarryover, type Wallet } from '@ledgeit/core';
import { getIconComponent } from '@/lib/iconMap';
import { useStore } from '@/lib/store';

function shortMonth(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' });
}

/**
 * Always-visible indicators on a Budget Flow row: money that left this
 * category's month (into a wallet or the next month's budget) and money that
 * was carried in from the month before.
 */
export function CarryoverBadges({ outgoing, incoming, wallets }: {
  /** Carryover recorded FROM the viewed month for this category, if any. */
  outgoing?: BudgetCarryover;
  /** Carryovers that landed IN the viewed month's budget for this category. */
  incoming: BudgetCarryover[];
  wallets: Wallet[];
}) {
  if (!outgoing && incoming.length === 0) return null;

  const pills: { key: string; icon: Icon; text: string; gain: boolean }[] = [];

  if (outgoing) {
    const amt = formatCurrency(Math.abs(outgoing.amount));
    const gain = outgoing.amount > 0;
    if (outgoing.destination === 'wallet') {
      const name = wallets.find((w) => w.id === outgoing.walletId)?.name ?? 'a wallet';
      pills.push({ key: outgoing.id, icon: WalletIcon, text: gain ? `${amt} moved to ${name}` : `${amt} overage covered by ${name}`, gain });
    } else {
      const to = shortMonth(outgoing.toMonth);
      pills.push({ key: outgoing.id, icon: ArrowBendDownRight, text: gain ? `${amt} carried over to ${to}` : `${amt} overage taken from ${to}`, gain });
    }
  }

  for (const c of incoming) {
    const amt = formatCurrency(Math.abs(c.amount));
    const from = shortMonth(c.fromMonth);
    const gain = c.amount > 0;
    pills.push({ key: c.id, icon: ArrowBendUpLeft, text: gain ? `+${amt} carried in from ${from}` : `−${amt} ${from} overage deducted`, gain });
  }

  return (
    <View className="mt-2 flex-row flex-wrap gap-1.5">
      {pills.map(({ key, icon: PillIcon, text, gain }) => {
        const color = gain ? '#1f6950' : '#ba1a1a';
        return (
          <View
            key={key}
            className="flex-row items-center gap-1 rounded-full px-2 py-0.5"
            style={{ backgroundColor: gain ? 'rgba(31,105,80,0.09)' : 'rgba(186,26,26,0.08)' }}
          >
            <PillIcon size={11} weight="bold" color={color} />
            <Text className="text-[10.5px] font-semibold" style={{ color }}>{text}</Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Inside an expanded past-month Budget Flow row: move the category's leftover
 * into a wallet, or — for last month only — carry it into the current month's
 * budget. Shows the applied state with an Undo once handled.
 */
export function CarryoverAction({ categoryId, categoryLabel, fromMonth, leftover, allowBudget, applied }: {
  categoryId: string;
  categoryLabel: string;
  fromMonth: string;
  /** Positive leftover (limit − spent) for the month. */
  leftover: number;
  /** Last month only: offer carrying into the current month's budget. */
  allowBudget: boolean;
  applied?: BudgetCarryover;
}) {
  const storeWallets = useStore((s) => s.wallets);
  const applyCarryover = useStore((s) => s.applyCarryover);
  const removeCarryover = useStore((s) => s.removeCarryover);
  const wallets = storeWallets.filter((w) => !w.isArchived);

  const [mode, setMode] = useState<'category' | 'wallet'>(allowBudget ? 'category' : 'wallet');
  const [walletId, setWalletId] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  const boxStyle = { backgroundColor: '#f0f4f2', borderWidth: 1, borderColor: '#e7edeb' };

  if (applied) {
    const dest = applied.destination === 'wallet'
      ? storeWallets.find((w) => w.id === applied.walletId)?.name ?? 'a wallet'
      : `${shortMonth(applied.toMonth)} budget`;
    return (
      <View className="mb-3 flex-row items-center justify-between gap-2 rounded-xl p-2.5" style={boxStyle}>
        <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
          <Check size={12} weight="bold" color="#1f6950" />
          <Text className="flex-1 text-[11.5px] font-semibold" numberOfLines={1} style={{ color: '#1f6950' }}>
            {formatCurrency(Math.abs(applied.amount))} → {dest}
          </Text>
        </View>
        <Pressable
          onPress={() => run(() => removeCarryover(applied.id))}
          disabled={busy}
          className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
          style={{ backgroundColor: '#ffffff', opacity: busy ? 0.4 : 1 }}
        >
          <ArrowCounterClockwise size={11} weight="bold" color="#3f4946" />
          <Text className="text-[11px] font-bold" style={{ color: '#3f4946' }}>Undo</Text>
        </Pressable>
      </View>
    );
  }

  const canWallet = wallets.length > 0;
  if (!allowBudget && !canWallet) {
    return (
      <Text className="mb-3 rounded-xl p-2.5 text-[11px]" style={{ ...boxStyle, color: '#6e9990' }}>
        {formatCurrency(leftover)} left over. Add a wallet to move it somewhere safe.
      </Text>
    );
  }

  const [y, m] = fromMonth.split('-').map(Number);
  const nextMonth = shortMonth(`${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}`);
  const ready = mode === 'category' || !!walletId;
  const disabled = busy || !ready;

  return (
    <View className="mb-3 rounded-xl p-2.5" style={boxStyle}>
      <Text className="mb-2 text-[11.5px] font-semibold" style={{ color: '#191c1c' }}>
        {formatCurrency(leftover)} left over
        <Text className="font-medium" style={{ color: '#6e9990' }}>
          {allowBudget ? ` — carry it into ${nextMonth} or stash it in a wallet.` : ' — move it into a wallet.'}
        </Text>
      </Text>

      {allowBudget && canWallet && (
        <View className="mb-2 flex-row gap-0.5 rounded-lg p-0.5" style={{ backgroundColor: '#ffffff' }}>
          {([
            { id: 'category' as const, icon: ArrowBendDownRight, label: `${nextMonth} budget` },
            { id: 'wallet' as const, icon: WalletIcon, label: 'Wallet' },
          ]).map(({ id, icon: ModeIcon, label }) => {
            const active = mode === id;
            const color = active ? '#ffffff' : '#6e9990';
            return (
              <Pressable
                key={id}
                onPress={() => setMode(id)}
                className="flex-1 flex-row items-center justify-center gap-1 rounded-md py-1.5"
                style={{ backgroundColor: active ? '#1f695d' : 'transparent' }}
              >
                <ModeIcon size={12} weight="bold" color={color} />
                <Text className="text-[11px] font-bold" style={{ color }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {mode === 'wallet' && canWallet && (
        <View className="mb-2 flex-row flex-wrap">
          {wallets.map((w) => {
            const WIcon = getIconComponent(w.icon);
            const active = w.id === walletId;
            const color = active ? '#ffffff' : '#3f4946';
            return (
              <View key={w.id} style={{ width: '50%' }} className="p-0.5">
                <Pressable
                  onPress={() => setWalletId(w.id)}
                  className="flex-row items-center justify-center gap-1.5 rounded-xl px-2 py-2"
                  style={{ backgroundColor: active ? '#1f695d' : '#ffffff' }}
                >
                  <WIcon size={13} weight={active ? 'fill' : 'regular'} color={color} />
                  <Text className="text-[11px] font-semibold" numberOfLines={1} style={{ color }}>{w.name}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <Pressable
        disabled={disabled}
        onPress={() => run(() => applyCarryover({
          categoryId,
          categoryLabel,
          fromMonth,
          amount: leftover,
          destination: mode,
          walletId: mode === 'wallet' ? walletId : undefined,
        }))}
        className="flex-row items-center justify-center gap-1.5 rounded-xl py-2"
        style={{ backgroundColor: '#1f695d', opacity: disabled ? 0.4 : 1 }}
      >
        {mode === 'wallet'
          ? <WalletIcon size={13} weight="bold" color="#ffffff" />
          : <ArrowBendDownRight size={13} weight="bold" color="#ffffff" />}
        <Text className="text-[12px] font-bold text-white">
          {busy ? 'Moving…' : mode === 'wallet' ? `Move ${formatCurrency(leftover)} to wallet` : `Carry ${formatCurrency(leftover)} to ${nextMonth}`}
        </Text>
      </Pressable>
    </View>
  );
}
