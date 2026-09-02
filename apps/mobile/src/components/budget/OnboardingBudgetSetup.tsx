import { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X, Plus, Briefcase, Laptop, Buildings, TrendUp, House,
  Bank, ArrowsLeftRight, ShieldCheck, DotsThree, Check, type Icon,
} from 'phosphor-react-native';
import {
  CATEGORIES, formatCurrency, PLAN_TEMPLATES,
  type BudgetAllocationItem, type CustomCategory,
} from '@ledgeit/core';
import { useStore, DEFAULT_BUDGETS } from '@/lib/store';
import { getIconComponent, getIconBg } from '@/lib/iconMap';
import AddCategoryForm from './AddCategoryForm';

// Budgetable categories exclude income, the "other" catch-all, and the
// non-spending categories (debts + transfers move money between your own
// pockets, so they aren't budgeted).
const EXPENSE_CATEGORIES = CATEGORIES.filter(
  (c) => c.id !== 'income' && c.id !== 'other' && c.id !== 'debts' && c.id !== 'transfers',
);

const INCOME_SOURCES: { id: string; label: string; description: string; Icon: Icon }[] = [
  { id: 'salary', label: 'Salary / Employment', description: 'Monthly wages or fixed employment pay', Icon: Briefcase },
  { id: 'freelance', label: 'Freelance / Side Hustle', description: 'Project-based or part-time work', Icon: Laptop },
  { id: 'business', label: 'Business Revenue', description: 'Income from your own business operations', Icon: Buildings },
  { id: 'inv_returns', label: 'Investment Returns', description: 'Dividends, stocks, UITF, MP2, ETF earnings', Icon: TrendUp },
  { id: 'rental', label: 'Rental Income', description: 'From property, space, or equipment leasing', Icon: House },
  { id: 'bonds', label: 'Bonds & Interest', description: 'Time deposits, bonds, bank savings interest', Icon: Bank },
  { id: 'remittance', label: 'Remittance', description: 'Money received from family abroad', Icon: ArrowsLeftRight },
  { id: 'pension', label: 'Pension / Benefits', description: 'SSS, GSIS, PhilHealth, or government aid', Icon: ShieldCheck },
  { id: 'other_inc', label: 'Other Income', description: 'Any other income sources', Icon: DotsThree },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildDefaultItems(customCats: CustomCategory[] = [], hiddenIds: string[] = []): BudgetAllocationItem[] {
  const presetItems = EXPENSE_CATEGORIES
    .filter((cat) => !hiddenIds.includes(cat.id))
    .map((cat) => ({ categoryId: cat.id, limit: DEFAULT_BUDGETS.find((b) => b.categoryId === cat.id)?.limit ?? 0 }));
  const customItems = customCats.map((cat) => ({ categoryId: cat.id, limit: 0 }));
  return [...presetItems, ...customItems];
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

type Step = 0 | 1 | 2 | 3;
const STEP_COUNT = 4;

function StepDots({ step }: { step: Step }) {
  return (
    <View className="flex-row gap-2">
      {Array.from({ length: STEP_COUNT }).map((_, i) => (
        <View key={i} className="h-1 rounded-full" style={{ width: i === step ? 20 : 8, backgroundColor: i === step ? '#1f695d' : '#cde0db' }} />
      ))}
    </View>
  );
}

/**
 * First-run budget + income setup. A 4-step flow (welcome → name → income →
 * limits) ported from the web OnboardingBudgetSetup. The desktop sidebar is
 * dropped; steps render full-screen. Renders nothing once a budget plan exists
 * or the user dismisses/skips. Mobile store has no auth gate, so we gate on
 * hasSetupBudget() alone.
 */
export default function OnboardingBudgetSetup() {
  const saveBudgetAllocation = useStore((s) => s.saveBudgetAllocation);
  const saveIncomeAllocation = useStore((s) => s.saveIncomeAllocation);
  const hasSetupBudget = useStore((s) => s.hasSetupBudget);
  const customCategories = useStore((s) => s.customCategories);
  const hiddenCategories = useStore((s) => s.hiddenCategories);
  const storeAddCustomCategory = useStore((s) => s.addCustomCategory);

  const [dismissed, setDismissed] = useState(false);
  const [step, setStep] = useState<Step>(0);
  const [planName, setPlanName] = useState('');
  const [items, setItems] = useState<BudgetAllocationItem[]>(() => buildDefaultItems());
  const [saving, setSaving] = useState(false);
  const [showAddCatForm, setShowAddCatForm] = useState(false);
  const [savingCustomCat, setSavingCustomCat] = useState(false);
  const [addCatError, setAddCatError] = useState<string | null>(null);
  const [totalBudget, setTotalBudget] = useState(0);
  const [allocationMode, setAllocationMode] = useState<'amount' | 'percent'>('amount');
  const [percents, setPercents] = useState<Record<string, number>>({});
  const [percentDraft, setPercentDraft] = useState<{ id: string; text: string } | null>(null);
  const [incomeAmounts, setIncomeAmounts] = useState<Record<string, number>>({});

  if (dismissed || hasSetupBudget()) return null;

  function advance() {
    if (step === 2) {
      const total = Object.values(incomeAmounts).reduce((s, v) => s + v, 0);
      if (total > 0) setTotalBudget(total);
    }
    setStep((s) => Math.min(s + 1, 3) as Step);
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0) as Step);
  }

  function pickSuggestedName(name: string) {
    setPlanName(name);
    const template = PLAN_TEMPLATES.find((t) => t.label === name);
    if (!template) return;
    const newPercents: Record<string, number> = {};
    items.forEach((item) => { newPercents[item.categoryId] = template.percents[item.categoryId] ?? 0; });
    setPercents(newPercents);
    if (totalBudget > 0) {
      setItems((prev) => prev.map((item) => ({ ...item, limit: Math.round(((newPercents[item.categoryId] ?? 0) / 100) * totalBudget) })));
    }
    setAllocationMode('percent');
  }

  function handleLimitChange(categoryId: string, raw: string) {
    const num = parseFloat(raw.replace(/[^0-9.]/g, '')) || 0;
    setItems((prev) => prev.map((item) => (item.categoryId === categoryId ? { ...item, limit: num } : item)));
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
    setPercents((prev) => { const next = { ...prev }; delete next[categoryId]; return next; });
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

  async function handleFinish(skipToDefaults = false) {
    setSaving(true);
    const name = skipToDefaults ? 'Regular Month' : planName.trim() || 'Regular Month';
    const finalItems = skipToDefaults ? buildDefaultItems(customCategories, hiddenCategories) : items;
    await saveBudgetAllocation({ name, items: finalItems });
    const incomeItems = Object.entries(incomeAmounts)
      .filter(([, v]) => v > 0)
      .map(([sourceId, amount]) => ({ sourceId, amount }));
    if (incomeItems.length > 0) await saveIncomeAllocation({ name, items: incomeItems });
    setSaving(false);
    setDismissed(true);
  }

  const incomeTotal = Object.values(incomeAmounts).reduce((s, v) => s + v, 0);
  const totalAllocated =
    allocationMode === 'percent'
      ? Object.values(percents).reduce((s, p) => s + p, 0)
      : items.reduce((s, i) => s + i.limit, 0);
  const isOver = allocationMode === 'percent' ? totalAllocated > 100 : totalBudget > 0 && totalAllocated > totalBudget;

  function NavButtons({ canContinue = true, continueLabel = 'Continue' }: { canContinue?: boolean; continueLabel?: string }) {
    return (
      <View className="flex-row gap-3 px-5 pb-5 pt-4" style={{ borderTopWidth: 1, borderTopColor: '#e7edeb' }}>
        {step > 0 && (
          <Pressable onPress={back} className="flex-1 items-center rounded-xl py-3.5" style={{ backgroundColor: '#f0f4f2' }}>
            <Text className="text-sm font-semibold" style={{ color: '#3f4946' }}>Back</Text>
          </Pressable>
        )}
        <Pressable
          onPress={step === 3 ? () => handleFinish(false) : advance}
          disabled={!canContinue || saving}
          className="grow items-center rounded-xl py-3.5"
          style={{ flex: 2, backgroundColor: '#1f695d', opacity: !canContinue || saving ? 0.4 : 1 }}
        >
          <Text className="text-sm font-bold text-white">
            {step === 3 ? (saving ? 'Saving…' : 'Save & Start Tracking') : continueLabel}
          </Text>
        </Pressable>
      </View>
    );
  }

  function CategoryRow({ item }: { item: BudgetAllocationItem }) {
    const { label, icon, color, isCustom } = getCatDisplay(item.categoryId, customCategories);
    const Icon = getIconComponent(icon);
    const hex = getIconBg({ id: item.categoryId, color });
    const pct = percents[item.categoryId] ?? 0;
    return (
      <View className="mb-2 flex-row items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: '#f0f4f2' }}>
        <View className="h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: '#e7edeb' }}>
          <Icon size={15} weight="duotone" color={hex} />
        </View>
        <Text className="min-w-0 flex-1 text-xs font-semibold" style={{ color: '#191c1c' }} numberOfLines={1}>{label}</Text>
        {allocationMode === 'amount' ? (
          <View className="shrink-0 flex-row items-center gap-1">
            <Text className="font-mono text-xs font-semibold" style={{ color: '#6e9990' }}>₱</Text>
            <TextInput
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
              <TextInput
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
        {isCustom && (
          <Pressable onPress={() => removeFromItems(item.categoryId)} className="h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: '#e7edeb' }}>
            <X size={10} weight="bold" color="#ba1a1a" />
          </Pressable>
        )}
      </View>
    );
  }

  const AddCatBlock = (
    showAddCatForm ? (
      <>
        <AddCategoryForm
          onConfirm={handleAddCustomCategory}
          onCancel={() => { setShowAddCatForm(false); setAddCatError(null); }}
          saving={savingCustomCat}
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
    )
  );

  return (
    <SafeAreaView className="absolute inset-0 z-50 flex-1" style={{ backgroundColor: '#f8faf9' }}>
      {/* Top bar: dots + skip */}
      <View className="flex-row items-center justify-between px-5 pt-5">
        <StepDots step={step} />
        <Pressable onPress={() => handleFinish(true)} className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: '#f0f4f2' }}>
          <X size={14} weight="bold" color="#6e9990" />
        </Pressable>
      </View>

      {/* Step 0: Welcome */}
      {step === 0 && (
        <View className="flex-1 justify-center px-5">
          <Text className="mb-3 max-w-xs text-2xl font-bold leading-tight tracking-tight" style={{ color: '#00352e' }}>
            Set your spending limits
          </Text>
          <Text className="mb-10 max-w-sm text-sm leading-relaxed" style={{ color: '#6e9990' }}>
            Create a named budget plan with per-category limits. You can always switch plans or add new ones later.
          </Text>
          <Pressable onPress={advance} className="items-center rounded-2xl py-4" style={{ backgroundColor: '#1f695d' }}>
            <Text className="text-sm font-bold text-white">Get Started</Text>
          </Pressable>
        </View>
      )}

      {/* Step 1: Name */}
      {step === 1 && (
        <View className="flex-1">
          <View className="px-5 pb-4 pt-6">
            <Text className="mb-1 text-xl font-bold" style={{ color: '#00352e' }}>Name your plan</Text>
            <Text className="text-sm" style={{ color: '#6e9990' }}>Give this budget a name so you can identify it later.</Text>
          </View>
          <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            <TextInput
              maxLength={48}
              value={planName}
              onChangeText={setPlanName}
              placeholder="E.g. Regular Month"
              placeholderTextColor="#6e9990"
              className="mb-4 rounded-xl px-4 py-3.5 text-base font-semibold"
              style={{ backgroundColor: '#f0f4f2', color: '#191c1c' }}
            />
            <View className="gap-2">
              {PLAN_TEMPLATES.map((t) => {
                const active = planName === t.label;
                return (
                  <Pressable
                    key={t.label}
                    onPress={() => pickSuggestedName(t.label)}
                    className="flex-row items-start gap-3 rounded-2xl px-4 py-3"
                    style={{ backgroundColor: active ? 'rgba(31,105,93,0.08)' : '#f0f4f2', borderWidth: 1.5, borderColor: active ? '#1f695d' : 'transparent' }}
                  >
                    <View className="min-w-0 flex-1">
                      <Text className="text-[13px] font-bold" style={{ color: '#00352e' }}>{t.label}</Text>
                      <Text className="mt-0.5 text-[11px]" style={{ color: '#6e9990' }}>{t.description}</Text>
                    </View>
                    {active && (
                      <View className="mt-0.5 h-4 w-4 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: '#1f695d' }}>
                        <Check size={9} weight="bold" color="#fff" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <NavButtons canContinue={!!planName.trim()} />
        </View>
      )}

      {/* Step 2: Income */}
      {step === 2 && (
        <View className="flex-1">
          <View className="px-5 pb-4 pt-6">
            <Text className="mb-1 text-xl font-bold" style={{ color: '#00352e' }}>Monthly income</Text>
            <Text className="text-sm" style={{ color: '#6e9990' }}>Enter expected amounts per source. The total becomes your monthly budget.</Text>
          </View>
          <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}>
            <View className="gap-2">
              {INCOME_SOURCES.map(({ id, label, description, Icon }) => (
                <View key={id} className="flex-row items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: '#f0f4f2' }}>
                  <View className="h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: '#e7edeb' }}>
                    <Icon size={15} weight="duotone" color="#1f695d" />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-xs font-semibold" style={{ color: '#191c1c' }}>{label}</Text>
                    <Text className="text-[10px]" style={{ color: '#6e9990' }}>{description}</Text>
                  </View>
                  <View className="shrink-0 flex-row items-center gap-1">
                    <Text className="font-mono text-xs font-semibold" style={{ color: '#6e9990' }}>₱</Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      value={incomeAmounts[id] ? String(incomeAmounts[id]) : ''}
                      onChangeText={(v) => {
                        const num = parseFloat(v.replace(/[^0-9.]/g, '')) || 0;
                        setIncomeAmounts((prev) => ({ ...prev, [id]: num }));
                      }}
                      placeholder="0"
                      placeholderTextColor="#6e9990"
                      className="w-24 rounded-lg px-2 py-1.5 text-right font-mono text-sm font-semibold"
                      style={{ backgroundColor: '#ffffff', color: '#191c1c', borderWidth: 1, borderColor: '#cde0db' }}
                    />
                  </View>
                </View>
              ))}
            </View>
            {incomeTotal > 0 && (
              <View className="mt-4 flex-row items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(31,105,93,0.06)' }}>
                <Text className="text-xs font-bold" style={{ color: '#1f695d' }}>Total Monthly Income</Text>
                <Text className="font-mono text-sm font-bold" style={{ color: '#00352e' }}>{formatCurrency(incomeTotal)}</Text>
              </View>
            )}
          </ScrollView>
          <NavButtons />
        </View>
      )}

      {/* Step 3: Limits */}
      {step === 3 && (
        <View className="flex-1">
          <View className="px-5 pb-3 pt-6">
            <Text className="mb-1 text-xl font-bold" style={{ color: '#00352e' }}>Set monthly limits</Text>
            <Text className="mb-4 text-sm" style={{ color: '#6e9990' }}>Pre-filled with sensible defaults. Adjust as needed.</Text>
            <View className="flex-row items-center gap-3">
              <View className="flex-1 flex-row items-center gap-2 rounded-xl px-4 py-3" style={{ backgroundColor: '#f0f4f2' }}>
                <Text className="font-mono text-sm font-semibold" style={{ color: '#6e9990' }}>₱</Text>
                <TextInput
                  keyboardType="decimal-pad"
                  value={totalBudget === 0 ? '' : String(totalBudget)}
                  onChangeText={handleTotalBudgetChange}
                  placeholder="Total monthly budget"
                  placeholderTextColor="#6e9990"
                  className="flex-1 font-mono text-sm font-semibold"
                  style={{ color: '#191c1c', paddingVertical: 0 }}
                />
              </View>
              <View className="shrink-0 flex-row rounded-xl p-1" style={{ backgroundColor: '#f0f4f2' }}>
                {(['amount', 'percent'] as const).map((mode) => {
                  const active = allocationMode === mode;
                  return (
                    <Pressable key={mode} onPress={() => handleModeToggle(mode)} className="items-center rounded-lg px-4 py-2" style={{ backgroundColor: active ? '#ffffff' : 'transparent' }}>
                      <Text className="text-xs font-bold" style={{ color: active ? '#00352e' : '#6e9990' }}>{mode === 'amount' ? '₱' : '%'}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
          <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            <View className="mb-3 flex-row justify-end">
              <Text className="font-mono text-[11px] font-semibold" style={{ color: isOver ? '#ba1a1a' : '#1f695d' }}>
                {allocationMode === 'percent'
                  ? `${round2(totalAllocated)}% allocated`
                  : totalBudget > 0
                    ? `${formatCurrency(totalAllocated)} / ${formatCurrency(totalBudget)}`
                    : formatCurrency(totalAllocated)}
              </Text>
            </View>
            {items.map((item) => <CategoryRow key={item.categoryId} item={item} />)}
            {AddCatBlock}
          </ScrollView>
          <NavButtons />
        </View>
      )}
    </SafeAreaView>
  );
}
