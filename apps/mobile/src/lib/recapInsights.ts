import type { Transaction, Wallet } from '@ledgeit/core';
import { isReimbursement, isSpend, spendAmount, walletBalance } from '@ledgeit/core';
import type { MonthlyRecap } from '@/lib/monthlyRecap';

// ─── Recap insights ───────────────────────────────────────────────────────────
// Turns a finished month into a few forward-looking nudges for the next one:
// up to two concrete suggestions ("try this") and one "did you know?" drawn
// from the user's own data — or an evergreen tip when the month has nothing
// notable. Pure and rule-based: every number shown is computed from the user's
// entries, so nothing is invented.
//
// Savings and Investments are logged as expense categories, so they count
// toward "spent". They're money SET ASIDE, never something to cut back on.

export type InsightKind = 'action' | 'fact' | 'tip';

export interface RecapInsight {
  id: string;
  kind: InsightKind;
  /** Phosphor icon name (resolved via iconMap). */
  icon: string;
  title: string;
  body: string;
}

const SET_ASIDE = new Set(['savings', 'investments']);
// Day-to-day categories where trimming is a reasonable ask. Essentials (groceries,
// utilities, health, education, kids, family) and giving (church) are never
// framed as "spend less" — an overage there suggests resizing the plan instead.
const FLEXIBLE = new Set(['restaurants', 'shopping', 'entertainment', 'subscriptions', 'personal_care', 'gifts']);
// Wallet kinds that hold money the user is building up, in the order a surplus
// is best directed: safety net first, then goals and savings, then investing.
const SURPLUS_ORDER: Wallet['kind'][] = ['emergency', 'goal', 'savings', 'investment'];

const SMALL_BUY = 200;
const MAX_ACTIONS = 2;

/** Whole-peso amount with separators, e.g. 1240.5 → '₱1,241'. */
function peso(n: number): string {
  return `₱${Math.round(Math.abs(n)).toLocaleString('en-US')}`;
}

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/** Round up to a tidy budget figure (nearest ₱100). */
function tidyUp(n: number): number {
  return Math.ceil(n / 100) * 100;
}

function monthParts(key: string): [number, number] {
  const [y, m] = key.split('-').map(Number);
  return [y, m];
}

function monthLabel(key: string, offset: number): string {
  const [y, m] = monthParts(key);
  return new Date(y, m - 1 + offset, 1).toLocaleDateString('en-US', { month: 'long' });
}

function daysIn(key: string, offset: number): number {
  const [y, m] = monthParts(key);
  return new Date(y, m + offset, 0).getDate();
}

function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TIPS: Omit<RecapInsight, 'kind'>[] = [
  {
    id: 'tip-24h',
    icon: 'Lightbulb',
    title: 'Try the 24-hour rule',
    body: "Before a non-essential buy over ₱1,000, wait a day. If you still want it tomorrow, it's probably worth it.",
  },
  {
    id: 'tip-pay-first',
    icon: 'PiggyBank',
    title: 'Pay yourself first',
    body: "Move your savings the day income lands, not at month-end. What's left is what you get to spend.",
  },
  {
    id: 'tip-subs',
    icon: 'Lightbulb',
    title: 'Check your subscriptions',
    body: "Subscriptions you've stopped using are the easiest savings there are. Cancel one you didn't open this month.",
  },
  {
    id: 'tip-name-it',
    icon: 'Target',
    title: 'Give your money a job',
    body: 'A wallet with a name and a target is easier to keep funding than a vague "someday" pile.',
  },
];

