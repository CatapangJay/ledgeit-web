import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { CheckCircle, Sparkle, X } from 'phosphor-react-native';
import {
  parseTransaction,
  parseDebtDirection,
  parseDebtPerson,
  categorize,
  getMerchantKey,
  buildHistoryOverrides,
  getMerchantSuggestions,
  resolveMerchant,
  type Category,
  type MerchantSuggestion,
  type Transaction,
  type TransactionDraft,
} from '@ledgeit/core';
import { useStore } from '@/lib/store';
import ParsePreview from './ParsePreview';

interface Props {
  open: boolean;
  onClose: () => void;
  /** When set (ISO YYYY-MM-DD), a newly parsed entry defaults to this day unless
   *  the text carries its own inline date (which always wins). */
  initialDate?: string;
}

const EXAMPLES = [
  '20 mcdonalds lunch',
  'grab 85 morning commute',
  'received 25000 salary',
  '1200 shopee haul',
  'netflix 649',
  'meralco bill 1740',
];

interface ParseResult {
  draft: TransactionDraft;
  category: Category;
  confidence: number;
}

let entrySeq = 0;
function newId(): string {
  entrySeq += 1;
  return `entry-${Date.now().toString(36)}-${entrySeq}`;
}

/**
 * Native Smart Entry sheet — quick free-text transaction entry. Mirrors the web
 * SmartEntrySheet's quick-entry path: debounced parse → fuzzy merchant resolve →
 * categorize → editable ParsePreview → log. Multi-entry (bulk) mode is deferred.
 */
