import { Text, View, useWindowDimensions } from 'react-native';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '@ledgeit/core';
import type { MonthlyRecap } from '@/lib/monthlyRecap';
import type { RecapInsight } from '@/lib/recapInsights';
import {
  ACCENT, DANGER_ON_DARK, F, FIELD, INK, INK_DIM, INK_HAIRLINE, TABULAR,
  catHex, daysInMonth, deepen, headline, liftOnDark, longDate, monoFit, monthName, nextMonthName, nextMonthNudge,
} from './theme';
import { CategoryGlyph, CountUpText, GUTTER, GrowBar, MiniStat, PageFrame, Reveal, T } from './parts';

// ─── Story pages ─────────────────────────────────────────────────────────────
// One idea per page, each on its own full-bleed field. `buildPages` decides
// which pages this month has data for; `StoryPage` renders one of them.

export type PageId =
  | 'intro' | 'spent' | 'earned' | 'top' | 'where' | 'biggest'
  | 'weekly' | 'rhythm' | 'budget' | 'carryover' | 'next' | 'outro';

export interface PageDef {
  id: PageId;
  bg: string;
  /** Auto-advance time in ms; null = the page waits for the user. */
  duration: number | null;
  /** Screen-reader summary of the page's content. */
  a11y: string;
}

const compact = formatCurrencyCompact;
const pctOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export function hasCarryover(recap: MonthlyRecap): boolean {
  return recap.hasBudget && recap.carryoverCandidates.length > 0;
}

export function buildPages(recap: MonthlyRecap, insights: RecapInsight[]): PageDef[] {
  const month = monthName(recap);
  const pages: PageDef[] = [];
  const h = headline(recap);

  pages.push({ id: 'intro', bg: FIELD.canvas, duration: 5000, a11y: `Your ${recap.label} recap. ${h.sub}` });

  if (recap.totalSpent > 0) {
    const ctx = recap.totalIncome > 0
      ? `${pctOf(recap.totalSpent, recap.totalIncome)}% of what you earned`
      : `about ${compact(recap.avgDailySpend)} a day`;
    pages.push({ id: 'spent', bg: FIELD.deep, duration: 5500, a11y: `You spent ${formatCurrency(recap.totalSpent)} in ${month}, ${ctx}.` });
  }

  if (recap.totalIncome > 0) {
    const pct = Math.round(Math.abs(recap.savingsRate) * 100);
    const what = recap.netSaved > 0
      ? `You kept ${pct}% of what you earned`
      : recap.netSaved === 0 ? 'You broke even' : `You spent ${pct}% more than you earned`;
    pages.push({
      id: 'earned',
      bg: recap.netSaved > 0 ? FIELD.gain : FIELD.canvas,
      duration: 6000,
      a11y: `${what}. Earned ${formatCurrency(recap.totalIncome)}, net ${formatCurrency(recap.netSaved)}.`,
    });
  }

  if (recap.topCategory) {
    const t = recap.topCategory;
    pages.push({
      id: 'top',
      bg: deepen(catHex(t.category.id)),
      duration: 5500,
      a11y: `Top category: ${t.category.label}, ${formatCurrency(t.spent)}, ${pctOf(t.spent, recap.totalSpent)}% of your spending.`,
    });
  }

  if (recap.categoryBreakdown.length >= 2) {
    const top = recap.categoryBreakdown.slice(0, 5);
    pages.push({
      id: 'where',
      bg: FIELD.canvas,
      duration: 7500,
      a11y: `Where it went: ${top.map((c, i) => `${i + 1}, ${c.category.label}, ${compact(c.spent)}`).join('; ')}.`,
    });
  }

  if (recap.biggestExpense) {
    const b = recap.biggestExpense;
    pages.push({
      id: 'biggest',
      bg: deepen(catHex(b.category.id)),
      duration: 5500,
      a11y: `Biggest expense: ${b.merchant}, ${formatCurrency(b.amount)}, on ${longDate(b.date, { month: 'long', day: 'numeric' })}.`,
    });
  }

  if (recap.weeklySpend.some((v) => v > 0)) {
    const max = Math.max(...recap.weeklySpend);
    const wk = recap.weeklySpend.indexOf(max) + 1;
    pages.push({
      id: 'weekly',
      bg: FIELD.teal,
      duration: 6500,
      a11y: `Weekly pace: your heaviest week was week ${wk}, ${compact(max)}. Weeks: ${recap.weeklySpend.map((v, i) => `week ${i + 1} ${compact(v)}`).join(', ')}.`,
    });
  }

  if (recap.transactionCount > 0) {
    const busiest = recap.busiestDay
      ? ` Busiest day ${longDate(recap.busiestDay.date, { month: 'long', day: 'numeric' })}, ${compact(recap.busiestDay.spent)}.`
      : '';
    pages.push({
      id: 'rhythm',
      bg: FIELD.deep,
      duration: 6000,
      a11y: `You logged on ${recap.daysLogged} of ${daysInMonth(recap.monthKey)} days, ${recap.transactionCount} entries.${busiest}`,
    });
  }

  if (recap.hasBudget) {
    const over = recap.overspentCategories;
    pages.push({
      id: 'budget',
      bg: FIELD.canvas,
      duration: over.length > 0 ? 7500 : 5500,
      a11y: `${recap.budgetCategoriesUnder} of ${recap.budgetCategoriesTracked} categories under budget.${over.length > 0 ? ` Over: ${over.map((o) => o.category.label).join(', ')}.` : ''}`,
    });
  }

  if (hasCarryover(recap)) {
    pages.push({ id: 'carryover', bg: FIELD.teal, duration: null, a11y: 'Carry over leftovers and overages into next month.' });
  }

  if (insights.length > 0) {
    pages.push({
      id: 'next',
      bg: FIELD.deep,
      // Reading-heavy: a little time per card on top of a base.
      duration: 4000 + insights.length * 3000,
      a11y: `For ${nextMonthName(recap.monthKey)}: ${insights.map((i) => `${KIND_LABEL[i.kind]}: ${i.title}. ${i.body}`).join(' ')}`,
    });
  }

  pages.push({
    id: 'outro',
    bg: FIELD.canvas,
    duration: null,
    a11y: `${h.title} Spent ${compact(recap.totalSpent)}, earned ${compact(recap.totalIncome)}, net ${compact(recap.netSaved)}.`,
  });

  return pages;
}