export function buildRecapInsights(
  recap: MonthlyRecap,
  transactions: Transaction[],
  wallets: Wallet[],
): RecapInsight[] {
  if (recap.isEmpty) return [];

  const next = monthLabel(recap.monthKey, 1);
  const weeksNext = daysIn(recap.monthKey, 1) / 7;
  const monthTxns = transactions.filter((t) => t.date.startsWith(recap.monthKey));
  const spends = monthTxns.filter((t) => isSpend(t));
  const setAside = spends
    .filter((t) => SET_ASIDE.has(t.category.id))
    .reduce((s, t) => s + spendAmount(t), 0);
  // Spending the user could actually steer — excludes money set aside.
  const dayToDay = Math.max(0, recap.totalSpent - setAside);
  const openWallets = wallets.filter((w) => !w.isArchived);

  const actions: RecapInsight[] = [];
  const flagged = new Set<string>();

  // ── 1. The worst budget overage (not set-aside categories — saving more than
  // planned isn't a problem).
  const over = recap.overspentCategories.find((o) => !SET_ASIDE.has(o.category.id));
  if (over) {
    const label = over.category.label;
    const overBy = over.spent - over.limit;
    flagged.add(over.category.id);
    actions.push(FLEXIBLE.has(over.category.id)
      ? {
          id: `over-${over.category.id}`,
          kind: 'action',
          icon: over.category.icon,
          title: `Rein in ${label}`,
          body: `${label} went ${peso(overBy)} over budget. Keeping it to about ${peso(over.limit / weeksNext)} a week in ${next} puts you back on plan.`,
        }
      : {
          id: `resize-${over.category.id}`,
          kind: 'action',
          icon: over.category.icon,
          title: `Make ${label}'s budget realistic`,
          body: `${label} ran ${peso(overBy)} over its ${peso(over.limit)} limit. If that's the new normal, raising it to about ${peso(tidyUp(over.spent))} keeps the rest of your plan honest.`,
        });
  }

  // ── 2. Close a shortfall, or put a surplus to work.
  if (recap.netSaved < 0) {
    const short = -recap.netSaved;
    const cover = openWallets
      .filter((w) => w.kind !== 'investment' && walletBalance(w) >= short)
      .sort((a, b) => SURPLUS_ORDER.indexOf(a.kind) - SURPLUS_ORDER.indexOf(b.kind))[0];
    // Don't name a category the overage card already covers.
    const trim = recap.categoryBreakdown.find((c) => FLEXIBLE.has(c.category.id) && !flagged.has(c.category.id));
    const weekly = peso(short / weeksNext);
    const fix = trim
      ? cover
        ? `${cover.name} can cover it — and trimming ${trim.category.label} by about ${weekly} a week in ${next} keeps it from repeating.`
        : `Trimming ${trim.category.label} by about ${weekly} a week in ${next} closes it.`
      : cover
        ? `${cover.name} can cover it — and spending about ${weekly} less a week in ${next} keeps it from repeating.`
        : `Spending about ${weekly} less a week in ${next} closes it.`;
    if (trim) flagged.add(trim.category.id);
    actions.push({
      id: 'shortfall',
      kind: 'action',
      icon: 'Lifebuoy',
      title: 'Close the gap',
      body: `You were ${peso(short)} short in ${monthLabel(recap.monthKey, 0)}. ${fix}`,
    });
  } else if (recap.netSaved >= 500) {
    actions.push(surplusAction(recap.netSaved, openWallets));
  }

  // ── 3. A heavy day-to-day category the overage rule didn't already cover.
  const heavy = recap.categoryBreakdown.find(
    (c) => FLEXIBLE.has(c.category.id) && !flagged.has(c.category.id) && c.spent >= 1000 && c.spent / Math.max(1, dayToDay) >= 0.25,
  );
  if (heavy) {
    actions.push({
      id: `trim-${heavy.category.id}`,
      kind: 'action',
      icon: heavy.category.icon,
      title: `Trim ${heavy.category.label} a little`,
      body: `${heavy.category.label} took ${pct(heavy.spent, dayToDay)}% of your day-to-day spending. Cutting it by 15% in ${next} frees up about ${peso(heavy.spent * 0.15)}.`,
    });
  }

  // ── 4. Sparse logging — the recap can only be as good as the entries.
  const dim = daysIn(recap.monthKey, 0);
  if (recap.daysLogged / dim < 0.35) {
    actions.push({
      id: 'log-more',
      kind: 'action',
      icon: 'PencilLine',
      title: 'Log as you go',
      body: `You logged on ${recap.daysLogged} of ${dim} days. A quick entry right after paying makes ${next}'s recap — and these tips — sharper.`,
    });
  }

  const picked = actions.slice(0, MAX_ACTIONS);
  const fact = pickFact(recap, monthTxns, spends, setAside, dayToDay);
  if (fact) return [...picked, fact];

  // Nothing notable in the data — close with an evergreen tip, rotated by month
  // so consecutive recaps don't repeat.
  const [, m] = monthParts(recap.monthKey);
  const tip = TIPS[m % TIPS.length];
  return [...picked, { ...tip, kind: 'tip' }];
}

function surplusAction(net: number, wallets: Wallet[]): RecapInsight {
  const half = net / 2;
  // An emergency fund that's already full shouldn't keep absorbing the surplus.
  const unfunded = (w: Wallet) => !w.target || walletBalance(w) < w.target;
  const fullEmergency = wallets.find((w) => w.kind === 'emergency' && w.target && walletBalance(w) >= w.target);
  const investing = wallets.find((w) => w.kind === 'investment');
  if (fullEmergency && investing) {
    return {
      id: 'surplus-invest',
      kind: 'action',
      icon: 'TrendUp',
      title: 'Let the extra grow',
      body: `Your ${fullEmergency.name} is fully funded. Pointing half of the ${peso(net)} you kept at ${investing.name} puts it to work.`,
    };
  }
  const target = wallets
    .filter((w) => w.kind !== 'investment' && unfunded(w))
    .sort((a, b) => SURPLUS_ORDER.indexOf(a.kind) - SURPLUS_ORDER.indexOf(b.kind))[0] ?? investing;
  if (!target) {
    return {
      id: 'surplus-home',
      kind: 'action',
      icon: 'PiggyBank',
      title: 'Give your savings a home',
      body: `You kept ${peso(net)}. A Savings wallet keeps it out of everyday spending — and lets you watch it grow.`,
    };
  }
  if (target.target && target.target > 0) {
    const from = pct(walletBalance(target), target.target);
    const to = Math.min(100, pct(walletBalance(target) + half, target.target));
    return {
      id: `surplus-${target.id}`,
      kind: 'action',
      icon: target.icon,
      title: `Grow ${target.name}`,
      body: `You kept ${peso(net)}. Moving half into ${target.name} takes it from ${from}% to ${to}% of its goal.`,
    };
  }
  return {
    id: `surplus-${target.id}`,
    kind: 'action',
    icon: target.icon,
    title: `Park it in ${target.name}`,
    body: `You kept ${peso(net)}. Moving ${peso(half)} into ${target.name} keeps it from drifting back into everyday spending.`,
  };
}

