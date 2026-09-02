import { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { X, CalendarBlank, CheckCircle, CircleIcon as Circle, Wallet as WalletIcon, ArrowUUpLeft } from 'phosphor-react-native';
import {
  CATEGORIES, PAYMENT_METHODS, resolvePaymentMethod, formatCurrency, formatDate,
  type Category, type TransactionDraft, type CustomCategory, type PaymentMethodId,
  type DebtDirection, type Wallet,
} from '@ledgeit/core';
import CategoryBadge from './CategoryBadge';
import DatePickerSheet from '@/components/ui/DatePickerSheet';
import { getIconComponent, getIconBg } from '@/lib/iconMap';
import { useStore } from '@/lib/store';

interface Props {
  draft: TransactionDraft;
  category: Category;
  confidence: number;
  customCategories?: CustomCategory[];
  onCategoryChange?: (cat: Category) => void;
  onMerchantChange?: (name: string) => void;
  onDateChange?: (date: string) => void;
  onPaymentMethodChange?: (method: PaymentMethodId) => void;
  /** Debt entries only: current lent-out vs borrowed direction. */
  debtDirection?: DebtDirection;
  onDebtDirectionChange?: (direction: DebtDirection) => void;
  /** Debt entries only: optional expected-repayment date (ISO YYYY-MM-DD). */
  debtDueDate?: string;
  onDebtDueDateChange?: (date: string | undefined) => void;
  /** Bulk mode: whether this entry is selected for logging */
  selected?: boolean;
  onToggleSelect?: () => void;
  /** Bulk mode: entry already logged */
  logged?: boolean;
  /** Wallets the entry can be paid from / saved into. */
  wallets?: Wallet[];
  /** Currently chosen wallet id, or undefined for none. */
  walletId?: string;
  onWalletChange?: (walletId: string | undefined) => void;
  /** Spend entries only: whether this is a refund/reimbursement credited back. */
  isReimbursement?: boolean;
  onReimbursementChange?: (v: boolean) => void;
}

// Inline category picker (presets minus hidden + custom), ported from web.
function InlineCategoryPicker({
  currentId, customCategories, hiddenCategories = [], onSelect, onClose,
}: {
  currentId: string;
  customCategories: CustomCategory[];
  hiddenCategories?: string[];
  onSelect: (cat: Category) => void;
  onClose: () => void;
}) {
  const allCategories: Category[] = [
    ...CATEGORIES.filter((c) => !hiddenCategories.includes(c.id) || c.id === currentId),
    ...customCategories.map((c) => ({
      id: c.id, label: c.name, icon: c.icon, color: c.textColor, bgColor: c.bgColor, keywords: [] as string[],
    })),
  ];
  return (
    <View className="mb-3 rounded-2xl p-3" style={{ backgroundColor: '#f0f4f2', borderWidth: 1, borderColor: '#e7edeb' }}>
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-[11px] font-semibold" style={{ color: '#3f4946' }}>Correct category</Text>
        <Pressable onPress={onClose} className="h-5 w-5 items-center justify-center">
          <X size={11} weight="bold" color="#6e9990" />
        </Pressable>
      </View>
      <View className="flex-row flex-wrap">
        {allCategories.map((cat) => {
          const Icon = getIconComponent(cat.icon);
          const active = cat.id === currentId;
          const hex = getIconBg({ id: cat.id, color: cat.color });
          return (
            <View key={cat.id} style={{ width: `${100 / 3}%` }} className="p-0.5">
              <Pressable
                onPress={() => onSelect(cat)}
                className="items-center gap-1 rounded-xl py-2.5"
                style={{ backgroundColor: active ? `${hex}1a` : 'transparent' }}
              >
                <Icon size={15} weight={active ? 'fill' : 'regular'} color={active ? hex : '#6e9990'} />
                <Text className="text-[10px] font-medium leading-none" style={{ color: active ? hex : '#6e9990' }} numberOfLines={1}>
                  {cat.label.split(/[\s&]/)[0]}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Parsed-transaction preview card for Smart Entry. Ported from the web
 * ParsePreview: amount + editable category / merchant / date / method, optional
 * wallet link, debt-direction toggle, and bulk-select checkbox. Framer-motion
 * stagger animations are dropped; picker toggles are plain state as on web.
 */
export default function ParsePreview({
  draft, category, confidence, customCategories = [], onCategoryChange, onMerchantChange,
  onDateChange, onPaymentMethodChange, debtDirection, onDebtDirectionChange, debtDueDate,
  onDebtDueDateChange, selected, onToggleSelect, logged = false, wallets = [], walletId, onWalletChange,
  isReimbursement = false, onReimbursementChange,
}: Props) {
  void confidence;
  const hiddenCategories = useStore((s) => s.hiddenCategories);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [duePickerOpen, setDuePickerOpen] = useState(false);
  const [methodPickerOpen, setMethodPickerOpen] = useState(false);
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState(false);
  const [merchantInput, setMerchantInput] = useState('');

  const isIncome = draft.type === 'income';
  const isTransfer = draft.type === 'transfer';
  const isDebt = category.id === 'debts';
  const isBulk = onToggleSelect !== undefined;
  const method = resolvePaymentMethod(draft.paymentMethod);
  const canLinkWallet = onWalletChange && wallets.length > 0 && !isDebt && !isTransfer;
  // A refund/reimbursement toggle only applies to real spend categories.
  const canReimburse = onReimbursementChange && draft.type === 'expense' && !isDebt;
  const selectedWallet = wallets.find((w) => w.id === walletId);

  function startEditMerchant() {
    if (!onMerchantChange) return;
    setMerchantInput(draft.merchant && draft.merchant !== 'Unknown' ? draft.merchant : '');
    setEditingMerchant(true);
  }

  function commitMerchant() {
    const trimmed = merchantInput.trim();
    if (trimmed) onMerchantChange?.(trimmed);
    setEditingMerchant(false);
  }

  const MethodIcon = getIconComponent(method.icon);
  const formatted = draft.amount !== null ? formatCurrency(draft.amount) : null;

  return (
    <View
      className="mt-3 rounded-2xl p-4"
      style={{
        backgroundColor: logged ? 'rgba(31,105,93,0.05)' : isIncome ? 'rgba(31,105,93,0.06)' : '#ffffff',
        borderWidth: 1,
        borderColor: logged
          ? 'rgba(31,105,93,0.18)'
          : pickerOpen ? '#1f695d' : isIncome ? 'rgba(31,105,93,0.2)' : '#e7edeb',
        opacity: logged ? 0.55 : 1,
      }}
    >
      {/* Row 1: Amount + category pill + bulk checkbox */}
      <View className="flex-row items-center gap-2">
        <Text
          className="font-mono font-bold tracking-tight shrink-0 max-w-[48%]"
          numberOfLines={1}
          style={{
            fontSize: !formatted ? 24 : formatted.length > 16 ? 16 : formatted.length > 13 ? 18 : 24,
            color: draft.amount === null ? '#6e9990' : isIncome ? '#1f6950' : '#191c1c',
          }}
        >
          {formatted ?? 'no amount'}
        </Text>

        <View className="flex-1 min-w-0">
          {onCategoryChange && !logged ? (
            <Pressable
              onPress={() => setPickerOpen((o) => !o)}
              className="flex-row items-center gap-1 self-start rounded-md px-2 py-0.5"
              style={{ backgroundColor: `${getIconBg({ id: category.id, color: category.color })}1a` }}
            >
              <Text className="text-[11px] font-medium" style={{ color: getIconBg({ id: category.id, color: category.color }) }}>
                {category.label}
              </Text>
              <Text className="text-[11px]" style={{ color: getIconBg({ id: category.id, color: category.color }), opacity: 0.5 }}>▾</Text>
            </Pressable>
          ) : (
            <CategoryBadge category={category} size="sm" />
          )}
        </View>

        {isBulk && !logged && (
          <Pressable onPress={onToggleSelect} className="h-6 w-6 shrink-0 items-center justify-center">
            {selected
              ? <CheckCircle size={20} weight="fill" color="#1f695d" />
              : <Circle size={20} weight="regular" color="#cde0db" />}
          </Pressable>
        )}
        {isBulk && logged && <CheckCircle size={18} weight="fill" color="#1f6950" />}
      </View>

      {/* Row 2: Merchant name (left) + Date (right) */}
      <View className="mt-2 flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1">
          {editingMerchant ? (
            <TextInput
              value={merchantInput}
              onChangeText={setMerchantInput}
              onBlur={commitMerchant}
              onSubmitEditing={commitMerchant}
              autoFocus
              placeholder="Enter merchant name"
              placeholderTextColor="#6e9990"
              className="border-b py-0.5 text-[13px] font-semibold"
              style={{ borderColor: '#1f695d', color: '#191c1c', paddingVertical: 0 }}
            />
          ) : (
            <Pressable onPress={startEditMerchant} disabled={!onMerchantChange || logged}>
              <Text className="text-[13px] font-semibold" numberOfLines={1} style={{ color: draft.merchant && draft.merchant !== 'Unknown' ? '#191c1c' : '#6e9990' }}>
                {draft.merchant && draft.merchant !== 'Unknown' ? draft.merchant : 'Unknown — tap to set'}
              </Text>
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => { if (!logged && onDateChange) setDatePickerOpen(true); }}
          disabled={logged || !onDateChange}
          className="shrink-0 flex-row items-center gap-1"
        >
          <CalendarBlank size={11} weight="regular" color="#6e9990" />
          <Text className="text-[11px] font-medium" style={{ color: '#6e9990' }}>{formatDate(draft.date)}</Text>
        </Pressable>
        {onDateChange && (
          <DatePickerSheet
            open={datePickerOpen}
            value={draft.date}
            onSelect={(date) => onDateChange(date)}
            onClose={() => setDatePickerOpen(false)}
          />
        )}
      </View>

      {/* Row 3: Payment method chip */}
      <View className="mt-2 flex-row items-center gap-2">
        {onPaymentMethodChange && !logged ? (
          <Pressable
            onPress={() => setMethodPickerOpen((o) => !o)}
            className="flex-row items-center gap-1.5 self-start rounded-md px-2 py-1"
            style={{ backgroundColor: '#f0f4f2' }}
          >
            <MethodIcon size={12} weight="bold" color="#3f4946" />
            <Text className="text-[11px] font-semibold" style={{ color: '#3f4946' }}>{method.label}</Text>
            <Text className="text-[11px]" style={{ color: '#3f4946', opacity: 0.5 }}>▾</Text>
          </Pressable>
        ) : (
          <View className="flex-row items-center gap-1.5 self-start rounded-md px-2 py-1" style={{ backgroundColor: '#f0f4f2' }}>
            <MethodIcon size={12} weight="bold" color="#6e9990" />
            <Text className="text-[11px] font-semibold" style={{ color: '#6e9990' }}>{method.label}</Text>
          </View>
        )}
      </View>

      {/* Inline payment-method picker */}
      {methodPickerOpen && onPaymentMethodChange && (
        <View className="mt-2 flex-row flex-wrap rounded-2xl p-2" style={{ backgroundColor: '#f0f4f2', borderWidth: 1, borderColor: '#e7edeb' }}>
          {PAYMENT_METHODS.map((m) => {
            const Icon = getIconComponent(m.icon);
            const active = m.id === draft.paymentMethod;
            return (
              <View key={m.id} style={{ width: `${100 / 3}%` }} className="p-0.5">
                <Pressable
                  onPress={() => { onPaymentMethodChange(m.id); setMethodPickerOpen(false); }}
                  className="flex-row items-center justify-center gap-1.5 rounded-xl py-2"
                  style={{ backgroundColor: active ? '#1f695d' : '#ffffff' }}
                >
                  <Icon size={13} weight={active ? 'fill' : 'regular'} color={active ? '#ffffff' : '#3f4946'} />
                  <Text className="text-[11px] font-semibold" style={{ color: active ? '#ffffff' : '#3f4946' }}>{m.short}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* Wallet link */}
      {canLinkWallet && !logged && (
        <View className="mt-2">
          <Pressable
            onPress={() => setWalletPickerOpen((o) => !o)}
            className="flex-row items-center gap-1.5 self-start rounded-md px-2 py-1"
            style={{ backgroundColor: '#f0f4f2' }}
          >
            {selectedWallet
              ? (() => { const Icon = getIconComponent(selectedWallet.icon); return <Icon size={12} weight="fill" color="#1f695d" />; })()
              : <WalletIcon size={12} weight="regular" color="#6e9990" />}
            <Text className="text-[11px] font-semibold" style={{ color: selectedWallet ? '#1f695d' : '#6e9990' }}>
              {selectedWallet ? `${isIncome ? 'Into' : 'From'} ${selectedWallet.name}` : isIncome ? 'Save into a wallet' : 'Pay from a wallet'}
            </Text>
            <Text className="text-[11px]" style={{ color: selectedWallet ? '#1f695d' : '#6e9990', opacity: 0.5 }}>▾</Text>
          </Pressable>

          {walletPickerOpen && (
            <View className="mt-2 flex-row flex-wrap rounded-2xl p-2" style={{ backgroundColor: '#f0f4f2', borderWidth: 1, borderColor: '#e7edeb' }}>
              <View style={{ width: '50%' }} className="p-0.5">
                <Pressable
                  onPress={() => { onWalletChange?.(undefined); setWalletPickerOpen(false); }}
                  className="items-center justify-center rounded-xl py-2"
                  style={{ backgroundColor: walletId === undefined ? '#1f695d' : '#ffffff' }}
                >
                  <Text className="text-[11px] font-semibold" style={{ color: walletId === undefined ? '#ffffff' : '#3f4946' }}>None</Text>
                </Pressable>
              </View>
              {wallets.map((w) => {
                const Icon = getIconComponent(w.icon);
                const active = w.id === walletId;
                return (
                  <View key={w.id} style={{ width: '50%' }} className="p-0.5">
                    <Pressable
                      onPress={() => { onWalletChange?.(w.id); setWalletPickerOpen(false); }}
                      className="flex-row items-center justify-center gap-1.5 rounded-xl py-2"
                      style={{ backgroundColor: active ? '#1f695d' : '#ffffff' }}
                    >
                      <Icon size={13} weight={active ? 'fill' : 'regular'} color={active ? '#ffffff' : '#3f4946'} />
                      <Text className="text-[11px] font-semibold" numberOfLines={1} style={{ color: active ? '#ffffff' : '#3f4946' }}>{w.name}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
          {selectedWallet && (
            <Text className="mt-1.5 text-[11px] leading-relaxed" style={{ color: '#6e9990' }}>
              {isIncome ? `Adds to ${selectedWallet.name}'s balance.` : `Comes out of ${selectedWallet.name}'s balance.`}
            </Text>
          )}
        </View>
      )}

      {/* Debt direction toggle */}
      {isDebt && onDebtDirectionChange && !logged && (
        <View className="mt-3">
          <View className="flex-row rounded-xl p-1" style={{ backgroundColor: '#f0f4f2' }}>
            {([
              { id: 'owed_to_me' as const, label: 'They owe me' },
              { id: 'i_owe' as const, label: 'I owe them' },
            ]).map((opt) => {
              const active = (debtDirection ?? 'owed_to_me') === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => onDebtDirectionChange(opt.id)}
                  className="flex-1 items-center rounded-lg py-1.5"
                  style={{ backgroundColor: active ? '#ffffff' : 'transparent' }}
                >
                  <Text className="text-[11px] font-bold" style={{ color: active ? '#00352e' : '#6e9990' }}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="mt-1.5 text-[11px] leading-relaxed" style={{ color: '#6e9990' }}>
            {(debtDirection ?? 'owed_to_me') === 'owed_to_me'
              ? 'Tracked in Debts as money out now; repayments come back as income.'
              : 'Tracked in Debts as money in now; your repayments go out as expense.'}
          </Text>

          {onDebtDueDateChange && (
            <View className="mt-2 flex-row items-center gap-2">
              <Pressable
                onPress={() => setDuePickerOpen(true)}
                className="flex-1 flex-row items-center gap-1.5 rounded-lg px-3 py-2"
                style={{ backgroundColor: '#f0f4f2' }}
              >
                <CalendarBlank size={12} weight="regular" color="#6e9990" />
                <Text className="text-[11px] font-semibold" style={{ color: debtDueDate ? '#3f4946' : '#6e9990' }}>
                  {debtDueDate ? `Due ${formatDate(debtDueDate)}` : 'Set a due date'}
                </Text>
              </Pressable>
              {debtDueDate && (
                <Pressable
                  onPress={() => onDebtDueDateChange(undefined)}
                  className="h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: '#f0f4f2' }}
                >
                  <X size={11} weight="bold" color="#6e9990" />
                </Pressable>
              )}
              <DatePickerSheet
                open={duePickerOpen}
                value={debtDueDate ?? draft.date}
                max="2099-12-31"
                onSelect={(d) => onDebtDueDateChange(d)}
                onClose={() => setDuePickerOpen(false)}
              />
            </View>
          )}
        </View>
      )}

      {/* Transfer hint */}
      {isTransfer && !logged && (
        <Text className="mt-2 text-[11px] font-medium" style={{ color: '#6e9990' }}>
          Transfer — not counted as spending.
        </Text>
      )}

      {/* Reimbursement toggle — spend categories only. When on, the entry is a
          credit back that reduces this category's spending instead of adding. */}
      {canReimburse && !logged && (
        <View className="mt-3">
          <Pressable
            onPress={() => onReimbursementChange?.(!isReimbursement)}
            className="flex-row items-center gap-3 rounded-xl px-4 py-3"
            style={{
              backgroundColor: isReimbursement ? 'rgba(31,105,80,0.08)' : '#ffffff',
              borderWidth: 1,
              borderColor: isReimbursement ? '#1f695d' : '#e7edeb',
            }}
          >
            <View className="h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: isReimbursement ? '#1f695d' : '#f0f4f2' }}>
              <ArrowUUpLeft size={15} weight="bold" color={isReimbursement ? '#ffffff' : '#6e9990'} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[13px] font-semibold" style={{ color: '#191c1c' }}>
                Reimbursement
              </Text>
              <Text className="text-[11px]" style={{ color: '#6e9990' }}>
                Refunds, rebates, and money paid back
              </Text>
            </View>
            {/* Switch */}
            <View className="relative h-5 w-9 shrink-0 rounded-full" style={{ backgroundColor: isReimbursement ? '#1f695d' : '#cde0db' }}>
              <View className="absolute h-4 w-4 rounded-full bg-white" style={{ top: 2, left: isReimbursement ? 18 : 2 }} />
            </View>
          </Pressable>
          {isReimbursement && (
            <Text className="mt-1.5 text-[11px] leading-relaxed" style={{ color: '#6e9990' }}>
              Credited back — reduces this category&apos;s spending instead of adding to it.
            </Text>
          )}
        </View>
      )}

      {/* Inline category picker */}
      {pickerOpen && onCategoryChange && (
        <View className="mt-2">
          <InlineCategoryPicker
            currentId={category.id}
            customCategories={customCategories}
            hiddenCategories={hiddenCategories}
            onSelect={(cat) => { onCategoryChange(cat); setPickerOpen(false); }}
            onClose={() => setPickerOpen(false)}
          />
        </View>
      )}
    </View>
  );
}
