import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { X, ArrowLeft, Check, PencilSimple, Trash, Plus, Sparkle, EyeSlash, ArrowsLeftRight, Warning } from 'phosphor-react-native';
import {
  CATEGORIES, isHideableCategory, formatCurrency, PLAN_TEMPLATES,
  type BudgetAllocationItem, type CustomCategory,
} from '@ledgeit/core';
import { useStore, DEFAULT_BUDGETS } from '@/lib/store';
import { getIconComponent, getIconBg } from '@/lib/iconMap';
import AddCategoryForm from './AddCategoryForm';

interface Props {
  open: boolean;
  onClose: () => void;
}

type ViewMode = 'list' | 'editor';

// Budgetable categories exclude income, the "other" catch-all, and the
// non-spending categories (debts + transfers move money between your own
// pockets, so they aren't budgeted).
const EXPENSE_CATEGORIES = CATEGORIES.filter(
  (c) => c.id !== 'income' && c.id !== 'other' && c.id !== 'debts' && c.id !== 'transfers',
);

/** Round to at most 2 decimal places (percentages allow fractional splits). */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildEditorItems(
  existingItems: BudgetAllocationItem[],
  customCats: CustomCategory[],
  hiddenIds: string[] = [],
): BudgetAllocationItem[] {
  const result: BudgetAllocationItem[] = [];
  for (const cat of EXPENSE_CATEGORIES) {
    const found = existingItems.find((i) => i.categoryId === cat.id);
    if (hiddenIds.includes(cat.id) && !found) continue;
    result.push({
      categoryId: cat.id,
      limit: found?.limit ?? DEFAULT_BUDGETS.find((b) => b.categoryId === cat.id)?.limit ?? 0,
    });
  }
  for (const cat of customCats) {
    const found = existingItems.find((i) => i.categoryId === cat.id);
    result.push({ categoryId: cat.id, limit: found?.limit ?? 0 });
  }
  return result;
}

function getCatDisplay(
  categoryId: string,
  customCats: CustomCategory[],
): { label: string; icon: string; color?: string; isCustom: boolean } {
  const preset = EXPENSE_CATEGORIES.find((c) => c.id === categoryId);
  if (preset) return { label: preset.label, icon: preset.icon, color: preset.color, isCustom: false };
  const custom = customCats.find((c) => c.id === categoryId);
  if (custom) return { label: custom.name, icon: custom.icon, color: custom.textColor, isCustom: true };
  return { label: '?', icon: 'DotsThree', isCustom: false };
}

/**
 * Budget-plan manager: list existing allocation plans (activate/edit/delete) and
 * a full editor (name, total budget, amount/percent modes, quick templates,
 * per-category limits, add/hide categories). Ported from the web
 * BudgetAllocationSheet into the mobile gorhom bottom-sheet idiom. The desktop
 * variant is dropped; a category-hide confirm becomes an inline overlay.
 */
