import { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import {
  Plus, ArrowLeft, Check, Trash, HandCoins, ArrowUp, ArrowDown, CalendarBlank, Warning, PencilSimple,
} from 'phosphor-react-native';
import {
  formatCurrency, formatDate, debtOutstanding, debtDueStatus,
  type Debt, type DebtDirection,
} from '@ledgeit/core';
import { useStore } from '@/lib/store';
import DatePickerSheet from '@/components/ui/DatePickerSheet';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Short human label for a debt's due status, e.g. "Due today", "3d overdue". */
function dueLabel(days: number, state: 'overdue' | 'due_soon' | 'upcoming'): string {
  if (state === 'overdue') return days === -1 ? '1d overdue' : `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days}d`;
}

/**
 * The full debt ledger UI (summary, lists, add/edit form, repayments). Ported
 * from the web DebtLedger into the mobile idiom — no modal/page chrome, so a
 * screen can render it directly. Framer-motion animations are dropped; the
 * inline repayment form toggles via state as on web.
 */
export default function DebtLedger() {
  const debts = useStore((s) => s.debts);
  const addDebt = useStore((s) => s.addDebt);
  const updateDebt = useStore((s) => s.updateDebt);
  const recordDebtRepayment = useStore((s) => s.recordDebtRepayment);
  const toggleDebtSettled = useStore((s) => s.toggleDebtSettled);
  const removeDebt = useStore((s) => s.removeDebt);

  const [view, setView] = useState<'list' | 'add'>('list');
  // Set while editing an existing debt; null when the form is creating a new one.
  const [editingId, setEditingId] = useState<string | null>(null);

  // Add/edit-debt form state
  const [personName, setPersonName] = useState('');
  const [direction, setDirection] = useState<DebtDirection>('owed_to_me');
  const [principal, setPrincipal] = useState('');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState<string | undefined>(undefined);
  const [duePickerOpen, setDuePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Per-debt repayment input + delete confirm
  const [repayFor, setRepayFor] = useState<string | null>(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayInterest, setRepayInterest] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { owedToMe, iOwe, totalOwedToMe, totalIOwe } = useMemo(() => {
    const owed = debts.filter((d) => d.direction === 'owed_to_me');
    const owe = debts.filter((d) => d.direction === 'i_owe');
    const sumOpen = (list: Debt[]) =>
      list.filter((d) => !d.isSettled).reduce((s, d) => s + debtOutstanding(d), 0);
    return { owedToMe: owed, iOwe: owe, totalOwedToMe: sumOpen(owed), totalIOwe: sumOpen(owe) };
  }, [debts]);

  function openAdd() {
    setEditingId(null);
    setPersonName('');
    setDirection('owed_to_me');
    setPrincipal('');
    setNote('');
    setDueDate(undefined);
    setView('add');
  }

  function openEdit(debt: Debt) {
    setEditingId(debt.id);
    setPersonName(debt.personName);
    setDirection(debt.direction);
    setPrincipal(String(debt.principal));
    setNote(debt.note ?? '');
    setDueDate(debt.dueDate);
    setView('add');
  }

  async function handleSave() {
    const amount = parseFloat(principal.replace(/[^0-9.]/g, '')) || 0;
    if (!personName.trim() || amount <= 0) return;
    setSaving(true);
    if (editingId) {
      await updateDebt(editingId, { personName: personName.trim(), direction, principal: amount, note: note.trim() || undefined, dueDate });
    } else {
      await addDebt({ personName: personName.trim(), direction, principal: amount, note: note.trim() || undefined, dueDate, date: todayISO() });
    }
    setSaving(false);
    setEditingId(null);
    setView('list');
  }

  async function handleRepay(debtId: string) {
    const amount = parseFloat(repayAmount.replace(/[^0-9.]/g, '')) || 0;
    const interest = parseFloat(repayInterest.replace(/[^0-9.]/g, '')) || 0;
    // Allow interest-only payments (principal 0) for interest-bearing loans.
    if (amount <= 0 && interest <= 0) return;
    await recordDebtRepayment(debtId, { amount, interest, date: todayISO() });
    setRepayFor(null);
    setRepayAmount('');
    setRepayInterest('');
  }

  async function handleDelete(debtId: string) {
    if (deleteConfirm !== debtId) {
      setDeleteConfirm(debtId);
      return;
    }
    await removeDebt(debtId);
    setDeleteConfirm(null);
  }

  function DebtRow({ debt }: { debt: Debt }) {
    const outstanding = debtOutstanding(debt);
    const repaid = debt.principal - outstanding;
    const pct = debt.principal > 0 ? (repaid / debt.principal) * 100 : 0;
    const isRepaying = repayFor === debt.id;
    const isDeletePending = deleteConfirm === debt.id;
    const accent = debt.direction === 'owed_to_me' ? '#1f6950' : '#b45309';
    const due = debtDueStatus(debt, todayISO());

    return (
      <View
        className="mb-2 rounded-2xl px-4 py-3"
        style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.06, shadowRadius: 20, elevation: 1, opacity: debt.isSettled ? 0.7 : 1 }}
      >
        <View className="flex-row items-center gap-3">
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="shrink text-sm font-semibold" style={{ color: '#191c1c' }} numberOfLines={1}>
                {debt.personName}
              </Text>
              {debt.isSettled && (
                <Text className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ backgroundColor: '#e7edeb', color: '#6e9990' }}>
                  Settled
                </Text>
              )}
              {(due.state === 'overdue' || due.state === 'due_soon') && (
                <View
                  className="shrink-0 flex-row items-center gap-0.5 rounded-full px-2 py-0.5"
                  style={due.state === 'overdue'
                    ? { backgroundColor: 'rgba(186,26,26,0.1)' }
                    : { backgroundColor: 'rgba(180,83,9,0.1)' }}
                >
                  <Warning size={9} weight="fill" color={due.state === 'overdue' ? '#ba1a1a' : '#b45309'} />
                  <Text className="text-[9px] font-bold uppercase tracking-wide" style={{ color: due.state === 'overdue' ? '#ba1a1a' : '#b45309' }}>
                    {dueLabel(due.days, due.state)}
                  </Text>
                </View>
              )}
            </View>
            <Text className="mt-0.5 text-[11px]" style={{ color: '#6e9990' }}>
              {debt.isSettled
                ? `${formatCurrency(debt.principal)} · fully paid`
                : `${formatCurrency(outstanding)} of ${formatCurrency(debt.principal)} left`}
              {!debt.isSettled && due.state === 'upcoming' ? ` · due ${formatDate(debt.dueDate!)}` : ''}
              {debt.note ? ` · ${debt.note}` : ''}
            </Text>
          </View>
          <View className="shrink-0 flex-row items-center gap-1">
            {!debt.isSettled && (
              <Pressable
                onPress={() => { setRepayFor(isRepaying ? null : debt.id); setRepayAmount(''); setRepayInterest(''); }}
                className="h-8 flex-row items-center gap-1 rounded-full px-2.5"
                style={{ backgroundColor: '#e7edeb' }}
              >
                <Plus size={11} weight="bold" color={accent} />
                <Text className="text-[11px] font-bold" style={{ color: accent }}>Repay</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => openEdit(debt)}
              hitSlop={8}
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: '#e7edeb' }}
            >
              <PencilSimple size={13} weight="bold" color="#3f4946" />
            </Pressable>
            <Pressable
              onPress={() => toggleDebtSettled(debt.id)}
              hitSlop={8}
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: debt.isSettled ? '#e7edeb' : accent }}
            >
              <Check size={13} weight="bold" color={debt.isSettled ? '#6e9990' : '#fff'} />
            </Pressable>
            <Pressable
              onPress={() => handleDelete(debt.id)}
              hitSlop={8}
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: isDeletePending ? '#ba1a1a' : '#e7edeb' }}
            >
              <Trash size={13} weight="bold" color={isDeletePending ? '#fff' : '#ba1a1a'} />
            </Pressable>
          </View>
        </View>

        {!debt.isSettled && debt.principal > 0 && (
          <View className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: '#eef2f1' }}>
            <View className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: accent }} />
          </View>
        )}

        {isRepaying && (
          <View className="mt-2.5">
            <View className="flex-row items-stretch gap-2">
              <View className="flex-1 gap-0.5 rounded-lg px-3 py-1.5" style={{ backgroundColor: '#f8faf9', borderWidth: 1, borderColor: '#cde0db' }}>
                <Text className="text-[9px] font-bold uppercase tracking-wide" style={{ color: '#6e9990' }}>Principal</Text>
                <View className="flex-row items-center gap-1">
                  <Text className="font-mono text-sm font-semibold" style={{ color: '#6e9990' }}>₱</Text>
                  <TextInput
                    keyboardType="decimal-pad"
                    value={repayAmount}
                    onChangeText={setRepayAmount}
                    placeholder={`Up to ${formatCurrency(outstanding)}`}
                    placeholderTextColor="#6e9990"
                    className="flex-1 font-mono text-sm font-semibold"
                    style={{ color: '#191c1c', paddingVertical: 0 }}
                  />
                </View>
              </View>
              <View className="w-24 gap-0.5 rounded-lg px-3 py-1.5" style={{ backgroundColor: '#f8faf9', borderWidth: 1, borderColor: '#cde0db' }}>
                <Text className="text-[9px] font-bold uppercase tracking-wide" style={{ color: '#6e9990' }}>
                  {debt.direction === 'owed_to_me' ? 'Interest +' : 'Interest'}
                </Text>
                <View className="flex-row items-center gap-1">
                  <Text className="font-mono text-sm font-semibold" style={{ color: '#6e9990' }}>₱</Text>
                  <TextInput
                    keyboardType="decimal-pad"
                    value={repayInterest}
                    onChangeText={setRepayInterest}
                    placeholder="0"
                    placeholderTextColor="#6e9990"
                    className="flex-1 font-mono text-sm font-semibold"
                    style={{ color: '#191c1c', paddingVertical: 0 }}
                  />
                </View>
              </View>
              <Pressable
                onPress={() => handleRepay(debt.id)}
                className="items-center justify-center rounded-lg px-4"
                style={{ backgroundColor: '#1f695d' }}
              >
                <Text className="text-[12px] font-bold text-white">Record</Text>
              </Pressable>
            </View>
            <Text className="mt-1 text-[10px]" style={{ color: '#6e9990' }}>
              {debt.direction === 'owed_to_me'
                ? 'Principal returns to you (transfer). Any interest counts as income.'
                : 'Principal leaves your pocket (transfer). Any interest counts as an expense.'}
            </Text>
          </View>
        )}
      </View>
    );
  }

  // ── Add / edit form ──────────────────────────────────────────────────────────
  if (view === 'add') {
    const amountValid = (parseFloat(principal.replace(/[^0-9.]/g, '')) || 0) > 0;
    const canSave = !!personName.trim() && amountValid && !saving;
    return (
      <View>
        <View className="mb-4 flex-row items-center gap-3">
          <Pressable
            onPress={() => { setView('list'); setEditingId(null); }}
            className="h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: '#f0f4f2' }}
          >
            <ArrowLeft size={16} weight="bold" color="#3f4946" />
          </Pressable>
          <Text className="text-base font-bold" style={{ color: '#00352e' }}>{editingId ? 'Edit Debt' : 'Track a Debt'}</Text>
        </View>

        {/* Direction toggle */}
        <View className="mb-4 flex-row rounded-xl p-1" style={{ backgroundColor: '#f0f4f2' }}>
          {([
            { id: 'owed_to_me' as const, label: 'I lent out' },
            { id: 'i_owe' as const, label: 'I borrowed' },
          ]).map((opt) => {
            const active = direction === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setDirection(opt.id)}
                className="flex-1 items-center rounded-lg py-2"
                style={{ backgroundColor: active ? '#ffffff' : 'transparent' }}
              >
                <Text className="text-xs font-bold" style={{ color: active ? '#00352e' : '#6e9990' }}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
          {direction === 'owed_to_me' ? 'Who owes you?' : 'Who did you borrow from?'}
        </Text>
        <TextInput
          maxLength={40}
          value={personName}
          onChangeText={setPersonName}
          placeholder="E.g. Juan"
          placeholderTextColor="#6e9990"
          className="mb-4 rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ backgroundColor: '#f0f4f2', color: '#191c1c' }}
        />

        <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>Amount</Text>
        <View className="mb-4 flex-row items-center gap-2 rounded-xl px-4 py-3" style={{ backgroundColor: '#f0f4f2' }}>
          <Text className="font-mono text-sm font-semibold" style={{ color: '#6e9990' }}>₱</Text>
          <TextInput
            keyboardType="decimal-pad"
            value={principal}
            onChangeText={setPrincipal}
            placeholder="0"
            placeholderTextColor="#6e9990"
            className="flex-1 font-mono text-sm font-semibold"
            style={{ color: '#191c1c', paddingVertical: 0 }}
          />
        </View>

        <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
          Note <Text style={{ color: '#6e9990' }}>(optional)</Text>
        </Text>
        <TextInput
          maxLength={60}
          value={note}
          onChangeText={setNote}
          placeholder="E.g. lunch, emergency…"
          placeholderTextColor="#6e9990"
          className="rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ backgroundColor: '#f0f4f2', color: '#191c1c' }}
        />

        <Text className="mb-1.5 mt-4 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
          Expected repayment <Text style={{ color: '#6e9990' }}>(optional)</Text>
        </Text>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => setDuePickerOpen(true)}
            className="flex-1 flex-row items-center gap-2 rounded-xl px-4 py-3"
            style={{ backgroundColor: '#f0f4f2' }}
          >
            <CalendarBlank size={15} weight="regular" color="#6e9990" />
            <Text className="text-sm font-semibold" style={{ color: dueDate ? '#191c1c' : '#6e9990' }}>
              {dueDate ? formatDate(dueDate) : 'Set a due date'}
            </Text>
          </Pressable>
          {dueDate && (
            <Pressable
              onPress={() => setDueDate(undefined)}
              className="h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: '#f0f4f2' }}
            >
              <Trash size={13} weight="bold" color="#6e9990" />
            </Pressable>
          )}
        </View>
        <DatePickerSheet
          open={duePickerOpen}
          value={dueDate ?? todayISO()}
          max="2099-12-31"
          onSelect={(d) => setDueDate(d)}
          onClose={() => setDuePickerOpen(false)}
        />

        <Text className="mt-4 text-[11px] leading-relaxed" style={{ color: '#6e9990' }}>
          {direction === 'owed_to_me'
            ? "Logged as a transfer (money out of your pocket), so it won't count as spending. Repayments return as transfers; only interest counts as income."
            : "Logged as a transfer (money into your pocket), so it won't count as income. Repayments go out as transfers; only interest counts as an expense."}
          {' '}Set a due date to get a reminder as it approaches.
        </Text>

        <View className="mt-6 flex-row gap-3">
          <Pressable
            onPress={() => { setView('list'); setEditingId(null); }}
            className="flex-1 items-center rounded-xl py-3"
            style={{ backgroundColor: '#f0f4f2' }}
          >
            <Text className="text-sm font-semibold" style={{ color: '#3f4946' }}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            className="flex-1 items-center rounded-xl py-3"
            style={{ backgroundColor: '#1f695d', opacity: canSave ? 1 : 0.4 }}
          >
            <Text className="text-sm font-semibold text-white">
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Save Debt'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── List ─────────────────────────────────────────────────────────────────────
  return (
    <View>
      {/* Summary */}
      <View className="mb-4 flex-row gap-2">
        <View className="flex-1 rounded-2xl px-3 py-2.5" style={{ backgroundColor: 'rgba(31,105,80,0.08)' }}>
          <View className="flex-row items-center gap-1">
            <ArrowDown size={11} weight="bold" color="#1f6950" />
            <Text className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#1f6950' }}>Owed to me</Text>
          </View>
          <Text className="mt-0.5 font-mono text-[15px] font-bold" style={{ color: '#00352e' }}>{formatCurrency(totalOwedToMe)}</Text>
        </View>
        <View className="flex-1 rounded-2xl px-3 py-2.5" style={{ backgroundColor: 'rgba(180,83,9,0.08)' }}>
          <View className="flex-row items-center gap-1">
            <ArrowUp size={11} weight="bold" color="#b45309" />
            <Text className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#b45309' }}>I owe</Text>
          </View>
          <Text className="mt-0.5 font-mono text-[15px] font-bold" style={{ color: '#00352e' }}>{formatCurrency(totalIOwe)}</Text>
        </View>
      </View>

      {debts.length === 0 ? (
        <View className="items-center gap-2 py-14">
          <HandCoins size={30} weight="duotone" color="#cde0db" />
          <Text className="text-sm font-medium" style={{ color: '#6e9990' }}>No debts tracked yet.</Text>
          <Text className="text-xs" style={{ color: '#6e9990' }}>Track money you lent out or borrowed.</Text>
        </View>
      ) : (
        <>
          {owedToMe.length > 0 && (
            <>
              <Text className="mb-2 mt-1 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>Owed to me</Text>
              {owedToMe.map((d) => <DebtRow key={d.id} debt={d} />)}
            </>
          )}
          {iOwe.length > 0 && (
            <>
              <Text className="mb-2 mt-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>I owe</Text>
              {iOwe.map((d) => <DebtRow key={d.id} debt={d} />)}
            </>
          )}
        </>
      )}

      <Pressable
        onPress={openAdd}
        className="mt-2 flex-row items-center justify-center gap-2 rounded-2xl py-3"
        style={{ borderWidth: 1.5, borderColor: '#cde0db', borderStyle: 'dashed' }}
      >
        <Plus size={14} weight="bold" color="#1f695d" />
        <Text className="text-sm font-semibold" style={{ color: '#1f695d' }}>Track a Debt</Text>
      </Pressable>
    </View>
  );
}