// ─── Shared reveal type ────────────────────────────────────────────────────────
const giantWord = (size: number) => ({
  fontFamily: F.display,
  fontSize: size,
  lineHeight: Math.round(size * 1.04),
  letterSpacing: -size * 0.045,
  color: INK,
  includeFontPadding: false,
});

const giantMono = (size: number, color = INK) => ({
  fontFamily: F.mono,
  fontSize: size,
  lineHeight: Math.round(size * 1.1),
  letterSpacing: -size * 0.05,
  color,
  includeFontPadding: false,
  ...TABULAR,
});

function useContentWidth(): number {
  return useWindowDimensions().width - GUTTER * 2;
}

type PageProps = { recap: MonthlyRecap; def: PageDef; insights: RecapInsight[]; animateIt: boolean };

// ─── 1. Intro ─────────────────────────────────────────────────────────────────
function IntroPage({ recap, def, animateIt }: PageProps) {
  const month = monthName(recap);
  return (
    <PageFrame bg={def.bg} eyebrow="Monthly recap" numeral={recap.monthKey.slice(5)} footer="Tap to begin" label={recap.label} animateIt={animateIt}>
      <Reveal animateIt={animateIt} delay={120}>
        <Text style={T.lead}>Your</Text>
      </Reveal>
      <Reveal animateIt={animateIt} delay={240}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={giantWord(92)}>{month},</Text>
      </Reveal>
      <Reveal animateIt={animateIt} delay={380}>
        <Text style={[giantWord(92), { color: ACCENT }]}>ledged.</Text>
      </Reveal>
      <Reveal animateIt={animateIt} delay={620}>
        <Text style={[T.context, { marginTop: 24, maxWidth: 320 }]}>{headline(recap).sub}</Text>
      </Reveal>
    </PageFrame>
  );
}