// The single most notable pattern in the month's own data, in priority order.
function pickFact(
  recap: MonthlyRecap,
  monthTxns: Transaction[],
  spends: Transaction[],
  setAside: number,
  dayToDay: number,
): RecapInsight | null {
  const steerable = spends.filter((t) => !SET_ASIDE.has(t.category.id) && !isReimbursement(t));

  // Many small buys that quietly add up.
  const small = steerable.filter((t) => t.amount <= SMALL_BUY);
  const smallTotal = small.reduce((s, t) => s + t.amount, 0);
  if (small.length >= 8 && smallTotal >= dayToDay * 0.06) {
    return {
      id: 'fact-small',
      kind: 'fact',
      icon: 'Coins',
      title: 'Small buys add up',
      body: `${small.length} purchases under ${peso(SMALL_BUY)} came to ${peso(smallTotal)} — ${pct(smallTotal, dayToDay)}% of your day-to-day spending.`,
    };
  }

  // Recurring bills and subscriptions.
  const recurring = steerable.filter((t) => t.isRecurring);
  const recurringTotal = recurring.reduce((s, t) => s + spendAmount(t), 0);
  if (recurring.length >= 2 && recurringTotal > 0) {
    return {
      id: 'fact-recurring',
      kind: 'fact',
      icon: 'CreditCard',
      title: 'Your fixed costs',
      body: `${recurring.length} recurring bills and subscriptions came to ${peso(recurringTotal)} — ${pct(recurringTotal, dayToDay)}% of day-to-day spending, before you'd bought a thing.`,
    };
  }

  // Weekend-heavy spending, measured against how many weekend days the month had.
  const dim = daysIn(recap.monthKey, 0);
  const [y, m] = monthParts(recap.monthKey);
  let weekendDays = 0;
  for (let d = 1; d <= dim; d++) {
    const wd = new Date(y, m - 1, d).getDay();
    if (wd === 0 || wd === 6) weekendDays++;
  }
  let weekendSpend = 0;
  let totalDaily = 0;
  const byWeekday = [0, 0, 0, 0, 0, 0, 0];
  for (const [date, spent] of Object.entries(recap.dailySpend)) {
    const wd = weekdayOf(date);
    totalDaily += spent;
    byWeekday[wd] += spent;
    if (wd === 0 || wd === 6) weekendSpend += spent;
  }
  const weekendShare = totalDaily > 0 ? weekendSpend / totalDaily : 0;
  const dayShare = weekendDays / dim;
  if (totalDaily > 0 && weekendShare >= 0.4 && weekendShare - dayShare >= 0.12) {
    return {
      id: 'fact-weekend',
      kind: 'fact',
      icon: 'Sun',
      title: 'Weekends cost more',
      body: `Weekends were ${Math.round(weekendShare * 100)}% of your spending, on just ${Math.round(dayShare * 100)}% of the days.`,
    };
  }

  // One weekday that clearly costs more than the rest, on average.
  if (totalDaily > 0) {
    const occurrences = [0, 0, 0, 0, 0, 0, 0];
    for (let d = 1; d <= dim; d++) occurrences[new Date(y, m - 1, d).getDay()]++;
    const avgs = byWeekday.map((s, i) => s / occurrences[i]);
    const peak = avgs.indexOf(Math.max(...avgs));
    const typical = totalDaily / dim;
    if (avgs[peak] >= typical * 1.6 && byWeekday[peak] > 0) {
      return {
        id: 'fact-weekday',
        kind: 'fact',
        icon: 'Sparkle',
        title: `${WEEKDAYS[peak]}s ran pricey`,
        body: `You spent about ${peso(avgs[peak])} on an average ${WEEKDAYS[peak]}, against ${peso(typical)} on a typical day.`,
      };
    }
  }

  // Money set aside, as a share of income.
  if (setAside > 0 && recap.totalIncome > 0) {
    return {
      id: 'fact-set-aside',
      kind: 'fact',
      icon: 'Vault',
      title: 'Quietly building',
      body: `You set aside ${peso(setAside)} into savings and investments — ${pct(setAside, recap.totalIncome)}% of what you earned.`,
    };
  }

  // Entries logged — only worth a fact when there were plenty.
  if (monthTxns.length >= 40) {
    return {
      id: 'fact-entries',
      kind: 'fact',
      icon: 'Trophy',
      title: 'A well-kept ledger',
      body: `You logged ${monthTxns.length} entries — about ${Math.round(monthTxns.length / dim * 7)} a week.`,
    };
  }
  return null;
}
