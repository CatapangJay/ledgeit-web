import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import Animated, { FadeOut, useReducedMotion, withDelay, withSpring, withTiming } from 'react-native-reanimated';
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
  Check,
  Tag,
  X,
} from 'phosphor-react-native';
import {
  WALLET_KINDS,
  formatCurrency,
  formatDate,
  walletBalance,
  walletGoalProgress,
  type Category,
  type Wallet,
  type WalletKind,
  type WalletMovement,
  type WalletMovementType,
} from '@ledgeit/core';
import { getIconComponent, getIconBg, WALLET_ICON_OPTIONS } from '@/lib/iconMap';
import { walletAccent, walletGradient, WALLET_COLOR_HEX, WALLET_COLOR_OPTIONS } from '@/lib/walletColors';
import { useStore } from '@/lib/store';
import CategoryPickerSheet from '@/components/ledger/CategoryPickerSheet';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const accentFor = walletAccent;

// CSS 135deg ≈ top-left → bottom-right for expo-linear-gradient.
const DIAGONAL_START = { x: 0, y: 0 };
const DIAGONAL_END = { x: 1, y: 1 };
const BRAND_GRADIENT: [string, string] = ['#1f695d', '#00352e'];

/**
 * Shared decorative chrome that makes a wallet's gradient panel read like a real
 * plastic card — soft light blobs, a diagonal gloss sweep, a faint hairline
 * texture, a big faded icon watermark, and the LedgeIt wordmark. Purely visual;
 * sits behind the card content. `iconName` drives the watermark so it matches
 * the card's chosen icon. (The bronze chip is rendered inline via <CardChip />
 * so it participates in the card's layout flow.)
 */
function CardDecor({ iconName }: { iconName: string }) {
  const Watermark = getIconComponent(iconName);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {/* Ambient light blobs */}
      <View className="absolute h-40 w-40 rounded-full" style={{ right: -40, top: -48, backgroundColor: 'rgba(255,255,255,0.16)' }} />
      <View className="absolute h-36 w-36 rounded-full" style={{ bottom: -56, left: -32, backgroundColor: 'rgba(0,0,0,0.10)' }} />
      {/* Diagonal gloss sweep (web: 115deg) */}
      <LinearGradient
        colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.06)']}
        locations={[0, 0.42, 0.6, 1]}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 0.8 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Fine hairline texture */}
      <View style={[StyleSheet.absoluteFill, { opacity: 0.06 }]}>
        <Svg width="100%" height="100%">
          <Defs>
            <Pattern id="walletHairline" width={7} height={7} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <Rect x={0} y={0} width={1} height={7} fill="#ffffff" />
            </Pattern>
          </Defs>
          <Rect x={0} y={0} width="100%" height="100%" fill="url(#walletHairline)" />
        </Svg>
      </View>
      {/* Large faded icon watermark */}
      <View className="absolute" style={{ bottom: -16, right: 4, opacity: 0.13 }}>
        <Watermark size={96} weight="fill" color="#ffffff" />
      </View>
      {/* Brand wordmark */}
      <Text className="absolute text-[10px] font-black italic tracking-tight text-white" style={{ bottom: 12, right: 16, opacity: 0.4 }}>
        LedgeIt
      </Text>
    </View>
  );
}

/**
 * The EMV-style bronze chip plate. Rendered inline in the card body (not as
 * absolute decor) so it sits in the layout flow and shows identically on both
 * the roomy preview card and the shorter list cards.
 */