// ─── 2. Spent ─────────────────────────────────────────────────────────────────
function SpentPage({ recap, def, animateIt }: PageProps) {
  const w = useContentWidth();
  const size = monoFit(formatCurrency(recap.totalSpent), w);
  const context = recap.totalIncome > 0
    ? `That's ${pctOf(recap.totalSpent, recap.totalIncome)}% of the ${compact(recap.totalIncome)} you earned.`
    : `Around ${compact(recap.avgDailySpend)} a day, across all of ${monthName(recap)}.`;
  return (
    <PageFrame bg={def.bg} eyebrow="Spent" numeral="₱" footer="Hold to pause" label={recap.label} animateIt={animateIt}>
      <Reveal animateIt={animateIt} delay={100}>
        <Text style={T.lead}>In {monthName(recap)} you spent</Text>
      </Reveal>
      <Reveal animateIt={animateIt} delay={220} style={{ marginTop: 8 }}>
        <CountUpText value={recap.totalSpent} format={formatCurrency} delay={260} animateIt={animateIt} style={giantMono(size)} />
      </Reveal>
      <Reveal animateIt={animateIt} delay={900}>
        <Text style={[T.context, { marginTop: 16 }]}>{context}</Text>
      </Reveal>
      <Reveal animateIt={animateIt} delay={1100} style={{ flexDirection: 'row', gap: 20, marginTop: 32 }}>
        <MiniStat label="Per day" value={`≈ ${compact(recap.avgDailySpend)}`} />
        <MiniStat label="Categories" value={String(recap.categoryBreakdown.length)} />
      </Reveal>
    </PageFrame>
  );
}

// ─── 3. Earned & saved ────────────────────────────────────────────────────────
// The savings rate is the reveal. A negative month is stated plainly in the
// overspend tone — no celebration, no scolding.
function EarnedPage({ recap, def, animateIt }: PageProps) {
  const w = useContentWidth();
  const pct = Math.round(Math.abs(recap.savingsRate) * 100);
  const negative = recap.netSaved < 0;
  const lead = recap.netSaved > 0 ? 'You kept' : recap.netSaved === 0 ? 'You broke even and saved' : 'You spent';
  const after = recap.netSaved > 0
    ? 'of what you earned.'
    : recap.netSaved === 0 ? 'of what you earned — a clean slate for next month.' : 'more than you earned. It happens — the aim is to even out over time.';
  const size = monoFit(`${pct}%`, w, 120, 64);
  return (
    <PageFrame bg={def.bg} eyebrow="Earned & saved" numeral={String(pct)} label={recap.label} animateIt={animateIt}>
      <Reveal animateIt={animateIt} delay={100}>
        <Text style={T.lead}>{lead}</Text>
      </Reveal>
      <Reveal animateIt={animateIt} delay={220}>
        <CountUpText
          value={pct}
          format={(n) => `${n}%`}
          delay={260}
          animateIt={animateIt}
          style={giantMono(size, negative ? DANGER_ON_DARK : INK)}
        />
      </Reveal>
      <Reveal animateIt={animateIt} delay={800}>
        <Text style={[T.context, { marginTop: 8, maxWidth: 330 }]}>{after}</Text>
      </Reveal>
      <Reveal
        animateIt={animateIt}
        delay={1050}
        style={{ flexDirection: 'row', gap: 16, marginTop: 32, paddingTop: 20, borderTopWidth: 1, borderTopColor: INK_HAIRLINE }}
      >
        <MiniStat label="Earned" value={compact(recap.totalIncome)} />
        <MiniStat label="Spent" value={compact(recap.totalSpent)} />
        <MiniStat
          label={negative ? 'Short by' : 'Net saved'}
          value={negative ? compact(Math.abs(recap.netSaved)) : compact(recap.netSaved)}
          color={negative ? DANGER_ON_DARK : INK}
        />
      </Reveal>
    </PageFrame>
  );
}

// ─── 4. Top category ──────────────────────────────────────────────────────────
function TopCategoryPage({ recap, def, animateIt }: PageProps) {
  const top = recap.topCategory;
  if (!top) return null;
  const share = pctOf(top.spent, recap.totalSpent);
  return (
    <PageFrame bg={def.bg} eyebrow="Top category" numeral={`${share}`} label={recap.label} animateIt={animateIt}>
      <Reveal animateIt={animateIt} delay={120} from="scale" spring={{ damping: 12, stiffness: 140 }}>
        <CategoryGlyph name={top.category.icon} size={104} weight="fill" color={INK} />
      </Reveal>
      <Reveal animateIt={animateIt} delay={320} style={{ marginTop: 24 }}>
        <Text style={T.lead}>You spent the most on</Text>
      </Reveal>
      <Reveal animateIt={animateIt} delay={440}>
        <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.55} style={giantWord(72)}>{top.category.label}</Text>
      </Reveal>
      <Reveal animateIt={animateIt} delay={760} style={{ marginTop: 16 }}>
        <CountUpText value={top.spent} format={formatCurrency} delay={780} animateIt={animateIt} style={giantMono(36)} />
        <Text style={[T.context, { marginTop: 6 }]}>{share}% of everything you spent in {monthName(recap)}.</Text>
      </Reveal>
    </PageFrame>
  );
}