export default function BudgetAllocationSheet({ open, onClose }: Props) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['92%'], []);
  const router = useRouter();

  const allocations = useStore((s) => s.budgetAllocations);
  const saveBudgetAllocation = useStore((s) => s.saveBudgetAllocation);
  const activateAllocation = useStore((s) => s.activateAllocation);
  const deleteAllocation = useStore((s) => s.deleteAllocation);
  const customCategories = useStore((s) => s.customCategories);
  const hiddenCategories = useStore((s) => s.hiddenCategories);
  const hidePresetCategory = useStore((s) => s.hidePresetCategory);
  const removeCustomCategory = useStore((s) => s.removeCustomCategory);
  const transactions = useStore((s) => s.transactions);
  const storeAddCustomCategory = useStore((s) => s.addCustomCategory);

  const [hideTarget, setHideTarget] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('list');

  // Editor state
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const [planName, setPlanName] = useState('');
  const [items, setItems] = useState<BudgetAllocationItem[]>(() => buildEditorItems([], []));
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showAddCatForm, setShowAddCatForm] = useState(false);
  const [savingCustomCat, setSavingCustomCat] = useState(false);
  const [addCatError, setAddCatError] = useState<string | null>(null);
  const [totalBudget, setTotalBudget] = useState(0);
  const [allocationMode, setAllocationMode] = useState<'amount' | 'percent'>('amount');
  const [percents, setPercents] = useState<Record<string, number>>({});
  const [percentDraft, setPercentDraft] = useState<{ id: string; text: string } | null>(null);

  useEffect(() => {
    if (open) {
      sheetRef.current?.expand();
      setView('list');
      setDeleteConfirm(null);
    } else {
      sheetRef.current?.close();
    }
  }, [open]);

  function openEditor(id?: string) {
    let newItems: BudgetAllocationItem[];
    if (id) {
      const alloc = allocations.find((a) => a.id === id);
      if (!alloc) return;
      setPlanName(alloc.name);
      newItems = buildEditorItems(alloc.items, customCategories, hiddenCategories);
      setEditId(id);
    } else {
      setPlanName('');
      newItems = buildEditorItems([], customCategories, hiddenCategories);
      setEditId(undefined);
    }
    setItems(newItems);
    const total = newItems.reduce((s, i) => s + i.limit, 0);
    setTotalBudget(total);
    setAllocationMode('amount');
    setPercents(
      Object.fromEntries(newItems.map((i) => [i.categoryId, total > 0 ? round2((i.limit / total) * 100) : 0])),
    );
    setShowAddCatForm(false);
    setPercentDraft(null);
    setView('editor');
  }

  function backToList() {
    setView('list');
    setDeleteConfirm(null);
  }

  function handleLimitChange(categoryId: string, raw: string) {
    const num = parseFloat(raw.replace(/[^0-9.]/g, '')) || 0;
    setItems((prev) => prev.map((item) => (item.categoryId === categoryId ? { ...item, limit: num } : item)));
  }

  async function handleSave() {
    if (!planName.trim()) return;
    setSaving(true);
    await saveBudgetAllocation({ id: editId, name: planName.trim(), items });
    setSaving(false);
    backToList();
  }

  async function handleAddCustomCategory(name: string, icon: string, textColor: string, bgColor: string) {
    setAddCatError(null);
    setSavingCustomCat(true);
    try {
      const newCat = await storeAddCustomCategory(name, icon, textColor, bgColor);
      setItems((prev) => [...prev, { categoryId: newCat.id, limit: 0 }]);
      setPercents((prev) => ({ ...prev, [newCat.id]: 0 }));
      setShowAddCatForm(false);
    } catch (err) {
      setAddCatError(err instanceof Error ? err.message : 'Failed to add category');
    } finally {
      setSavingCustomCat(false);
    }
  }

  function removeFromItems(categoryId: string) {
    setItems((prev) => prev.filter((i) => i.categoryId !== categoryId));
    setPercents((prev) => {
      const next = { ...prev };
      delete next[categoryId];
      return next;
    });
  }

  function txnCountFor(categoryId: string): number {
    return transactions.reduce((n, t) => (t.category.id === categoryId ? n + 1 : n), 0);
  }

  function beginHide(categoryId: string) {
    if (txnCountFor(categoryId) > 0) {
      setHideTarget(categoryId);
    } else {
      confirmHide(categoryId);
    }
  }

  function confirmHide(categoryId: string) {
    if (isHideableCategory(categoryId)) {
      hidePresetCategory(categoryId);
    } else {
      removeCustomCategory(categoryId);
    }
    removeFromItems(categoryId);
    setHideTarget(null);
  }

  function goMoveTransactions(categoryId: string) {
    setHideTarget(null);
    onClose();
    router.push({ pathname: '/ledger', params: { category: categoryId } });
  }

  function handleTotalBudgetChange(raw: string) {
    const num = parseFloat(raw.replace(/[^0-9.]/g, '')) || 0;
    setTotalBudget(num);
    if (allocationMode === 'percent') {
      setItems((prev) => prev.map((item) => ({ ...item, limit: Math.round(((percents[item.categoryId] ?? 0) / 100) * num) })));
    }
  }

  function handleModeToggle(mode: 'amount' | 'percent') {
    if (mode === allocationMode) return;
    setPercentDraft(null);
    if (mode === 'percent') {
      const base = totalBudget > 0 ? totalBudget : items.reduce((s, i) => s + i.limit, 0);
      if (totalBudget === 0) setTotalBudget(base);
      setPercents(Object.fromEntries(items.map((i) => [i.categoryId, base > 0 ? round2((i.limit / base) * 100) : 0])));
    }
    setAllocationMode(mode);
  }

  function applyTemplate(percentsByCat: Record<string, number>) {
    const nextPercents: Record<string, number> = {};
    for (const item of items) nextPercents[item.categoryId] = percentsByCat[item.categoryId] ?? 0;
    setPercents(nextPercents);
    setAllocationMode('percent');
    if (totalBudget > 0) {
      setItems((prev) => prev.map((item) => ({ ...item, limit: Math.round(((nextPercents[item.categoryId] ?? 0) / 100) * totalBudget) })));
    }
  }

  function handlePercentChange(categoryId: string, raw: string) {
    let cleaned = raw.replace(/[^0-9.]/g, '');
    const firstDot = cleaned.indexOf('.');
    if (firstDot !== -1) {
      cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
      const [whole, dec] = cleaned.split('.');
      cleaned = `${whole}.${(dec ?? '').slice(0, 2)}`;
    }
    setPercentDraft({ id: categoryId, text: cleaned });
    const num = Math.max(0, Math.min(100, round2(parseFloat(cleaned) || 0)));
    setPercents((prev) => ({ ...prev, [categoryId]: num }));
    setItems((prev) => prev.map((item) => (item.categoryId === categoryId ? { ...item, limit: Math.round((num / 100) * totalBudget) } : item)));
  }

  async function handleDelete(id: string) {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }
    await deleteAllocation(id);
    setDeleteConfirm(null);
  }

  const canDelete = allocations.length > 1;

  const totalAllocated =
    allocationMode === 'percent'
      ? Object.values(percents).reduce((s, p) => s + p, 0)
      : items.reduce((s, i) => s + i.limit, 0);
  const isOver =
    allocationMode === 'percent'
      ? totalAllocated > 100
      : totalBudget > 0 && totalAllocated > totalBudget;

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />}
      backgroundStyle={{ backgroundColor: '#f8faf9' }}
      handleIndicatorStyle={{ backgroundColor: '#cde0db' }}
    >
      {view === 'list' ? (
        <>
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pb-3" style={{ borderBottomWidth: 1, borderBottomColor: '#e7edeb' }}>
            <Text className="text-base font-bold" style={{ color: '#00352e' }}>Budget Plans</Text>
            <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: '#f0f4f2' }}>
              <X size={15} weight="bold" color="#3f4946" />
            </Pressable>
          </View>

          <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
            {allocations.map((alloc) => {
              const isDeletePending = deleteConfirm === alloc.id;
              return (
                <View
                  key={alloc.id}
                  className="mb-2 flex-row items-center gap-3 rounded-2xl px-4 py-3"
                  style={{ backgroundColor: alloc.isActive ? '#e7edeb' : '#f0f4f2', borderLeftWidth: 3, borderLeftColor: alloc.isActive ? '#1f695d' : 'transparent' }}
                >
                  <Pressable
                    className="flex-1 flex-row items-center gap-3"
                    onPress={() => !alloc.isActive && activateAllocation(alloc.id)}
                  >
                    <View className="h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: alloc.isActive ? '#1f695d' : '#e7edeb' }}>
                      {alloc.isActive && <Check size={12} weight="bold" color="#fff" />}
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-sm font-semibold" style={{ color: '#191c1c' }} numberOfLines={1}>{alloc.name}</Text>
                      <Text className="text-[11px]" style={{ color: '#6e9990' }}>
                        {alloc.items.length} categories · {formatCurrency(alloc.items.reduce((s, i) => s + i.limit, 0))} total
                      </Text>
                    </View>
                  </Pressable>
                  <View className="shrink-0 flex-row items-center gap-1">
                    <Pressable onPress={() => openEditor(alloc.id)} hitSlop={8} className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: '#e7edeb' }}>
                      <PencilSimple size={13} weight="bold" color="#3f4946" />
                    </Pressable>
                    {canDelete && (
                      <Pressable onPress={() => handleDelete(alloc.id)} hitSlop={8} className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: isDeletePending ? '#ba1a1a' : '#e7edeb' }}>
                        <Trash size={13} weight="bold" color={isDeletePending ? '#fff' : '#ba1a1a'} />
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}

            <Pressable
              onPress={() => openEditor()}
              className="mt-2 flex-row items-center justify-center gap-2 rounded-2xl py-3"
              style={{ borderWidth: 1.5, borderColor: '#cde0db', borderStyle: 'dashed' }}
            >
              <Plus size={14} weight="bold" color="#1f695d" />
              <Text className="text-sm font-semibold" style={{ color: '#1f695d' }}>New Plan</Text>
            </Pressable>
          </BottomSheetScrollView>
        </>
      ) : (
        <>
          {/* Editor header */}
          <View className="flex-row items-center gap-3 px-5 pb-3" style={{ borderBottomWidth: 1, borderBottomColor: '#e7edeb' }}>
            <Pressable onPress={backToList} className="h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: '#f0f4f2' }}>
              <ArrowLeft size={15} weight="bold" color="#3f4946" />
            </Pressable>
            <Text className="flex-1 text-base font-bold" style={{ color: '#00352e' }}>{editId ? 'Edit Plan' : 'New Plan'}</Text>
          </View>

          <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
            {/* Plan name */}
            <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>Plan Name</Text>
            <BottomSheetTextInput
              maxLength={48}
              value={planName}
              onChangeText={setPlanName}
              placeholder="E.g. Regular Month"
              placeholderTextColor="#6e9990"
              className="rounded-xl px-4 py-3 text-sm font-semibold"
              style={{ backgroundColor: '#f0f4f2', color: '#191c1c' }}
            />
            <View className="mb-5 mt-1 flex-row justify-end">
              <Text className="text-[11px]" style={{ color: '#6e9990' }}>{planName.length}/48</Text>
            </View>

            {/* Total budget */}
            <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>Total Monthly Budget</Text>
            <View className="mb-4 flex-row items-center gap-2 rounded-xl px-4 py-3" style={{ backgroundColor: '#f0f4f2' }}>
              <Text className="font-mono text-sm font-semibold" style={{ color: '#6e9990' }}>₱</Text>
              <BottomSheetTextInput
                keyboardType="decimal-pad"
                value={totalBudget === 0 ? '' : String(totalBudget)}
                onChangeText={handleTotalBudgetChange}
                placeholder="e.g. 30000"
                placeholderTextColor="#6e9990"
                className="flex-1 font-mono text-sm font-semibold"
                style={{ color: '#191c1c', paddingVertical: 0 }}
              />
            </View>

            {/* Mode toggle */}
            <View className="mb-4 flex-row rounded-xl p-1" style={{ backgroundColor: '#f0f4f2' }}>
              {(['amount', 'percent'] as const).map((mode) => {
                const active = allocationMode === mode;
                return (
                  <Pressable key={mode} onPress={() => handleModeToggle(mode)} className="flex-1 items-center rounded-lg py-2" style={{ backgroundColor: active ? '#ffffff' : 'transparent' }}>
                    <Text className="text-xs font-bold" style={{ color: active ? '#00352e' : '#6e9990' }}>{mode === 'amount' ? '₱ Amount' : '% Percent'}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Quick templates */}
            <View className="mb-2 flex-row items-center gap-1.5">
              <Sparkle size={12} weight="fill" color="#1f695d" />
              <Text className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>Quick templates</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              <View className="flex-row gap-2">
                {PLAN_TEMPLATES.map((t) => (
                  <Pressable key={t.label} onPress={() => applyTemplate(t.percents)} className="rounded-full px-3.5 py-1.5" style={{ backgroundColor: '#f0f4f2', borderWidth: 1, borderColor: '#cde0db' }}>
                    <Text className="text-[12px] font-semibold" style={{ color: '#1f695d' }}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Limits header + summary */}
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>Monthly Limits</Text>
              <Text className="font-mono text-[11px] font-semibold" style={{ color: isOver ? '#ba1a1a' : '#1f695d' }}>
                {allocationMode === 'percent'
                  ? `${round2(totalAllocated)}% allocated`
                  : totalBudget > 0
                    ? `${formatCurrency(totalAllocated)} / ${formatCurrency(totalBudget)}`
                    : formatCurrency(totalAllocated)}
              </Text>
            </View>

            {/* Category rows */}
            <View className="gap-2">
              {items.map((item) => {
                const { label, icon, color, isCustom } = getCatDisplay(item.categoryId, customCategories);
                const Icon = getIconComponent(icon);
                const hex = getIconBg({ id: item.categoryId, color });
                const pct = percents[item.categoryId] ?? 0;
                return (
                  <View key={item.categoryId} className="flex-row items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: '#f0f4f2' }}>
                    <View className="h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: '#e7edeb' }}>
                      <Icon size={15} weight="duotone" color={hex} />
                    </View>
                    <Text className="min-w-0 flex-1 text-xs font-semibold" style={{ color: '#191c1c' }} numberOfLines={1}>{label}</Text>
                    {allocationMode === 'amount' ? (
                      <View className="shrink-0 flex-row items-center gap-1">
                        <Text className="font-mono text-xs font-semibold" style={{ color: '#6e9990' }}>₱</Text>
                        <BottomSheetTextInput
                          keyboardType="decimal-pad"
                          value={item.limit === 0 ? '' : String(item.limit)}
                          onChangeText={(v) => handleLimitChange(item.categoryId, v)}
                          placeholder="0"
                          placeholderTextColor="#6e9990"
                          className="w-24 rounded-lg px-2 py-1.5 text-right font-mono text-sm font-semibold"
                          style={{ backgroundColor: '#ffffff', color: '#191c1c', borderWidth: 1, borderColor: '#cde0db' }}
                        />
                      </View>
                    ) : (
                      <View className="shrink-0 items-end gap-0.5">
                        <View className="flex-row items-center gap-1">
                          <BottomSheetTextInput
                            keyboardType="decimal-pad"
                            value={percentDraft?.id === item.categoryId ? percentDraft.text : pct === 0 ? '' : String(pct)}
                            onChangeText={(v) => handlePercentChange(item.categoryId, v)}
                            onBlur={() => setPercentDraft(null)}
                            placeholder="0"
                            placeholderTextColor="#6e9990"
                            className="w-16 rounded-lg px-2 py-1.5 text-right font-mono text-sm font-semibold"
                            style={{ backgroundColor: '#ffffff', color: '#191c1c', borderWidth: 1, borderColor: '#cde0db' }}
                          />
                          <Text className="font-mono text-xs font-semibold" style={{ color: '#6e9990' }}>%</Text>
                        </View>
                        {totalBudget > 0 && (
                          <Text className="font-mono text-[10px]" style={{ color: '#6e9990' }}>≈ {formatCurrency(item.limit)}</Text>
                        )}
                      </View>
                    )}
                    {(isCustom || isHideableCategory(item.categoryId)) && (
                      <Pressable onPress={() => beginHide(item.categoryId)} hitSlop={10} className="h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: '#e7edeb' }}>
                        <EyeSlash size={11} weight="bold" color="#ba1a1a" />
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Add custom category */}
            {showAddCatForm ? (
              <>
                <AddCategoryForm
                  onConfirm={handleAddCustomCategory}
                  onCancel={() => { setShowAddCatForm(false); setAddCatError(null); }}
                  saving={savingCustomCat}
                  InputComponent={BottomSheetTextInput}
                />
                {addCatError && (
                  <Text className="mt-2 rounded-xl px-3 py-2 text-[11px] font-semibold" style={{ backgroundColor: '#ffeaea', color: '#ba1a1a' }}>{addCatError}</Text>
                )}
              </>
            ) : (
              <Pressable
                onPress={() => setShowAddCatForm(true)}
                className="mt-2 flex-row items-center justify-center gap-2 rounded-xl py-2.5"
                style={{ borderWidth: 1.5, borderColor: '#cde0db', borderStyle: 'dashed' }}
              >
                <Plus size={12} weight="bold" color="#1f695d" />
                <Text className="text-xs font-semibold" style={{ color: '#1f695d' }}>Add Category</Text>
              </Pressable>
            )}
          </BottomSheetScrollView>

          {/* Footer */}
          <View className="flex-row gap-3 px-5 pb-6 pt-3" style={{ borderTopWidth: 1, borderTopColor: '#e7edeb' }}>
            <Pressable onPress={backToList} className="flex-1 items-center rounded-xl py-3" style={{ backgroundColor: '#f0f4f2' }}>
              <Text className="text-sm font-semibold" style={{ color: '#3f4946' }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSave} disabled={!planName.trim() || saving} className="flex-1 items-center rounded-xl py-3" style={{ backgroundColor: '#1f695d', opacity: !planName.trim() || saving ? 0.4 : 1 }}>
              <Text className="text-sm font-semibold text-white">{saving ? 'Saving…' : 'Save Plan'}</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* Move-first warning overlay */}
      {hideTarget && (() => {
        const { label } = getCatDisplay(hideTarget, customCategories);
        const count = txnCountFor(hideTarget);
        return (
          <View className="absolute inset-0 z-10 items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,53,46,0.28)' }}>
            <View className="w-full max-w-sm rounded-2xl p-5" style={{ backgroundColor: '#ffffff' }}>
              <View className="mb-3 flex-row items-center gap-2.5">
                <View className="h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(180,83,9,0.12)' }}>
                  <Warning size={17} weight="fill" color="#b45309" />
                </View>
                <Text className="text-sm font-bold" style={{ color: '#00352e' }}>Move transactions first</Text>
              </View>
              <Text className="mb-4 text-[13px] leading-relaxed" style={{ color: '#3f4946' }}>
                <Text className="font-semibold">{label}</Text> has <Text className="font-semibold">{count}</Text>{' '}
                {count === 1 ? 'transaction' : 'transactions'} logged. Recategorize {count === 1 ? 'it' : 'them'} first so
                your history stays accurate, then hide <Text className="font-semibold">{label}</Text>.
              </Text>
              <View className="gap-2">
                <Pressable onPress={() => goMoveTransactions(hideTarget)} className="flex-row items-center justify-center gap-2 rounded-xl py-3" style={{ backgroundColor: '#1f695d' }}>
                  <ArrowsLeftRight size={15} weight="bold" color="#fff" />
                  <Text className="text-sm font-semibold text-white">Move transactions</Text>
                </Pressable>
                <Pressable onPress={() => setHideTarget(null)} className="items-center rounded-xl py-2.5" style={{ backgroundColor: '#f0f4f2' }}>
                  <Text className="text-[13px] font-semibold" style={{ color: '#3f4946' }}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </View>
        );
      })()}
    </BottomSheet>
  );
}
