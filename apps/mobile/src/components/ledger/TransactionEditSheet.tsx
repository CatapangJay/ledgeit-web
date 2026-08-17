import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { CaretLeft, CaretRight, Trash, X } from 'phosphor-react-native';
import {
  CATEGORIES,
  PAYMENT_METHODS,
  formatDate,
  type Category,
  type CustomCategory,
  type PaymentMethodId,
  type Transaction,
  type TransactionType,
} from '@ledgeit/core';
import { getIconComponent } from '@/lib/iconMap';

interface Props {
  /** The transaction to edit, or null when the sheet is closed. */
  tx: Transaction | null;
  customCategories?: CustomCategory[];
  onClose: () => void;
  onSave: (id: string, patch: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
}

/** Category id → the transaction type it implies. */
function typeForCategory(catId: string): TransactionType {
  if (catId === 'income') return 'income';
  if (catId === 'transfers') return 'transfer';
  return 'expense';
}

function shiftDate(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const next = new Date(y, m - 1, d + deltaDays);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

/**
 * Bottom-sheet editor for an already-logged transaction: amount, merchant,
 * category, date, and payment method. Mirrors the web TransactionEditSheet's
 * fields; the calendar picker is simplified to a ±1 day stepper on mobile.
 *
 * Debt-linked transactions (category "debts") are read-only here — editing them
 * would desync the Debt record, so the user is pointed to the Debts screen.
 */
export default function TransactionEditSheet({ tx, customCategories = [], onClose, onSave, onDelete }: Props) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['78%'], []);

  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>(CATEGORIES[0]);
  const [date, setDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>('cash');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [seededId, setSeededId] = useState<string | null>(null);

  const open = tx !== null;

  useEffect(() => {
    if (open) {
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [open]);

  // Seed local form state whenever a different transaction opens.
  if (tx && seededId !== tx.id) {
    setSeededId(tx.id);
    setMerchant(tx.merchant === 'Unknown' ? '' : tx.merchant);
    setAmount(String(tx.amount));
    setCategory(tx.category);
    setDate(tx.date);
    setPaymentMethod(tx.paymentMethod);
    setConfirmDelete(false);
  }
  if (!tx && seededId !== null) setSeededId(null);

  const isDebt = tx?.category.id === 'debts';
  const allCategories: Category[] = [
    ...CATEGORIES.filter((c) => c.id !== 'debts'),
    ...customCategories.map((c) => ({ id: c.id, label: c.name, icon: c.icon, color: c.textColor, bgColor: c.bgColor, keywords: [] as string[] })),
  ];

  const amountNum = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
  const canSave = !isDebt && amountNum > 0;

  function handleSave() {
    if (!tx || !canSave) return;
    onSave(tx.id, {
      merchant: merchant.trim() || 'Unknown',
      amount: amountNum,
      category,
      date,
      paymentMethod,
      type: typeForCategory(category.id),
    });
    onClose();
  }

  function handleDelete() {
    if (!tx) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(tx.id);
    onClose();
  }

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
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pb-3" style={{ borderBottomWidth: 1, borderBottomColor: '#e7edeb' }}>
        <Text className="text-[15px] font-bold" style={{ color: '#00352e' }}>
          Edit Entry
        </Text>
        <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: '#f0f4f2' }}>
          <X size={14} weight="bold" color="#3f4946" />
        </Pressable>
      </View>

      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 24 }}>
        {isDebt ? (
          <Text className="rounded-xl px-4 py-3 text-[12px] leading-relaxed" style={{ backgroundColor: '#f0f4f2', color: '#6e9990' }}>
            This entry is linked to a tracked debt. Edit it from the Debts &amp; Loans screen so its balance and
            repayments stay in sync.
          </Text>
        ) : (
          <>
            {/* Amount */}
            <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
              Amount
            </Text>
            <View className="mb-4 flex-row items-center gap-2 rounded-xl px-4 py-3" style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7edeb' }}>
              <Text className="font-mono text-sm font-semibold" style={{ color: '#6e9990' }}>
                ₱
              </Text>
              <BottomSheetTextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                className="flex-1 font-mono text-sm font-semibold"
                style={{ color: '#191c1c', paddingVertical: 0 }}
              />
            </View>

            {/* Merchant / name */}
            <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
              Name
            </Text>
            <BottomSheetTextInput
              value={merchant}
              onChangeText={setMerchant}
              maxLength={60}
              placeholder="Merchant or description"
              className="mb-4 rounded-xl px-4 py-3 text-sm font-semibold"
              style={{ backgroundColor: '#ffffff', color: '#191c1c', borderWidth: 1, borderColor: '#e7edeb' }}
            />

            {/* Date stepper */}
            <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
              Date
            </Text>
            <View className="mb-4 flex-row items-center justify-between rounded-xl px-3 py-2" style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7edeb' }}>
              <Pressable onPress={() => setDate((d) => shiftDate(d, -1))} className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: '#f0f4f2' }}>
                <CaretLeft size={12} weight="bold" color="#3f4946" />
              </Pressable>
              <Text className="text-[13px] font-semibold" style={{ color: '#191c1c' }}>
                {formatDate(date)}
              </Text>
              <Pressable onPress={() => setDate((d) => shiftDate(d, 1))} className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: '#f0f4f2' }}>
                <CaretRight size={12} weight="bold" color="#3f4946" />
              </Pressable>
            </View>

            {/* Payment method chips */}
            <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
              Method
            </Text>
            <View className="mb-4 flex-row flex-wrap gap-1.5">
              {PAYMENT_METHODS.map((m) => {
                const active = paymentMethod === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setPaymentMethod(m.id)}
                    className="rounded-full px-3.5 py-1.5"
                    style={{ backgroundColor: active ? '#475569' : '#f0f4f2' }}
                  >
                    <Text className="text-[12px] font-semibold" style={{ color: active ? '#ffffff' : '#3f4946' }}>
                      {m.short}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Category grid */}
            <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
              Category
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {allCategories.map((cat) => {
                const active = cat.id === category.id;
                const Icon = getIconComponent(cat.icon);
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setCategory(cat)}
                    className="items-center gap-1 rounded-xl py-2.5"
                    style={{ width: '31%', backgroundColor: active ? '#e7f0ed' : '#ffffff', borderWidth: active ? 0 : 1, borderColor: '#e7edeb' }}
                  >
                    <Icon size={15} weight={active ? 'fill' : 'regular'} color={active ? '#1f695d' : '#6e9990'} />
                    <Text className="text-[10px] font-medium leading-none" style={{ color: active ? '#1f695d' : '#6e9990' }} numberOfLines={1}>
                      {cat.label.split(/[\s&]/)[0]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </BottomSheetScrollView>

      {/* Footer */}
      <View className="flex-row items-center gap-2 px-5 pb-6 pt-3" style={{ borderTopWidth: 1, borderTopColor: '#e7edeb' }}>
        <Pressable
          onPress={handleDelete}
          className="h-11 flex-row items-center gap-1.5 rounded-2xl px-4"
          style={{ backgroundColor: confirmDelete ? '#ba1a1a' : '#f0f4f2' }}
        >
          <Trash size={14} weight="bold" color={confirmDelete ? '#ffffff' : '#ba1a1a'} />
          <Text className="text-[13px] font-bold" style={{ color: confirmDelete ? '#ffffff' : '#ba1a1a' }}>
            {confirmDelete ? 'Confirm' : 'Delete'}
          </Text>
        </Pressable>
        {!isDebt && (
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            className="h-11 flex-1 items-center justify-center rounded-2xl"
            style={{ backgroundColor: '#1f695d', opacity: canSave ? 1 : 0.4 }}
          >
            <Text className="text-sm font-bold text-white">Save Changes</Text>
          </Pressable>
        )}
      </View>
    </BottomSheet>
  );
}
