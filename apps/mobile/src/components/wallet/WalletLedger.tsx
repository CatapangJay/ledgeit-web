import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import {
  Plus,
  Trash,
  Wallet as WalletIcon,
  ArrowDown,
  ArrowUp,
  PencilSimple,
  Archive,
  ArrowCounterClockwise,
  CaretDown,
  LinkSimple,
  Pencil,
  X,
} from 'phosphor-react-native';
import {
  WALLET_KINDS,
  formatCurrency,
  formatDate,
  walletBalance,
  walletGoalProgress,
  type Wallet,
  type WalletKind,
  type WalletMovement,
  type WalletMovementType,
} from '@ledgeit/core';
import { getIconComponent } from '@/lib/iconMap';
import { walletAccent } from '@/lib/walletColors';
import { useStore } from '@/lib/store';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const accentFor = walletAccent;

/**
 * The full wallets UI (summary, list, add/edit form, per-wallet deposit/withdraw)
 * with no page chrome. Ported from the web WalletLedger: the add/edit view and
 * the move-money input become bottom sheets on mobile, while the movement
 * history stays an inline expandable panel per wallet row.
 */
export default function WalletLedger() {
  const wallets = useStore((s) => s.wallets);
  const addWallet = useStore((s) => s.addWallet);
  const updateWallet = useStore((s) => s.updateWallet);
  const recordWalletMovement = useStore((s) => s.recordWalletMovement);
  const removeWalletMovement = useStore((s) => s.removeWalletMovement);
  const toggleWalletArchived = useStore((s) => s.toggleWalletArchived);
  const removeWallet = useStore((s) => s.removeWallet);

  // Set while editing an existing wallet; null when creating a new one.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  // Add/edit-wallet form state
  const [name, setName] = useState('');
  const [kind, setKind] = useState<WalletKind>('savings');
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [saving, setSaving] = useState(false);

  // Per-wallet movement input + delete confirm
  const [moveFor, setMoveFor] = useState<string | null>(null);
  const [moveType, setMoveType] = useState<WalletMovementType>('deposit');
  const [moveAmount, setMoveAmount] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  // Wallet whose movement history is expanded, plus which movement is pending delete.
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [movementDeleteConfirm, setMovementDeleteConfirm] = useState<string | null>(null);

  const formSheetRef = useRef<BottomSheet>(null);
  const moveSheetRef = useRef<BottomSheet>(null);
  const formSnapPoints = useMemo(() => ['88%'], []);
  const moveSnapPoints = useMemo(() => ['52%'], []);

  useEffect(() => {
    if (formOpen) formSheetRef.current?.expand();
    else formSheetRef.current?.close();
  }, [formOpen]);

  useEffect(() => {
    if (moveFor) moveSheetRef.current?.expand();
    else moveSheetRef.current?.close();
  }, [moveFor]);

  const { active, archived, totalStashed } = useMemo(() => {
    const active = wallets.filter((w) => !w.isArchived);
    const archived = wallets.filter((w) => w.isArchived);
    const totalStashed = active.reduce((s, w) => s + walletBalance(w), 0);
    return { active, archived, totalStashed };
  }, [wallets]);

  const moveWallet = moveFor ? wallets.find((w) => w.id === moveFor) ?? null : null;
  const nameValid = name.trim().length > 0;

  function openAdd() {
    setEditingId(null);
    setName('');
    setKind('savings');
    setTarget('');
    setNote('');
    setInitialAmount('');
    setFormOpen(true);
  }

  function openEdit(wallet: Wallet) {
    setEditingId(wallet.id);
    setName(wallet.name);
    setKind(wallet.kind);
    setTarget(wallet.target != null ? String(wallet.target) : '');
    setNote(wallet.note ?? '');
    setInitialAmount('');
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
  }

  async function handleSave() {
    if (!name.trim() || saving) return;
    const targetVal = parseFloat(target.replace(/[^0-9.]/g, '')) || 0;
    setSaving(true);
    if (editingId) {
      await updateWallet(editingId, {
        name: name.trim(),
        kind,
        target: targetVal > 0 ? targetVal : undefined,
        note: note.trim() || undefined,
      });
    } else {
      const initial = parseFloat(initialAmount.replace(/[^0-9.]/g, '')) || 0;
      await addWallet({
        name: name.trim(),
        kind,
        target: targetVal > 0 ? targetVal : undefined,
        note: note.trim() || undefined,
        initialAmount: initial > 0 ? initial : undefined,
        date: todayISO(),
      });
    }
    setSaving(false);
    closeForm();
  }

  function openMove(walletId: string) {
    setMoveType('deposit');
    setMoveAmount('');
    setMoveFor(walletId);
  }

  async function handleMove() {
    if (!moveFor) return;
    const amount = parseFloat(moveAmount.replace(/[^0-9.]/g, '')) || 0;
    if (amount <= 0) return;
    await recordWalletMovement(moveFor, { type: moveType, amount, date: todayISO() });
    setMoveFor(null);
    setMoveAmount('');
  }

  async function handleDelete(walletId: string) {
    if (deleteConfirm !== walletId) {
      setDeleteConfirm(walletId);
      return;
    }
    await removeWallet(walletId);
    setDeleteConfirm(null);
  }

  async function handleMovementDelete(walletId: string, movement: WalletMovement) {
    if (movementDeleteConfirm !== movement.id) {
      setMovementDeleteConfirm(movement.id);
      return;
    }
    await removeWalletMovement(walletId, movement.id);
    setMovementDeleteConfirm(null);
  }

  function WalletRow({ wallet }: { wallet: Wallet }) {
    const balance = walletBalance(wallet);
    const progress = walletGoalProgress(wallet);
    const accent = accentFor(wallet.color);
    const isDeletePending = deleteConfirm === wallet.id;
    const isHistoryOpen = historyFor === wallet.id;
    const movements = [...wallet.movements].reverse(); // newest first
    const KindIcon = getIconComponent(wallet.icon);

    return (
      <View
        className="mb-2 rounded-2xl px-4 py-3"
        style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.05, shadowRadius: 12, elevation: 1, opacity: wallet.isArchived ? 0.65 : 1 }}
      >
        <View className="flex-row items-center gap-3">
          <View className="h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}1a` }}>
            <KindIcon size={17} weight="fill" color={accent} />
          </View>
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="shrink text-sm font-semibold" style={{ color: '#191c1c' }} numberOfLines={1}>
                {wallet.name}
              </Text>
              {wallet.isArchived && (
                <Text className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ backgroundColor: '#e7edeb', color: '#6e9990' }}>
                  Archived
                </Text>
              )}
            </View>
            <Text className="mt-0.5 text-[11px]" style={{ color: '#6e9990' }}>
              {progress != null
                ? `${formatCurrency(balance)} of ${formatCurrency(wallet.target!)} · ${Math.round(progress * 100)}%`
                : formatCurrency(balance)}
              {wallet.note ? ` · ${wallet.note}` : ''}
            </Text>
            {wallet.movements.length > 0 && (
              <Pressable
                onPress={() => {
                  setHistoryFor(isHistoryOpen ? null : wallet.id);
                  setMovementDeleteConfirm(null);
                }}
                className="mt-1 flex-row items-center gap-1 active:opacity-70"
              >
                <Text className="text-[11px] font-semibold" style={{ color: accent }}>
                  {wallet.movements.length} {wallet.movements.length === 1 ? 'movement' : 'movements'}
                </Text>
                <CaretDown size={10} weight="bold" color={accent} style={{ transform: [{ rotate: isHistoryOpen ? '180deg' : '0deg' }] }} />
              </Pressable>
            )}
          </View>
          <View className="shrink-0 flex-row items-center gap-1">
            {!wallet.isArchived && (
              <Pressable
                onPress={() => openMove(wallet.id)}
                className="h-8 flex-row items-center gap-1 rounded-full px-2.5 active:opacity-80"
                style={{ backgroundColor: '#e7edeb' }}
              >
                <Plus size={11} weight="bold" color={accent} />
                <Text className="text-[11px] font-bold" style={{ color: accent }}>
                  Move
                </Text>
              </Pressable>
            )}
            <Pressable onPress={() => openEdit(wallet)} hitSlop={8} className="h-8 w-8 items-center justify-center rounded-full active:opacity-80" style={{ backgroundColor: '#e7edeb' }}>
              <PencilSimple size={13} weight="bold" color="#3f4946" />
            </Pressable>
            <Pressable
              onPress={() => toggleWalletArchived(wallet.id)}
              hitSlop={8}
              className="h-8 w-8 items-center justify-center rounded-full active:opacity-80"
              style={{ backgroundColor: '#e7edeb' }}
            >
              {wallet.isArchived ? (
                <ArrowCounterClockwise size={13} weight="bold" color="#1f6950" />
              ) : (
                <Archive size={13} weight="bold" color="#6e9990" />
              )}
            </Pressable>
            <Pressable
              onPress={() => handleDelete(wallet.id)}
              hitSlop={8}
              className="h-8 w-8 items-center justify-center rounded-full active:opacity-80"
              style={{ backgroundColor: isDeletePending ? '#ba1a1a' : '#e7edeb' }}
            >
              <Trash size={13} weight="bold" color={isDeletePending ? '#ffffff' : '#ba1a1a'} />
            </Pressable>
          </View>
        </View>

        {progress != null && !wallet.isArchived && (
          <View className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: '#eef2f1' }}>
            <View className="h-full rounded-full" style={{ width: `${progress * 100}%`, backgroundColor: accent }} />
          </View>
        )}

        {/* Movement history — each row tagged Manual vs Linked so it's clear
            whether the entry is a direct deposit/withdrawal or mirrors a real
            expense/income logged elsewhere. */}
        {isHistoryOpen && (
          <View className="mt-2.5 rounded-xl p-2" style={{ backgroundColor: '#f8faf9', borderWidth: 1, borderColor: '#eef2f1' }}>
            {movements.map((m) => {
              const isDeposit = m.type === 'deposit';
              const isLinked = m.source === 'linked';
              const pendingDelete = movementDeleteConfirm === m.id;
              return (
                <View key={m.id} className="flex-row items-center gap-2 rounded-lg px-2 py-1.5">
                  <View className="h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: isDeposit ? 'rgba(31,105,80,0.1)' : 'rgba(180,83,9,0.1)' }}>
                    {isDeposit ? <ArrowDown size={11} weight="bold" color="#1f6950" /> : <ArrowUp size={11} weight="bold" color="#b45309" />}
                  </View>
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-[12px] font-semibold" style={{ color: isDeposit ? '#1f6950' : '#b45309' }}>
                        {isDeposit ? '+' : '−'}
                        {formatCurrency(m.amount)}
                      </Text>
                      {/* Source tag */}
                      <View
                        className="flex-row items-center gap-0.5 rounded-full px-1.5 py-0.5"
                        style={isLinked ? { backgroundColor: 'rgba(31,105,93,0.1)' } : { backgroundColor: '#e7edeb' }}
                      >
                        {isLinked ? <LinkSimple size={8} weight="bold" color="#1f695d" /> : <Pencil size={8} weight="bold" color="#6e9990" />}
                        <Text className="text-[8px] font-bold uppercase tracking-wide" style={{ color: isLinked ? '#1f695d' : '#6e9990' }}>
                          {isLinked ? 'Linked' : 'Manual'}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-[10px]" style={{ color: '#6e9990' }}>
                      {formatDate(m.date)}
                      {m.note ? ` · ${m.note}` : ''}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleMovementDelete(wallet.id, m)}
                    hitSlop={10}
                    className="h-6 w-6 shrink-0 items-center justify-center rounded-full active:opacity-80"
                    style={{ backgroundColor: pendingDelete ? '#ba1a1a' : 'transparent' }}
                  >
                    <Trash size={11} weight="bold" color={pendingDelete ? '#ffffff' : '#6e9990'} />
                  </Pressable>
                </View>
              );
            })}
            {/* Explainer for the tags */}
            <View className="mt-1 px-2 pt-1.5" style={{ borderTopWidth: 1, borderTopColor: '#eef2f1' }}>
              <Text className="text-[10px] leading-relaxed" style={{ color: '#6e9990' }}>
                <Text className="font-bold">Linked</Text> movements mirror a real expense or income from your ledger — removing one here keeps that entry, it just stops counting toward this wallet. <Text className="font-bold">Manual</Text> ones are direct deposits/withdrawals.
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1">
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View className="mb-4 rounded-2xl px-4 py-3" style={{ backgroundColor: 'rgba(31,105,80,0.08)' }}>
          <Text className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#1f6950' }}>
            Total stashed away
          </Text>
          <Text className="mt-0.5 font-mono text-[19px] font-bold" style={{ color: '#00352e' }}>
            {formatCurrency(totalStashed)}
          </Text>
        </View>

        {wallets.length === 0 ? (
          <View className="items-center gap-2 py-14">
            <WalletIcon size={30} weight="duotone" color="#cde0db" />
            <Text className="text-sm font-medium" style={{ color: '#6e9990' }}>
              No wallets yet.
            </Text>
            <Text className="text-center text-xs" style={{ color: '#6e9990' }}>
              Create a savings, investment, or goal wallet to set money aside.
            </Text>
          </View>
        ) : (
          <>
            {active.map((w) => (
              <WalletRow key={w.id} wallet={w} />
            ))}
            {archived.length > 0 && (
              <>
                <Text className="mb-2 mt-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
                  Archived
                </Text>
                {archived.map((w) => (
                  <WalletRow key={w.id} wallet={w} />
                ))}
              </>
            )}
          </>
        )}

        <Pressable
          onPress={openAdd}
          className="mt-2 w-full flex-row items-center justify-center gap-2 rounded-2xl py-3 active:opacity-70"
          style={{ borderWidth: 1.5, borderColor: '#cde0db', borderStyle: 'dashed' }}
        >
          <Plus size={14} weight="bold" color="#1f695d" />
          <Text className="text-sm font-semibold" style={{ color: '#1f695d' }}>
            New Wallet
          </Text>
        </Pressable>
      </ScrollView>

      {/* ── Add / edit wallet sheet ─────────────────────────────────────────── */}
      <BottomSheet
        ref={formSheetRef}
        index={-1}
        snapPoints={formSnapPoints}
        enablePanDownToClose
        onClose={closeForm}
        backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />}
        backgroundStyle={{ backgroundColor: '#f8faf9' }}
        handleIndicatorStyle={{ backgroundColor: '#cde0db' }}
      >
        <View className="flex-row items-center justify-between px-5 pb-3" style={{ borderBottomWidth: 1, borderBottomColor: '#e7edeb' }}>
          <Text className="text-[15px] font-bold" style={{ color: '#00352e' }}>
            {editingId ? 'Edit Wallet' : 'New Wallet'}
          </Text>
          <Pressable onPress={closeForm} className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: '#f0f4f2' }}>
            <X size={14} weight="bold" color="#3f4946" />
          </Pressable>
        </View>

        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 24 }}>
          {/* Kind picker */}
          <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
            Type
          </Text>
          <View className="mb-4 flex-row flex-wrap">
            {WALLET_KINDS.map((k) => {
              const KindIcon = getIconComponent(k.icon);
              const isSel = kind === k.id;
              const accent = accentFor(k.color);
              return (
                <View key={k.id} style={{ width: '33.333%' }} className="p-1">
                  <Pressable
                    onPress={() => setKind(k.id)}
                    className="items-center gap-1 rounded-xl py-2.5"
                    style={{ backgroundColor: isSel ? `${accent}14` : '#f0f4f2', borderWidth: 1.5, borderColor: isSel ? accent : 'transparent' }}
                  >
                    <KindIcon size={18} weight={isSel ? 'fill' : 'regular'} color={isSel ? accent : '#6e9990'} />
                    <Text className="text-[10px] font-bold" style={{ color: isSel ? accent : '#6e9990' }}>
                      {k.label}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* Name */}
          <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
            Name
          </Text>
          <BottomSheetTextInput
            value={name}
            onChangeText={setName}
            maxLength={40}
            placeholder="E.g. Emergency Fund"
            className="mb-4 rounded-xl px-4 py-3 text-sm font-semibold"
            style={{ backgroundColor: '#f0f4f2', color: '#191c1c' }}
          />

          {/* Goal */}
          <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
            Goal (optional)
          </Text>
          <View className="mb-4 flex-row items-center gap-2 rounded-xl px-4 py-3" style={{ backgroundColor: '#f0f4f2' }}>
            <Text className="font-mono text-sm font-semibold" style={{ color: '#6e9990' }}>
              ₱
            </Text>
            <BottomSheetTextInput
              value={target}
              onChangeText={setTarget}
              keyboardType="decimal-pad"
              placeholder="Target amount to reach"
              className="flex-1 font-mono text-sm font-semibold"
              style={{ color: '#191c1c', paddingVertical: 0 }}
            />
          </View>

          {/* Opening balance — only when creating a new wallet */}
          {!editingId && (
            <>
              <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
                Opening balance (optional)
              </Text>
              <View className="mb-4 flex-row items-center gap-2 rounded-xl px-4 py-3" style={{ backgroundColor: '#f0f4f2' }}>
                <Text className="font-mono text-sm font-semibold" style={{ color: '#6e9990' }}>
                  ₱
                </Text>
                <BottomSheetTextInput
                  value={initialAmount}
                  onChangeText={setInitialAmount}
                  keyboardType="decimal-pad"
                  placeholder="How much is already in it"
                  className="flex-1 font-mono text-sm font-semibold"
                  style={{ color: '#191c1c', paddingVertical: 0 }}
                />
              </View>
            </>
          )}

          {/* Note */}
          <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
            Note (optional)
          </Text>
          <BottomSheetTextInput
            value={note}
            onChangeText={setNote}
            maxLength={60}
            placeholder="E.g. house downpayment"
            className="rounded-xl px-4 py-3 text-sm font-semibold"
            style={{ backgroundColor: '#f0f4f2', color: '#191c1c' }}
          />

          <Text className="mt-4 text-[11px] leading-relaxed" style={{ color: '#6e9990' }}>
            Money you deposit into or withdraw from a wallet is logged as a transfer between your own pockets, so it never counts as spending or income. Set a goal to track progress.
          </Text>
        </BottomSheetScrollView>

        {/* Footer */}
        <View className="flex-row items-center gap-3 px-5 pb-6 pt-3" style={{ borderTopWidth: 1, borderTopColor: '#e7edeb' }}>
          <Pressable onPress={closeForm} className="h-11 flex-1 items-center justify-center rounded-2xl" style={{ backgroundColor: '#f0f4f2' }}>
            <Text className="text-sm font-semibold" style={{ color: '#3f4946' }}>
              Cancel
            </Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={!nameValid || saving}
            className="h-11 flex-1 items-center justify-center rounded-2xl"
            style={{ backgroundColor: '#1f695d', opacity: !nameValid || saving ? 0.4 : 1 }}
          >
            <Text className="text-sm font-bold text-white">{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Wallet'}</Text>
          </Pressable>
        </View>
      </BottomSheet>

      {/* ── Deposit / withdraw movement sheet ───────────────────────────────── */}
      <BottomSheet
        ref={moveSheetRef}
        index={-1}
        snapPoints={moveSnapPoints}
        enablePanDownToClose
        onClose={() => setMoveFor(null)}
        backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />}
        backgroundStyle={{ backgroundColor: '#f8faf9' }}
        handleIndicatorStyle={{ backgroundColor: '#cde0db' }}
      >
        <View className="flex-row items-center justify-between px-5 pb-3" style={{ borderBottomWidth: 1, borderBottomColor: '#e7edeb' }}>
          <Text className="text-[15px] font-bold" style={{ color: '#00352e' }} numberOfLines={1}>
            {moveWallet ? `Move money · ${moveWallet.name}` : 'Move money'}
          </Text>
          <Pressable onPress={() => setMoveFor(null)} className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: '#f0f4f2' }}>
            <X size={14} weight="bold" color="#3f4946" />
          </Pressable>
        </View>

        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 24 }}>
          {/* Deposit / Withdraw toggle */}
          <View className="mb-3 flex-row rounded-lg p-1" style={{ backgroundColor: '#f0f4f2' }}>
            {(
              [
                { id: 'deposit' as const, label: 'Deposit', icon: ArrowDown },
                { id: 'withdrawal' as const, label: 'Withdraw', icon: ArrowUp },
              ]
            ).map((opt) => {
              const activeOpt = moveType === opt.id;
              const OptIcon = opt.icon;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setMoveType(opt.id)}
                  className="flex-1 flex-row items-center justify-center gap-1 rounded-md py-2"
                  style={{ backgroundColor: activeOpt ? '#ffffff' : 'transparent', shadowColor: '#00352e', shadowOpacity: activeOpt ? 0.1 : 0, shadowRadius: 4, elevation: activeOpt ? 1 : 0 }}
                >
                  <OptIcon size={11} weight="bold" color={activeOpt ? '#00352e' : '#6e9990'} />
                  <Text className="text-[11px] font-bold" style={{ color: activeOpt ? '#00352e' : '#6e9990' }}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Amount */}
          <View className="flex-row items-center gap-1 rounded-lg px-3 py-3" style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cde0db' }}>
            <Text className="font-mono text-sm font-semibold" style={{ color: '#6e9990' }}>
              ₱
            </Text>
            <BottomSheetTextInput
              value={moveAmount}
              onChangeText={setMoveAmount}
              keyboardType="decimal-pad"
              placeholder={moveWallet && moveType === 'withdrawal' ? `Up to ${formatCurrency(walletBalance(moveWallet))}` : '0'}
              className="flex-1 font-mono text-sm font-semibold"
              style={{ color: '#191c1c', paddingVertical: 0 }}
            />
          </View>

          <Text className="mt-2 text-[10px]" style={{ color: '#6e9990' }}>
            Logged as a transfer between your pockets — it won’t count as spending or income.
          </Text>

          <Pressable onPress={handleMove} className="mt-4 h-11 items-center justify-center rounded-2xl" style={{ backgroundColor: '#1f695d' }}>
            <Text className="text-sm font-bold text-white">{moveType === 'deposit' ? 'Deposit' : 'Withdraw'}</Text>
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}