function CardChip() {
  return (
    <View className="h-7 w-9 overflow-hidden rounded-[6px]" style={{ opacity: 0.9, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.15)' }}>
      <LinearGradient colors={['#f7e7ad', '#d9b96a', '#b8933f']} locations={[0, 0.55, 1]} start={DIAGONAL_START} end={DIAGONAL_END} style={StyleSheet.absoluteFill} />
      <View className="absolute top-0 h-full" style={{ left: '50%', width: 1, marginLeft: -0.5, backgroundColor: 'rgba(0,0,0,0.22)' }} />
      <View className="absolute left-0 w-full" style={{ top: '50%', height: 1, marginTop: -0.5, backgroundColor: 'rgba(0,0,0,0.22)' }} />
      <View className="absolute" style={{ left: 4, right: 4, top: 4, height: 1, backgroundColor: 'rgba(0,0,0,0.14)' }} />
      <View className="absolute" style={{ left: 4, right: 4, bottom: 4, height: 1, backgroundColor: 'rgba(0,0,0,0.14)' }} />
    </View>
  );
}

/**
 * Poker-deal entrance: each card is "thrown" from the dealer's hand (off the
 * top-right corner), gliding and settling into its slot, staggered so they
 * land one after another. A gentle spring keeps the motion smooth rather than
 * snappy. Reduced-motion users get a plain fade.
 */
function dealEntering(index: number, reduced: boolean) {
  return () => {
    'worklet';
    if (reduced) {
      return {
        initialValues: { opacity: 0 },
        animations: { opacity: withDelay(index * 40, withTiming(1, { duration: 200 })) },
      };
    }
    const delay = index * 100;
    const spring = { stiffness: 140, damping: 26, mass: 1.1 };
    return {
      initialValues: {
        opacity: 0,
        transform: [{ translateX: 220 }, { translateY: -150 }, { rotate: '24deg' }, { scale: 0.86 }],
      },
      animations: {
        opacity: withDelay(delay, withTiming(1, { duration: 280 })),
        transform: [
          { translateX: withDelay(delay, withSpring(0, spring)) },
          { translateY: withDelay(delay, withSpring(0, spring)) },
          { rotate: withDelay(delay, withSpring('0deg', spring)) },
          { scale: withDelay(delay, withSpring(1, spring)) },
        ],
      },
    };
  };
}

/**
 * The full wallets UI (summary, list, add/edit form, per-wallet deposit/withdraw)
 * with no page chrome. Ported from the web WalletLedger: wallets render as
 * gradient "ATM cards"; the add/edit view and the move-money input become bottom
 * sheets on mobile, while the movement history stays an inline drawer per card.
 */
export default function WalletLedger() {
  const wallets = useStore((s) => s.wallets);
  const transactions = useStore((s) => s.transactions);
  const customCategories = useStore((s) => s.customCategories);
  const hiddenCategories = useStore((s) => s.hiddenCategories);
  const addWallet = useStore((s) => s.addWallet);
  const updateWallet = useStore((s) => s.updateWallet);
  const recordWalletMovement = useStore((s) => s.recordWalletMovement);
  const removeWalletMovement = useStore((s) => s.removeWalletMovement);
  const toggleWalletArchived = useStore((s) => s.toggleWalletArchived);
  const removeWallet = useStore((s) => s.removeWallet);
  const reduceMotion = useReducedMotion();

  // Set while editing an existing wallet; null when creating a new one.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  // Add/edit-wallet form state
  const [name, setName] = useState('');
  const [kind, setKind] = useState<WalletKind>('savings');
  const [icon, setIcon] = useState<string>(WALLET_KINDS[0].icon);
  const [color, setColor] = useState<string>(WALLET_KINDS[0].color);
  // Whether the user has hand-picked an icon/color. Until they do, both track
  // the selected kind's defaults so switching kind feels natural.
  const [iconTouched, setIconTouched] = useState(false);
  const [colorTouched, setColorTouched] = useState(false);
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [saving, setSaving] = useState(false);

  // Per-wallet movement input + delete confirm
  const [moveFor, setMoveFor] = useState<string | null>(null);
  const [moveType, setMoveType] = useState<WalletMovementType>('deposit');
  const [moveAmount, setMoveAmount] = useState('');
  // Optional category tag for the current move (null = default Transfers).
  const [moveCategory, setMoveCategory] = useState<Category | null>(null);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  // Wallet whose movement history is expanded, plus which movement is pending delete.
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [movementDeleteConfirm, setMovementDeleteConfirm] = useState<string | null>(null);

  const formSheetRef = useRef<BottomSheet>(null);
  const moveSheetRef = useRef<BottomSheet>(null);
  const formSnapPoints = useMemo(() => ['92%'], []);
  const moveSnapPoints = useMemo(() => ['60%'], []);

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

  // Movement → tagged category, resolved from the linked transfer transaction so
  // we can show which category the money moved from/to. The "Transfers" preset
  // is the default (untagged), so we only surface a badge for anything else.
  const movementCategoryById = useMemo(() => {
    const byTxId = new Map(transactions.map((t) => [t.id, t.category]));
    const map = new Map<string, Category>();
    for (const w of wallets) {
      for (const m of w.movements) {
        if (!m.transactionId) continue;
        const cat = byTxId.get(m.transactionId);
        if (cat && cat.id !== 'transfers') map.set(m.id, cat);
      }
    }
    return map;
  }, [transactions, wallets]);

  const moveWallet = moveFor ? wallets.find((w) => w.id === moveFor) ?? null : null;
  const nameValid = name.trim().length > 0;

  function openAdd() {
    const first = WALLET_KINDS[0];
    setEditingId(null);
    setName('');
    setKind(first.id);
    setIcon(first.icon);
    setColor(first.color);
    setIconTouched(false);
    setColorTouched(false);
    setTarget('');
    setNote('');
    setInitialAmount('');
    setFormOpen(true);
  }

  function openEdit(wallet: Wallet) {
    setEditingId(wallet.id);
    setName(wallet.name);
    setKind(wallet.kind);
    setIcon(wallet.icon);
    setColor(wallet.color);
    // Existing wallets keep whatever icon/color they were saved with.
    setIconTouched(true);
    setColorTouched(true);
    setTarget(wallet.target != null ? String(wallet.target) : '');
    setNote(wallet.note ?? '');
    setInitialAmount('');
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
  }

  // Picking a kind updates icon/color to that kind's defaults, unless the user
  // has already hand-picked one (then we leave their choice alone).
  function chooseKind(k: WalletKind) {
    setKind(k);
    const meta = WALLET_KINDS.find((m) => m.id === k);
    if (meta) {
      if (!iconTouched) setIcon(meta.icon);
      if (!colorTouched) setColor(meta.color);
    }
  }

  async function handleSave() {
    if (!name.trim() || saving) return;
    const targetVal = parseFloat(target.replace(/[^0-9.]/g, '')) || 0;
    setSaving(true);
    if (editingId) {
      await updateWallet(editingId, {
        name: name.trim(),
        kind,
        icon,
        color,
        target: targetVal > 0 ? targetVal : undefined,
        note: note.trim() || undefined,
      });
    } else {
      const initial = parseFloat(initialAmount.replace(/[^0-9.]/g, '')) || 0;
      await addWallet({
        name: name.trim(),
        kind,
        icon,
        color,
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
    setHistoryFor(null);
    setMoveType('deposit');
    setMoveAmount('');
    setMoveCategory(null);
    setMoveFor(walletId);
  }

  function closeMove() {
    setMoveFor(null);
    setCategoryPickerOpen(false);
  }

  async function handleMove() {
    if (!moveFor) return;
    const amount = parseFloat(moveAmount.replace(/[^0-9.]/g, '')) || 0;
    if (amount <= 0) return;
    await recordWalletMovement(moveFor, {
      type: moveType,
      amount,
      date: todayISO(),
      category: moveCategory ?? undefined,
    });
    closeMove();
    setMoveAmount('');
    setMoveCategory(null);
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

  // Rendered as a plain function (not a nested component) so re-renders of the
  // ledger don't remount the cards and replay their deal-in animation.
  function renderWalletCard(wallet: Wallet, index: number) {
    const balance = walletBalance(wallet);
    const progress = walletGoalProgress(wallet);
    const accent = accentFor(wallet.color);
    const gradient = walletGradient(wallet.color);
    const kindMeta = WALLET_KINDS.find((k) => k.id === wallet.kind);
    const isDeletePending = deleteConfirm === wallet.id;
    const isHistoryOpen = historyFor === wallet.id;
    const movements = [...wallet.movements].reverse(); // newest first
    const KindIcon = getIconComponent(wallet.icon);

    return (
      <Animated.View
        key={wallet.id}
        entering={dealEntering(index, reduceMotion)}
        exiting={FadeOut.duration(180)}
        className="mb-3"
        style={{ transformOrigin: 'bottom right' }}
      >
        {/* Static wrapper carries the shadow + archived dimming so the entrance
            animation's opacity never fights it. */}
        <View
          className="rounded-3xl"
          style={{
            backgroundColor: gradient[1],
            shadowColor: '#00352e',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.3,
            shadowRadius: 18,
            elevation: 8,
            opacity: wallet.isArchived ? 0.72 : 1,
          }}
        >
          <LinearGradient colors={gradient} start={DIAGONAL_START} end={DIAGONAL_END} style={{ borderRadius: 24, overflow: 'hidden', padding: 20 }}>
            <CardDecor iconName={wallet.icon} />

            {/* Top row: icon + name/kind, and action buttons */}
            <View className="flex-row items-start gap-3">
              <View className="h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}>
                <KindIcon size={22} weight="fill" color="#ffffff" />
              </View>
              <View className="min-w-0 flex-1 pt-0.5">
                <View className="flex-row items-center gap-2">
                  <Text className="shrink text-base font-bold text-white" numberOfLines={1}>
                    {wallet.name}
                  </Text>
                  {wallet.isArchived && (
                    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}>
                      <Text className="text-[9px] font-bold uppercase tracking-wide text-white">Archived</Text>
                    </View>
                  )}
                </View>
                <Text className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.7)' }} numberOfLines={1}>
                  {kindMeta?.label ?? 'Wallet'}
                  {wallet.note ? ` · ${wallet.note}` : ''}
                </Text>
              </View>
              <View className="shrink-0 flex-row items-center gap-1">
                <Pressable
                  accessibilityLabel="Edit wallet"
                  onPress={() => openEdit(wallet)}
                  hitSlop={6}
                  className="h-7 w-7 items-center justify-center rounded-full active:opacity-70"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  <PencilSimple size={12} weight="bold" color="#ffffff" />
                </Pressable>
                <Pressable
                  accessibilityLabel={wallet.isArchived ? 'Restore wallet' : 'Archive wallet'}
                  onPress={() => toggleWalletArchived(wallet.id)}
                  hitSlop={6}
                  className="h-7 w-7 items-center justify-center rounded-full active:opacity-70"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  {wallet.isArchived ? (
                    <ArrowCounterClockwise size={12} weight="bold" color="#ffffff" />
                  ) : (
                    <Archive size={12} weight="bold" color="#ffffff" />
                  )}
                </Pressable>
                <Pressable
                  accessibilityLabel={isDeletePending ? 'Confirm delete' : 'Delete wallet'}
                  onPress={() => handleDelete(wallet.id)}
                  hitSlop={6}
                  className="h-7 w-7 items-center justify-center rounded-full active:opacity-70"
                  style={{ backgroundColor: isDeletePending ? '#ffffff' : 'rgba(255,255,255,0.2)' }}
                >
                  <Trash size={12} weight="bold" color={isDeletePending ? '#ba1a1a' : '#ffffff'} />
                </Pressable>
              </View>
            </View>

            {/* Bronze chip */}
            <View className="mt-4">
              <CardChip />
            </View>

            {/* Big balance */}
            <View className="mt-4 pr-16">
              <Text className="font-mono text-[32px] font-extrabold tracking-tight text-white" style={{ lineHeight: 36 }} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(balance)}
              </Text>
              {progress != null && (
                <Text className="mt-2 text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {Math.round(progress * 100)}% of {formatCurrency(wallet.target!)} goal
                </Text>
              )}
            </View>

            {progress != null && (
              <View className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}>
                <View className="h-full rounded-full" style={{ width: `${progress * 100}%`, backgroundColor: '#ffffff' }} />
              </View>
            )}

            {/* Bottom action row: Move + activity toggle */}
            <View className="mt-4 flex-row items-center gap-2">
              {!wallet.isArchived && (
                <Pressable
                  accessibilityLabel="Move money"
                  onPress={() => openMove(wallet.id)}
                  className="h-8 flex-1 flex-row items-center justify-center gap-1.5 rounded-full active:opacity-80"
                  style={{ backgroundColor: '#ffffff' }}
                >
                  <Plus size={12} weight="bold" color={accent} />
                  <Text className="text-[12px] font-bold" style={{ color: accent }}>
                    Move money
                  </Text>
                </Pressable>
              )}
              {wallet.movements.length > 0 && (
                <Pressable
                  onPress={() => {
                    setHistoryFor(isHistoryOpen ? null : wallet.id);
                    setMoveFor(null);
                    setMovementDeleteConfirm(null);
                  }}
                  accessibilityLabel={isHistoryOpen ? 'Hide activity' : 'Show activity'}
                  accessibilityState={{ expanded: isHistoryOpen }}
                  className="h-8 flex-row items-center gap-1 rounded-full px-3 active:opacity-80"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  <Text className="text-[12px] font-bold text-white">{wallet.movements.length}</Text>
                  <CaretDown size={11} weight="bold" color="#ffffff" style={{ transform: [{ rotate: isHistoryOpen ? '180deg' : '0deg' }] }} />
                </Pressable>
              )}
            </View>

            {/* Movement history drawer — a white panel on the colored card for
                legible rows. Each row is tagged Manual vs Linked so it's clear
                whether the entry is a direct deposit/withdrawal or mirrors a real
                expense/income logged elsewhere. */}
            {isHistoryOpen && (
              <View className="mt-3 rounded-2xl bg-white p-3" style={{ shadowColor: '#000000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 18, elevation: 3 }}>
                <View className="rounded-xl p-2" style={{ backgroundColor: '#f8faf9', borderWidth: 1, borderColor: '#eef2f1' }}>
                  {movements.map((m) => {
                    const isDeposit = m.type === 'deposit';
                    const isLinked = m.source === 'linked';
                    const pendingDelete = movementDeleteConfirm === m.id;
                    const movementCat = movementCategoryById.get(m.id);
                    const MovementCatIcon = movementCat ? getIconComponent(movementCat.icon) : null;
                    return (
                      <View key={m.id} className="flex-row items-center gap-2 rounded-lg px-2 py-1.5">
                        <View className="h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: isDeposit ? 'rgba(31,105,80,0.1)' : 'rgba(180,83,9,0.1)' }}>
                          {isDeposit ? <ArrowDown size={11} weight="bold" color="#1f6950" /> : <ArrowUp size={11} weight="bold" color="#b45309" />}
                        </View>
                        <View className="min-w-0 flex-1">
                          <View className="flex-row flex-wrap items-center gap-1.5">
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
                            {/* Category tag — which pocket the money came from / went to */}
                            {movementCat && MovementCatIcon && (
                              <View className="flex-row items-center gap-0.5 rounded-full px-1.5 py-0.5" style={{ backgroundColor: getIconBg(movementCat) }}>
                                <MovementCatIcon size={8} weight="fill" color="#ffffff" />
                                <Text className="text-[8px] font-bold uppercase tracking-wide text-white">{movementCat.label.split(/[\s&]/)[0]}</Text>
                              </View>
                            )}
                          </View>
                          <Text className="text-[10px]" style={{ color: '#6e9990' }}>
                            {formatDate(m.date)}
                            {m.note ? ` · ${m.note}` : ''}
                          </Text>
                        </View>
                        <Pressable
                          accessibilityLabel={pendingDelete ? 'Confirm remove movement' : 'Remove movement'}
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
              </View>
            )}
          </LinearGradient>
        </View>
      </Animated.View>
    );
  }

  // Live card preview in the add/edit sheet — mirrors how the wallet card will
  // actually look: chosen icon + color, big balance, and goal progress when set.
  // New wallets start at the (optional) initial balance, defaulting to 0. When
  // editing, show the wallet's real current balance so the preview matches reality.
  const editingWallet = editingId ? wallets.find((w) => w.id === editingId) : undefined;
  const previewBalance = editingWallet ? walletBalance(editingWallet) : parseFloat(initialAmount.replace(/[^0-9.]/g, '')) || 0;
  const previewTarget = parseFloat(target.replace(/[^0-9.]/g, '')) || 0;
  const previewProgress = previewTarget > 0 ? Math.min(Math.max(previewBalance / previewTarget, 0), 1) : null;
  const PreviewIcon = getIconComponent(icon);
  const pickerAccent = accentFor(color);

  return (
    <View className="flex-1">
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* Summary — a hero "total balance" card in the ledgeit brand green */}
        <LinearGradient
          colors={BRAND_GRADIENT}
          start={DIAGONAL_START}
          end={DIAGONAL_END}
          style={{ marginBottom: 20, borderRadius: 24, overflow: 'hidden', paddingHorizontal: 20, paddingVertical: 16 }}
        >
          <View pointerEvents="none" className="absolute h-28 w-28 rounded-full" style={{ right: -24, top: -32, backgroundColor: 'rgba(255,255,255,0.10)' }} />
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Total stashed away
              </Text>
              <Text className="mt-1 font-mono text-[30px] font-extrabold tracking-tight text-white" style={{ lineHeight: 34 }}>
                {formatCurrency(totalStashed)}
              </Text>
              <Text className="mt-1.5 text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.65)' }}>
                across {active.length} {active.length === 1 ? 'wallet' : 'wallets'}
              </Text>
            </View>
            <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
              <WalletIcon size={22} weight="fill" color="#ffffff" />
            </View>
          </View>
        </LinearGradient>

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
            {active.map((w, i) => renderWalletCard(w, i))}
            {archived.length > 0 && (
              <>
                <Text className="mb-2 mt-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
                  Archived
                </Text>
                {archived.map((w, i) => renderWalletCard(w, active.length + i))}
              </>
            )}
          </>
        )}

        <Pressable
          onPress={openAdd}
          className="mt-1 w-full flex-row items-center justify-center gap-2 rounded-2xl py-3.5 active:opacity-70"
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
          {/* Live card preview */}
          <View
            className="mb-6 w-full self-center rounded-3xl"
            style={{
              maxWidth: 384,
              aspectRatio: 1.586,
              backgroundColor: walletGradient(color)[1],
              shadowColor: '#00352e',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.3,
              shadowRadius: 18,
              elevation: 8,
            }}
          >
            <LinearGradient
              colors={walletGradient(color)}
              start={DIAGONAL_START}
              end={DIAGONAL_END}
              style={{ flex: 1, borderRadius: 24, overflow: 'hidden', padding: 20, justifyContent: 'space-between' }}
            >
              <CardDecor iconName={icon} />
              <View className="flex-row items-start gap-3">
                <View className="h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}>
                  <PreviewIcon size={22} weight="fill" color="#ffffff" />
                </View>
                <View className="min-w-0 flex-1 pt-0.5">
                  <Text className="text-base font-bold text-white" numberOfLines={1}>
                    {name.trim() || 'Wallet name'}
                  </Text>
                  <Text className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.7)' }} numberOfLines={1}>
                    {WALLET_KINDS.find((k) => k.id === kind)?.label ?? 'Wallet'}
                    {note.trim() ? ` · ${note.trim()}` : ''}
                  </Text>
                </View>
              </View>
              <View>
                <CardChip />
              </View>
              <View className="pr-16">
                <Text className="font-mono text-[32px] font-extrabold tracking-tight text-white" style={{ lineHeight: 36 }} numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(previewBalance)}
                </Text>
                {previewProgress != null && (
                  <>
                    <Text className="mt-2 text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      {Math.round(previewProgress * 100)}% of {formatCurrency(previewTarget)} goal
                    </Text>
                    <View className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}>
                      <View className="h-full rounded-full" style={{ width: `${previewProgress * 100}%`, backgroundColor: '#ffffff' }} />
                    </View>
                  </>
                )}
              </View>
            </LinearGradient>
          </View>

          {/* Kind picker */}
          <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
            Type
          </Text>
          <View className="mb-4 flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
            {WALLET_KINDS.map((k) => {
              const KindIcon = getIconComponent(k.icon);
              const isSel = kind === k.id;
              const accent = accentFor(k.color);
              return (
                <View key={k.id} style={{ width: '33.333%' }} className="p-1">
                  <Pressable
                    onPress={() => chooseKind(k.id)}
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

          {/* Icon picker */}
          <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
            Icon
          </Text>
          <View className="mb-4 flex-row flex-wrap" style={{ marginHorizontal: -3 }}>
            {WALLET_ICON_OPTIONS.map((iconName) => {
              const OptionIcon = getIconComponent(iconName);
              const isSel = icon === iconName;
              return (
                <View key={iconName} style={{ width: '10%', padding: 3 }}>
                  <Pressable
                    accessibilityLabel={iconName}
                    accessibilityState={{ selected: isSel }}
                    onPress={() => {
                      setIcon(iconName);
                      setIconTouched(true);
                    }}
                    className="items-center justify-center rounded-lg active:opacity-70"
                    style={{ aspectRatio: 1, backgroundColor: isSel ? pickerAccent : '#f0f4f2' }}
                  >
                    <OptionIcon size={14} weight={isSel ? 'fill' : 'regular'} color={isSel ? '#ffffff' : '#3f4946'} />
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* Color picker */}
          <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
            Color
          </Text>
          <View className="mb-4 flex-row flex-wrap">
            {WALLET_COLOR_OPTIONS.map((colorKey) => {
              const isSel = color === colorKey;
              return (
                <View key={colorKey} className="items-center" style={{ width: '11.111%', paddingVertical: 4 }}>
                  <Pressable
                    accessibilityLabel={colorKey}
                    accessibilityState={{ selected: isSel }}
                    onPress={() => {
                      setColor(colorKey);
                      setColorTouched(true);
                    }}
                    className="h-7 w-7 items-center justify-center rounded-full active:opacity-70"
                    style={{ backgroundColor: WALLET_COLOR_HEX[colorKey] }}
                  >
                    {isSel && <Check size={12} weight="bold" color="#ffffff" />}
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* Goal */}
          <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
            Goal <Text style={{ color: '#cde0db' }}>(optional)</Text>
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

          {/* Initial balance — only when creating a new wallet */}
          {!editingId && (
            <>
              <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
                Initial balance <Text style={{ color: '#cde0db' }}>(optional)</Text>
              </Text>
              <View className="mb-4 flex-row items-center gap-2 rounded-xl px-4 py-3" style={{ backgroundColor: '#f0f4f2' }}>
                <Text className="font-mono text-sm font-semibold" style={{ color: '#6e9990' }}>
                  ₱
                </Text>
                <BottomSheetTextInput
                  value={initialAmount}
                  onChangeText={setInitialAmount}
                  keyboardType="decimal-pad"
                  placeholder="0 — how much is already in it"
                  className="flex-1 font-mono text-sm font-semibold"
                  style={{ color: '#191c1c', paddingVertical: 0 }}
                />
              </View>
            </>
          )}

          {/* Note */}
          <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
            Note <Text style={{ color: '#cde0db' }}>(optional)</Text>
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
          <Pressable onPress={handleSave} disabled={!nameValid || saving} className="h-11 flex-1" style={{ opacity: !nameValid || saving ? 0.4 : 1 }}>
            <LinearGradient
              colors={BRAND_GRADIENT}
              start={DIAGONAL_START}
              end={DIAGONAL_END}
              style={{ flex: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text className="text-sm font-bold text-white">{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Wallet'}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </BottomSheet>

      {/* ── Deposit / withdraw movement sheet ───────────────────────────────── */}
      <BottomSheet
        ref={moveSheetRef}
        index={-1}
        snapPoints={moveSnapPoints}
        enablePanDownToClose
        onClose={closeMove}
        backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />}
        backgroundStyle={{ backgroundColor: '#f8faf9' }}
        handleIndicatorStyle={{ backgroundColor: '#cde0db' }}
      >
        <View className="flex-row items-center justify-between px-5 pb-3" style={{ borderBottomWidth: 1, borderBottomColor: '#e7edeb' }}>
          <Text className="shrink text-[15px] font-bold" style={{ color: '#00352e' }} numberOfLines={1}>
            {moveWallet ? `Move money · ${moveWallet.name}` : 'Move money'}
          </Text>
          <Pressable onPress={closeMove} className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: '#f0f4f2' }}>
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

          {/* Optional category tag — which pocket the money came from / went
              to. Purely for identification; the entry stays a transfer. */}
          <Pressable
            onPress={() => setCategoryPickerOpen(true)}
            className="mt-2 w-full flex-row items-center gap-2 rounded-lg px-3 py-2 active:opacity-80"
            style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#eef2f1' }}
          >
            {moveCategory ? (
              (() => {
                const MoveCatIcon = getIconComponent(moveCategory.icon);
                return (
                  <View className="h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: getIconBg(moveCategory) }}>
                    <MoveCatIcon size={12} weight="fill" color="#ffffff" />
                  </View>
                );
              })()
            ) : (
              <View className="h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: '#e7edeb' }}>
                <Tag size={12} weight="bold" color="#6e9990" />
              </View>
            )}
            <Text className="min-w-0 flex-1 text-[12px] font-semibold" style={{ color: moveCategory ? '#191c1c' : '#6e9990' }} numberOfLines={1}>
              {moveCategory ? moveCategory.label : moveType === 'deposit' ? 'Tag where it came from (optional)' : 'Tag where it went (optional)'}
            </Text>
            {moveCategory && (
              <Pressable
                accessibilityLabel="Clear category"
                onPress={() => setMoveCategory(null)}
                hitSlop={8}
                className="h-5 w-5 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: '#e7edeb' }}
              >
                <Pencil size={10} weight="bold" color="#6e9990" />
              </Pressable>
            )}
            <CaretDown size={11} weight="bold" color="#a9c2bd" />
          </Pressable>

          <Text className="mt-2 text-[10px]" style={{ color: '#6e9990' }}>
            Logged as a transfer between your pockets — it won’t count as spending or income
            {moveCategory ? `, just tagged ${moveCategory.label} so you can spot it later` : ''}.
          </Text>

          <Pressable onPress={handleMove} className="mt-4 h-11">
            <LinearGradient
              colors={BRAND_GRADIENT}
              start={DIAGONAL_START}
              end={DIAGONAL_END}
              style={{ flex: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text className="text-sm font-bold text-white">{moveType === 'deposit' ? 'Deposit' : 'Withdraw'}</Text>
            </LinearGradient>
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Category picker for the move's optional tag — rendered last so it
          stacks above the move sheet. */}
      <CategoryPickerSheet
        open={categoryPickerOpen}
        title={moveType === 'deposit' ? 'Where did it come from?' : 'Where did it go?'}
        customCategories={customCategories}
        hiddenCategories={hiddenCategories}
        onPick={(cat) => {
          setMoveCategory(cat);
          setCategoryPickerOpen(false);
        }}
        onClose={() => setCategoryPickerOpen(false)}
      />
    </View>
  );
}