// ─── 5. Where it went ─────────────────────────────────────────────────────────
// Up to five ranked bars, revealed one after another.
function WherePage({ recap, def, animateIt }: PageProps) {
  const top = recap.categoryBreakdown.slice(0, 5);
  const max = top[0]?.spent ?? 1;
  const shown = top.reduce((s, c) => s + c.spent, 0);
  const allShown = top.length === recap.categoryBreakdown.length;
  return (
    <PageFrame bg={def.bg} eyebrow="Where it went" label={recap.label} animateIt={animateIt}>
      <Reveal animateIt={animateIt} delay={100}>
        <Text style={giantWord(48)}>Your top {top.length}</Text>
      </Reveal>
      <View style={{ marginTop: 28, gap: 20 }}>
        {top.map((c, i) => {
          const hex = liftOnDark(catHex(c.category.id), def.bg);
          const delay = 360 + i * 320;
          return (
            <Reveal key={c.category.id} animateIt={animateIt} delay={delay} distance={16}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                <Text style={[{ fontFamily: F.mono, fontSize: 13, color: INK_DIM }, TABULAR]}>{String(i + 1).padStart(2, '0')}</Text>
                <Text numberOfLines={1} style={{ flex: 1, fontFamily: i === 0 ? F.display : F.semibold, fontSize: i === 0 ? 20 : 17, color: INK }}>
                  {c.category.label}
                </Text>
                <Text style={[{ fontFamily: F.mono, fontSize: i === 0 ? 18 : 15, color: INK }, TABULAR]}>{compact(c.spent)}</Text>
              </View>
              <View style={{ marginTop: 8, height: i === 0 ? 12 : 8, borderRadius: 6, backgroundColor: 'rgba(244,247,246,0.08)' }}>
                <GrowBar fill={c.spent / max} color={hex} axis="x" delay={delay + 80} animateIt={animateIt} thickness={i === 0 ? 12 : 8} radius={6} />
              </View>
            </Reveal>
          );
        })}
      </View>
      <Reveal animateIt={animateIt} delay={360 + top.length * 320 + 120}>
        <Text style={[T.context, { marginTop: 28 }]}>
          {allShown
            ? `That's every category you spent in this month.`
            : `Together, ${pctOf(shown, recap.totalSpent)}% of everything you spent.`}
        </Text>
      </Reveal>
    </PageFrame>
  );
}

// ─── 6. Biggest expense ───────────────────────────────────────────────────────
function BiggestPage({ recap, def, animateIt }: PageProps) {
  const b = recap.biggestExpense;
  if (!b) return null;
  return (
    <PageFrame bg={def.bg} eyebrow="Biggest expense" numeral={String(parseInt(b.date.slice(8, 10), 10))} label={recap.label} animateIt={animateIt}>
      <Reveal animateIt={animateIt} delay={100}>
        <Text style={T.lead}>Your biggest single spend went to</Text>
      </Reveal>
      <Reveal animateIt={animateIt} delay={260} style={{ marginTop: 6 }}>
        <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5} style={giantWord(68)}>{b.merchant}</Text>
      </Reveal>
      <Reveal animateIt={animateIt} delay={620} style={{ marginTop: 20 }}>
        <CountUpText value={b.amount} format={formatCurrency} delay={640} animateIt={animateIt} style={giantMono(40)} />
      </Reveal>
      <Reveal animateIt={animateIt} delay={900} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <CategoryGlyph name={b.category.icon} size={16} weight="fill" color={INK_DIM} />
        <Text style={T.context}>
          {longDate(b.date, { weekday: 'long', month: 'long', day: 'numeric' })} · {b.category.label}
        </Text>
      </Reveal>
    </PageFrame>
  );
}

// ─── 7. Weekly pace ───────────────────────────────────────────────────────────
// Five week bars rise in sequence; the heaviest one is called out above them.
const WEEK_TRACK = 168;