export default function SmartEntrySheet({ open, onClose, initialDate }: Props) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['85%'], []);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [input, setInput] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [merchantSuggestions, setMerchantSuggestions] = useState<MerchantSuggestion[]>([]);
  const [rawMerchant, setRawMerchant] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [quickWalletId, setQuickWalletId] = useState<string | undefined>(undefined);

  const addTransaction = useStore((s) => s.addTransaction);
  const addDebt = useStore((s) => s.addDebt);
  const attachWalletMovement = useStore((s) => s.attachWalletMovement);
  const learnCategory = useStore((s) => s.learnCategory);
  const learnedMerchants = useStore((s) => s.learnedMerchants);
  const transactions = useStore((s) => s.transactions);
  const customCategories = useStore((s) => s.customCategories);
  const wallets = useStore((s) => s.wallets);
  const activeWallets = useMemo(() => wallets.filter((w) => !w.isArchived), [wallets]);

  useEffect(() => {
    if (open) sheetRef.current?.expand();
    else sheetRef.current?.close();
  }, [open]);

  // Cycle placeholder examples.
  useEffect(() => {
    const interval = setInterval(() => {
      setExampleIndex((i) => (i + 1) % EXAMPLES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // Reset transient state when the sheet opens.
  useEffect(() => {
    if (open) setSuccess(false);
  }, [open]);

  // Derive history merchants (name + frequency) from logged transactions.
  const historyMerchants = useMemo(() => {
    const freq = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.merchant && tx.merchant !== 'Unknown') {
        freq.set(tx.merchant, (freq.get(tx.merchant) ?? 0) + 1);
      }
    }
    return [...freq.entries()].map(([name, f]) => ({ name, freq: f }));
  }, [transactions]);

  // Category overrides = learned-from-history + explicit in-session corrections.
  const categoryOverrides = useMemo(
    () => ({ ...buildHistoryOverrides(transactions), ...learnedMerchants }),
    [transactions, learnedMerchants],
  );

  const handleChange = useCallback(
    (val: string) => {
      setInput(val);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (!val.trim()) {
        setParseResult(null);
        setMerchantSuggestions([]);
        setRawMerchant(null);
        setIsAnalyzing(false);
        return;
      }
      setIsAnalyzing(true);
      setParseResult(null);
      setMerchantSuggestions([]);
      setRawMerchant(null);
      timerRef.current = setTimeout(() => {
        // Pass the selected day as the parser's context date: an inline date in
        // the text wins, otherwise the entry falls back to `initialDate`.
        const draft = parseTransaction(val, initialDate);

        // Fuzzy merchant resolution.
        const suggestions = getMerchantSuggestions(draft.merchant, historyMerchants);
        const resolved = resolveMerchant(draft.merchant, historyMerchants);
        const wasResolved = resolved && resolved !== draft.merchant;
        const resolvedDraft = resolved ? { ...draft, merchant: resolved } : draft;

        const { category, confidence } = categorize(resolvedDraft, categoryOverrides, customCategories);

        const altSuggestions = resolved ? suggestions.filter((s) => s.name !== resolved) : suggestions;

        setRawMerchant(wasResolved ? draft.merchant : null);
        setParseResult({ draft: resolvedDraft, category, confidence });
        setMerchantSuggestions(altSuggestions.slice(0, 2));
        setIsAnalyzing(false);
      }, 400);
    },
    [categoryOverrides, customCategories, historyMerchants, initialDate],
  );

  const handleLog = useCallback(() => {
    if (!parseResult?.draft.amount) return;
    // Debt entries route to the Debts ledger; addDebt creates the linked ledger
    // transaction itself, so addTransaction is skipped to avoid double-counting.
    if (parseResult.category.id === 'debts') {
      const direction = parseDebtDirection(parseResult.draft.raw) ?? 'owed_to_me';
      const person = parseDebtPerson(parseResult.draft.raw) ?? parseResult.draft.merchant;
      addDebt({
        personName: person || 'Someone',
        direction,
        principal: parseResult.draft.amount,
        date: parseResult.draft.date,
      });
    } else {
      const txId = newId();
      const tx: Transaction = {
        id: txId,
        raw: parseResult.draft.raw,
        amount: parseResult.draft.amount,
        merchant: parseResult.draft.merchant,
        category: parseResult.category,
        date: parseResult.draft.date,
        type: parseResult.draft.type,
        isReimbursement: parseResult.draft.isReimbursement,
        paymentMethod: parseResult.draft.paymentMethod,
        confidence: parseResult.confidence,
        createdAt: new Date().toISOString(),
      };
      addTransaction(tx);
      // Mirror the money movement onto a chosen wallet's balance: an expense is a
      // withdrawal, income a deposit. The tx above IS the movement — only attach.
      if (quickWalletId && (parseResult.draft.type === 'expense' || parseResult.draft.type === 'income')) {
        attachWalletMovement(quickWalletId, {
          type: parseResult.draft.type === 'income' ? 'deposit' : 'withdrawal',
          amount: parseResult.draft.amount,
          date: parseResult.draft.date,
          transactionId: txId,
        });
      }
    }
    setSuccess(true);
    setTimeout(() => {
      setInput('');
      setParseResult(null);
      setQuickWalletId(undefined);
      setSuccess(false);
      onClose();
    }, 1000);
  }, [parseResult, addTransaction, addDebt, attachWalletMovement, quickWalletId, onClose]);

  const canLog = !success && (parseResult?.draft.amount ?? null) !== null;

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      keyboardBehavior="interactive"
      android_keyboardInputMode="adjustResize"
      backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />}
      backgroundStyle={{ backgroundColor: '#f8faf9' }}
      handleIndicatorStyle={{ backgroundColor: '#cde0db' }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pb-3" style={{ borderBottomWidth: 1, borderBottomColor: '#e7edeb' }}>
        <View className="flex-row items-center gap-2">
          <Sparkle size={15} weight="fill" color="#1f695d" />
          <Text className="text-[15px] font-bold" style={{ color: '#00352e' }}>
            Smart Log
          </Text>
        </View>
        <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: '#f0f4f2' }}>
          <X size={14} weight="bold" color="#3f4946" />
        </Pressable>
      </View>

      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32 }}>
        {success ? (
          <View className="mt-2 flex-row items-center justify-center gap-2 rounded-2xl py-6" style={{ backgroundColor: 'rgba(31,105,93,0.1)' }}>
            <CheckCircle size={18} weight="fill" color="#1f6950" />
            <Text className="text-sm font-semibold" style={{ color: '#1f6950' }}>
              Transaction logged
            </Text>
          </View>
        ) : (
          <>
            {/* Freeform text input */}
            <BottomSheetTextInput
              value={input}
              onChangeText={handleChange}
              placeholder={`try: ${EXAMPLES[exampleIndex]}`}
              placeholderTextColor="#8eaeaa"
              multiline
              autoFocus
              className="text-[22px] font-light leading-snug"
              style={{ color: '#191c1c', minHeight: 64, paddingVertical: 0 }}
            />

            {isAnalyzing && (
              <Text className="mt-2 text-xs font-medium" style={{ color: '#6e9990' }}>
                Analyzing…
              </Text>
            )}

            {/* Merchant suggestion chips */}
            {!isAnalyzing && parseResult && (rawMerchant || merchantSuggestions.length > 0) && (
              <View className="mt-2 flex-row flex-wrap items-center gap-1.5">
                {rawMerchant && (
                  <>
                    <Text className="text-[11px] font-medium" style={{ color: '#6e9990' }}>
                      Not right?
                    </Text>
                    <Pressable
                      onPress={() => {
                        setParseResult((prev) => (prev ? { ...prev, draft: { ...prev.draft, merchant: rawMerchant } } : prev));
                        setRawMerchant(null);
                      }}
                      className="rounded-full px-3 py-0.5"
                      style={{ backgroundColor: 'rgba(31,105,93,0.1)', borderWidth: 1, borderColor: 'rgba(31,105,93,0.2)' }}
                    >
                      <Text className="text-[11px] font-semibold" style={{ color: '#1f695d' }}>
                        Use: {rawMerchant}
                      </Text>
                    </Pressable>
                  </>
                )}
                {merchantSuggestions.length > 0 && (
                  <Text className="text-[11px] font-medium" style={{ color: '#6e9990' }}>
                    {rawMerchant ? 'or:' : 'Also:'}
                  </Text>
                )}
                {merchantSuggestions.map((s) => (
                  <Pressable
                    key={s.name}
                    onPress={() => setParseResult((prev) => (prev ? { ...prev, draft: { ...prev.draft, merchant: s.name } } : prev))}
                    className="rounded-full px-3 py-0.5"
                    style={{ backgroundColor: '#f0f4f2', borderWidth: 1, borderColor: '#e7edeb' }}
                  >
                    <Text className="text-[11px] font-semibold" style={{ color: '#3f4946' }}>
                      {s.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Parse preview card */}
            {parseResult && !isAnalyzing && (
              <View className="mt-4">
                <ParsePreview
                  draft={parseResult.draft}
                  category={parseResult.category}
                  confidence={parseResult.confidence}
                  customCategories={customCategories}
                  onMerchantChange={(name) =>
                    setParseResult((prev) => (prev ? { ...prev, draft: { ...prev.draft, merchant: name } } : prev))
                  }
                  onCategoryChange={(cat) => {
                    const newType = cat.id === 'income' ? 'income' : cat.id === 'transfers' ? 'transfer' : 'expense';
                    setParseResult((prev) =>
                      prev
                        ? {
                            ...prev,
                            category: cat,
                            // A reimbursement flag only makes sense on a spend category;
                            // clear it whenever the entry stops being an expense.
                            draft: { ...prev.draft, type: newType, isReimbursement: newType === 'expense' ? prev.draft.isReimbursement : false },
                          }
                        : prev,
                    );
                    if (parseResult?.draft) learnCategory(getMerchantKey(parseResult.draft), cat.id);
                  }}
                  isReimbursement={parseResult.draft.isReimbursement}
                  onReimbursementChange={(v) =>
                    setParseResult((prev) => (prev ? { ...prev, draft: { ...prev.draft, isReimbursement: v } } : prev))
                  }
                  onDateChange={(date) =>
                    setParseResult((prev) => (prev ? { ...prev, draft: { ...prev.draft, date } } : prev))
                  }
                  onPaymentMethodChange={(paymentMethod) =>
                    setParseResult((prev) => (prev ? { ...prev, draft: { ...prev.draft, paymentMethod } } : prev))
                  }
                  wallets={activeWallets}
                  walletId={quickWalletId}
                  onWalletChange={setQuickWalletId}
                />
              </View>
            )}
          </>
        )}
      </BottomSheetScrollView>

      {/* Footer */}
      {!success && (
        <View className="flex-row gap-3 px-5 pb-8 pt-3" style={{ borderTopWidth: 1, borderTopColor: '#e7edeb' }}>
          <Pressable onPress={onClose} className="flex-1 items-center rounded-2xl py-4" style={{ backgroundColor: '#f0f4f2' }}>
            <Text className="text-sm font-semibold" style={{ color: '#6e9990' }}>
              Discard
            </Text>
          </Pressable>
          <Pressable
            onPress={handleLog}
            disabled={!canLog}
            className="flex-1 items-center rounded-2xl py-4"
            style={{ backgroundColor: '#1f695d', opacity: canLog ? 1 : 0.3 }}
          >
            <Text className="text-sm font-bold tracking-wide text-white">Log Transaction</Text>
          </Pressable>
        </View>
      )}
    </BottomSheet>
  );
}
