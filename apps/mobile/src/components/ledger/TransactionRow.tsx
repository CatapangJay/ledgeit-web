import { View, Text, Pressable } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Trash, Check } from 'phosphor-react-native';
import { formatCurrency, formatDate, resolvePaymentMethod, isReimbursement, type Transaction } from '@ledgeit/core';
import { getIconComponent, getIconBg } from '@/lib/iconMap';
import { useLinkedWallet } from '@/lib/walletLinks';

interface Props {
  tx: Transaction;
  onDelete: (id: string) => void;
  onEdit: (tx: Transaction) => void;
  /** Selection mode: when true, the row shows a checkbox and taps toggle it. */
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

function RightAction({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="w-20 items-center justify-center"
      style={{ backgroundColor: 'rgba(186,26,26,0.08)' }}
    >
      <Trash size={16} weight="fill" color="#ba1a1a" />
    </Pressable>
  );
}

export default function TransactionRow({ tx, onDelete, onEdit, selectMode = false, selected = false, onToggleSelect }: Props) {
  const Icon = getIconComponent(tx.category.icon);
  const hex = getIconBg({ id: tx.category.id, color: tx.category.color });
  // In select mode a row is selectable only if a toggle handler was provided
  // (debt-linked rows pass none — they can't be bulk-reassigned).
  const selectable = selectMode && !!onToggleSelect;
  const isIncome = tx.type === 'income';
  const isTransfer = tx.type === 'transfer';
  // A reimbursement is a credit back (money returned), so it reads green with a
  // '+' like income even though it lives under a spend category.
  const isRefund = isReimbursement(tx);
  // Transfers move money between the user's own pockets — shown neutrally with no
  // +/− since they're neither spending nor income.
  const amountColor = isTransfer ? '#6e9990' : isIncome || isRefund ? '#1f6950' : '#ba1a1a';
  const amountSign = isTransfer ? '' : isIncome || isRefund ? '+' : '−';
  const method = resolvePaymentMethod(tx.paymentMethod);
  const MethodIcon = getIconComponent(method.icon);
  // If this transaction is linked to a wallet (paid from / saved into one via
  // Smart Entry), surface a small wallet chip so the connection is visible from
  // the ledger, not just the Wallets screen. Backed by a map memoized on the
  // wallets reference, so all rows share one scan per wallet change.
  const linkedWallet = useLinkedWallet(tx.id);
  const WalletChipIcon = linkedWallet ? getIconComponent(linkedWallet.icon) : null;

  const body = (
    <Pressable
      onPress={() => {
        if (selectMode) {
          if (selectable) onToggleSelect!(tx.id);
          return;
        }
        onEdit(tx);
      }}
      className="flex-row items-center gap-3 px-4 py-3.5 active:opacity-80"
      style={{ backgroundColor: selected ? '#eef5f2' : '#ffffff', opacity: selectMode && !selectable ? 0.45 : 1 }}
    >
      {/* Selection checkbox (placeholder keeps alignment for non-selectable debt rows) */}
      {selectMode &&
        (selectable ? (
          <View
            className="h-5 w-5 shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: selected ? '#1f695d' : '#ffffff', borderWidth: 1.5, borderColor: selected ? '#1f695d' : '#cde0db' }}
          >
            {selected && <Check size={12} weight="bold" color="#ffffff" />}
          </View>
        ) : (
          <View className="h-5 w-5 shrink-0" />
        ))}

      {/* Icon */}
      <View className="h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: hex }}>
        <Icon size={16} weight="fill" color="#ffffff" />
      </View>

      {/* Details */}
      <View className="min-w-0 flex-1">
        <View className="flex-row items-baseline justify-between gap-3">
          <Text className="shrink text-sm font-semibold" style={{ color: '#191c1c' }} numberOfLines={1}>
            {tx.merchant}
          </Text>
          <Text className="shrink-0 font-mono text-sm font-bold" style={{ color: amountColor }}>
            {amountSign}
            {formatCurrency(tx.amount)}
          </Text>
        </View>
        <View className="mt-0.5 flex-row flex-wrap items-center gap-1.5">
          <Text className="text-xs" style={{ color: hex, opacity: 0.9 }}>
            {tx.category.label}
          </Text>
          {isRefund && (
            <View className="rounded-full px-1.5 py-0.5" style={{ backgroundColor: 'rgba(31,105,80,0.1)' }}>
              <Text className="text-[10px] font-semibold" style={{ color: '#1f6950' }}>
                Refund
              </Text>
            </View>
          )}
          <Text className="text-xs" style={{ color: '#cde0db' }}>
            ·
          </Text>
          <Text className="font-mono text-xs" style={{ color: '#6e9990' }}>
            {formatDate(tx.date)}
          </Text>
          {/* Payment method tag — cash is the quiet default, so only show a
              distinct label for non-cash methods to keep the line clean. */}
          {tx.paymentMethod !== 'cash' && (
            <>
              <Text className="text-xs" style={{ color: '#cde0db' }}>
                ·
              </Text>
              <View className="flex-row items-center gap-1">
                <MethodIcon size={11} weight="regular" color="#6e9990" />
                <Text className="text-xs" style={{ color: '#6e9990' }}>
                  {method.short}
                </Text>
              </View>
            </>
          )}
          {/* Wallet link chip — shows which wallet this entry drew from / added to. */}
          {linkedWallet && (
            <View className="flex-row items-center gap-1 rounded-full px-1.5 py-0.5" style={{ backgroundColor: 'rgba(31,105,93,0.1)' }}>
              {WalletChipIcon && <WalletChipIcon size={10} weight="fill" color="#1f695d" />}
              <Text className="text-[10px] font-semibold" style={{ color: '#1f695d' }}>
                {linkedWallet.name}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );

  // Swipe-to-delete is disabled in select mode (taps toggle selection instead).
  if (selectMode) return body;

  return (
    <Swipeable renderRightActions={() => <RightAction onPress={() => onDelete(tx.id)} />} overshootRight={false}>
      {body}
    </Swipeable>
  );
}