function WeeklyPage({ recap, def, animateIt }: PageProps) {
  const data = recap.weeklySpend;
  const max = Math.max(...data, 1);
  const peak = data.indexOf(Math.max(...data));
  const start = peak * 7 + 1;
  const end = peak === 4 ? daysInMonth(recap.monthKey) : peak * 7 + 7;
  const range = start === end ? `${monthName(recap)} ${start}` : `${monthName(recap)} ${start}–${end}`;
  return (
    <PageFrame bg={def.bg} eyebrow="Weekly pace" numeral={`W${peak + 1}`} label={recap.label} animateIt={animateIt}>
      <Reveal animateIt={animateIt} delay={100}>
        <Text style={T.lead}>Your heaviest week was</Text>
      </Reveal>
      <Reveal animateIt={animateIt} delay={220}>
        <Text style={giantWord(80)}>Week {peak + 1}</Text>
      </Reveal>
      <Reveal animateIt={animateIt} delay={420}>
        <Text style={[T.context, { marginTop: 4 }]}>
          {range} · <Text style={[{ fontFamily: F.mono, color: INK }, TABULAR]}>{compact(data[peak])}</Text>, {pctOf(data[peak], recap.totalSpent)}% of the month
        </Text>
      </Reveal>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 40 }}>
        {data.map((v, i) => {
          const isPeak = i === peak;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'stretch', gap: 10 }}>
              <View style={{ height: WEEK_TRACK, justifyContent: 'flex-end' }}>
                <GrowBar
                  fill={v / max}
                  color={isPeak ? INK : 'rgba(244,247,246,0.34)'}
                  axis="y"
                  delay={560 + i * 160}
                  animateIt={animateIt}
                  radius={10}
                />
              </View>
              <Text style={[{ fontFamily: isPeak ? F.display : F.semibold, fontSize: 12, color: isPeak ? INK : INK_DIM, textAlign: 'center' }]}>
                W{i + 1}
              </Text>
            </View>
          );
        })}
      </View>
    </PageFrame>
  );
}

// ─── 8. Rhythm ────────────────────────────────────────────────────────────────
// Habit framing: how often the user showed up, not how much they spent.
function RhythmPage({ recap, def, animateIt }: PageProps) {
  const dim = daysInMonth(recap.monthKey);
  const ratio = recap.daysLogged / dim;
  const framing = ratio >= 0.6
    ? "That's a real habit."
    : ratio >= 0.3 ? 'A rhythm is forming.' : 'Every entry makes next month’s recap sharper.';
  return (
    <PageFrame bg={def.bg} eyebrow="Rhythm" numeral={String(recap.daysLogged)} label={recap.label} animateIt={animateIt}>
      <Reveal animateIt={animateIt} delay={100}>
        <Text style={T.lead}>You showed up on</Text>
      </Reveal>
      <Reveal animateIt={animateIt} delay={220} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12 }}>
        <CountUpText value={recap.daysLogged} format={String} delay={260} animateIt={animateIt} style={giantMono(96)} />
        <Text style={giantWord(36)}>{recap.daysLogged === 1 ? 'day' : 'days'}</Text>
      </Reveal>
      <Reveal animateIt={animateIt} delay={800}>
        <Text style={[T.context, { marginTop: 4 }]}>
          {recap.daysLogged} of {dim} days in {monthName(recap)}. {framing}
        </Text>
      </Reveal>
      <Reveal
        animateIt={animateIt}
        delay={1050}
        style={{ flexDirection: 'row', gap: 20, marginTop: 32, paddingTop: 20, borderTopWidth: 1, borderTopColor: INK_HAIRLINE }}
      >
        <MiniStat label="Entries" value={String(recap.transactionCount)} />
        {recap.busiestDay && (
          <MiniStat
            label="Busiest day"
            value={longDate(recap.busiestDay.date, { weekday: 'short', month: 'short', day: 'numeric' })}
            sub={compact(recap.busiestDay.spent)}
            mono={false}
          />
        )}
      </Reveal>
    </PageFrame>
  );
}

// ─── 9. Budget scorecard ──────────────────────────────────────────────────────
function BudgetPage({ recap, def, animateIt }: PageProps) {
  const over = recap.overspentCategories;
  const listed = over.slice(0, 3);
  return (
    <PageFrame bg={def.bg} eyebrow="Budget" numeral={String(recap.budgetCategoriesUnder)} label={recap.label} animateIt={animateIt}>
      <Reveal animateIt={animateIt} delay={100}>
        <Text style={T.lead}>You stayed under budget in</Text>
      </Reveal>
      <Reveal animateIt={animateIt} delay={220} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12 }}>
        <CountUpText value={recap.budgetCategoriesUnder} format={String} delay={260} animateIt={animateIt} style={giantMono(96)} />
        <Text style={giantWord(36)}>of {recap.budgetCategoriesTracked}</Text>
      </Reveal>
      <Reveal animateIt={animateIt} delay={500}>
        <Text style={[T.context, { marginTop: 2 }]}>
          {recap.budgetCategoriesTracked === 1 ? 'budgeted category.' : 'budgeted categories.'}
        </Text>
      </Reveal>

      {listed.length > 0 ? (
        <View style={{ marginTop: 32, paddingTop: 20, borderTopWidth: 1, borderTopColor: INK_HAIRLINE, gap: 14 }}>
          <Reveal animateIt={animateIt} delay={800}>
            <Text style={T.statLabel}>Went over</Text>
          </Reveal>
          {listed.map((o, i) => (
            <Reveal key={o.category.id} animateIt={animateIt} delay={940 + i * 220} distance={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <CategoryGlyph name={o.category.icon} size={18} weight="fill" color={DANGER_ON_DARK} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontFamily: F.semibold, fontSize: 16, color: INK }}>{o.category.label}</Text>
                <Text style={[{ fontFamily: F.mono, fontSize: 12, color: INK_DIM }, TABULAR]}>
                  {compact(o.spent)} / {compact(o.limit)}
                </Text>
              </View>
              <Text style={[{ fontFamily: F.mono, fontSize: 16, color: DANGER_ON_DARK }, TABULAR]}>+{compact(o.spent - o.limit)}</Text>
            </Reveal>
          ))}
          {over.length > listed.length && (
            <Reveal animateIt={animateIt} delay={940 + listed.length * 220}>
              <Text style={[T.context, { fontSize: 14 }]}>and {over.length - listed.length} more over budget.</Text>
            </Reveal>
          )}
        </View>
      ) : (
        <Reveal animateIt={animateIt} delay={800}>
          <Text style={[T.lead, { marginTop: 28, color: ACCENT }]}>Not a single category went over. Clean sheet.</Text>
        </Reveal>
      )}
    </PageFrame>
  );
}

// ─── 10b. For next month ──────────────────────────────────────────────────────
// Up to two suggestions and one "did you know?" from the month's own data (see
// lib/recapInsights). Cards stack top-aligned so three still fit a small phone.
export const KIND_LABEL: Record<RecapInsight['kind'], string> = {
  action: 'Try this',
  fact: 'Did you know?',
  tip: 'Tip',
};
const COUNT_WORD = ['', 'One thing', 'Two things', 'Three things'];

function NextMonthPage({ recap, def, insights, animateIt }: PageProps) {
  const next = nextMonthName(recap.monthKey);
  // Short phones (SE-class) tighten the type so three cards still fit unscrolled.
  const tight = useWindowDimensions().height < 760;
  return (
    <PageFrame bg={def.bg} eyebrow={`For ${next}`} label={recap.label} align="top" animateIt={animateIt}>
      <Reveal animateIt={animateIt} delay={100} style={{ marginTop: 12 }}>
        <Text style={giantWord(tight ? 30 : 40)}>{COUNT_WORD[insights.length] ?? 'A few things'} for {next}.</Text>
      </Reveal>
      <View style={{ marginTop: tight ? 16 : 24, gap: tight ? 8 : 12 }}>
        {insights.map((ins, i) => {
          const fact = ins.kind !== 'action';
          return (
            <Reveal key={ins.id} animateIt={animateIt} delay={420 + i * 360} distance={20}>
              <View
                style={{
                  flexDirection: 'row',
                  gap: 14,
                  padding: tight ? 12 : 16,
                  borderRadius: 20,
                  backgroundColor: fact ? 'rgba(95,214,189,0.10)' : 'rgba(244,247,246,0.07)',
                  borderWidth: 1,
                  borderColor: fact ? 'rgba(95,214,189,0.28)' : INK_HAIRLINE,
                }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(244,247,246,0.10)' }}>
                  <CategoryGlyph name={ins.icon} size={20} weight="fill" color={fact ? ACCENT : INK} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <Text style={[T.statLabel, fact && { color: ACCENT }]}>{KIND_LABEL[ins.kind]}</Text>
                  <Text style={{ fontFamily: F.display, fontSize: 17, lineHeight: 22, letterSpacing: -0.2, color: INK }}>{ins.title}</Text>
                  <Text numberOfLines={4} style={[T.context, tight ? { fontSize: 13, lineHeight: 18 } : { fontSize: 14, lineHeight: 20 }]}>{ins.body}</Text>
                </View>
              </View>
            </Reveal>
          );
        })}
      </View>
    </PageFrame>
  );
}

// ─── 11. Outro ────────────────────────────────────────────────────────────────
// A compact, shareable-style card of the headline numbers. The Done button is
// layered above the story surface by the modal, so the bottom is left clear.
export const OUTRO_ACTION_SPACE = 84;

function OutroPage({ recap, def, insights, animateIt }: PageProps) {
  // The card closes on the month's top suggestion, falling back to a general nudge.
  const nextUp = insights.find((i) => i.kind === 'action');
  const h = headline(recap);
  const negative = recap.netSaved < 0;
  return (
    <PageFrame bg={def.bg} eyebrow="That's a wrap" label={recap.label} showFooter={false} animateIt={animateIt}>
      <View style={{ paddingBottom: OUTRO_ACTION_SPACE }}>
        <Reveal animateIt={animateIt} delay={80}>
          <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6} style={giantWord(48)}>{h.title}</Text>
        </Reveal>
        <Reveal animateIt={animateIt} delay={260} distance={36} style={{ marginTop: 24 }}>
          <View style={{ borderRadius: 24, padding: 22, backgroundColor: FIELD.deep, borderWidth: 1, borderColor: INK_HAIRLINE, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: F.display, fontSize: 16, letterSpacing: -0.3, color: INK }}>LedgeIt</Text>
              <Text style={{ fontFamily: F.semibold, fontSize: 12, color: INK_DIM }}>{recap.label}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 22 }}>
              <MiniStat label="Spent" value={compact(recap.totalSpent)} />
              <MiniStat label="Earned" value={compact(recap.totalIncome)} />
            </View>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 18 }}>
              <MiniStat
                label={negative ? 'Short by' : 'Net saved'}
                value={compact(Math.abs(recap.netSaved))}
                sub={recap.totalIncome > 0 ? `${formatPercent(recap.savingsRate, 0)} of income` : undefined}
                color={negative ? DANGER_ON_DARK : INK}
              />
              <MiniStat
                label="Top category"
                value={recap.topCategory?.category.label ?? '—'}
                sub={recap.topCategory ? compact(recap.topCategory.spent) : undefined}
                mono={false}
              />
            </View>
            <View style={{ height: 1, backgroundColor: INK_HAIRLINE, marginTop: 20, marginBottom: 14 }} />
            {nextUp ? (
              <Text style={[T.context, { fontSize: 14, lineHeight: 20 }]}>
                Next up: <Text style={{ fontFamily: F.display, color: INK }}>{nextUp.title}</Text>
              </Text>
            ) : (
              <Text style={[T.context, { fontSize: 14, lineHeight: 20 }]}>{nextMonthNudge(recap)}</Text>
            )}
            <Text style={{ fontFamily: F.display, fontSize: 13, color: ACCENT, marginTop: 12 }}>Spent it? LedgeIt.</Text>
          </View>
        </Reveal>
      </View>
    </PageFrame>
  );
}

// ─── Page switch ─────────────────────────────────────────────────────────────
// The carry-over page is interactive and is rendered by the modal itself.
export function StoryPage(props: PageProps) {
  switch (props.def.id) {
    case 'intro': return <IntroPage {...props} />;
    case 'spent': return <SpentPage {...props} />;
    case 'earned': return <EarnedPage {...props} />;
    case 'top': return <TopCategoryPage {...props} />;
    case 'where': return <WherePage {...props} />;
    case 'biggest': return <BiggestPage {...props} />;
    case 'weekly': return <WeeklyPage {...props} />;
    case 'rhythm': return <RhythmPage {...props} />;
    case 'budget': return <BudgetPage {...props} />;
    case 'next': return <NextMonthPage {...props} />;
    case 'outro': return <OutroPage {...props} />;
    default: return null;
  }
}
