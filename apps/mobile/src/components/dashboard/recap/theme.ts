import { Easing } from 'react-native-reanimated';
import { formatPercent } from '@ledgeit/core';
import type { MonthlyRecap } from '@/lib/monthlyRecap';

// ─── Palette ─────────────────────────────────────────────────────────────────
// Story pages are full-bleed colour fields drawn from DESIGN.md: the neutral-dark
// canvas, the two forest accents and the gain emerald. Category pages derive
// their field from the category's own hue (see `deepen`).
export const FIELD = {
  canvas: '#141917',
  deep: '#00352e',
  teal: '#1f695d',
  gain: '#1f6950',
};

export const INK = '#f4f7f6';
// 0.82 keeps secondary copy at WCAG AA (4.5:1) even on the lightest field (teal).
const INK_DIM_ALPHA = 0.82;
export const INK_DIM = `rgba(244,247,246,${INK_DIM_ALPHA})`;
export const INK_HAIRLINE = 'rgba(244,247,246,0.16)';
// The one bright accent — large type only (it's ~3.7:1 on teal).
export const ACCENT = '#5fd6bd';
// Overspend content only.
export const DANGER_ON_DARK = '#ff8a80';

// Light carry-over panel — the rows keep the recap's original light styling.
export const C = {
  forest: '#04231d',
  panel: '#f8faf9',
  numberInk: '#0c1a15',
  labelInk: '#5f7d74',
  bodyInk: '#37453f',
  gainInk: '#0e7a5a',
  dangerInk: '#c2410c',
};

// Fonts are loaded by name in src/app/_layout.tsx. Set the family directly (no
// fontWeight) so Android doesn't synthesise a fallback weight.
export const F = {
  display: 'PlusJakartaSans_700Bold',
  semibold: 'PlusJakartaSans_600SemiBold',
  medium: 'PlusJakartaSans_500Medium',
  body: 'PlusJakartaSans_400Regular',
  mono: 'GeistMono_700Bold',
};

export const TABULAR = { fontVariant: ['tabular-nums' as const] };
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
// Shared spatial spring — settles quickly with a whisper of overshoot.
export const SPRING = { damping: 18, stiffness: 150, mass: 0.9 };

// Category id → chart hex (same map as web, so categories paint identically).
const CATEGORY_HEX: Record<string, string> = {
  restaurants: '#c2410c', groceries: '#4d7c0f', transport: '#0369a1',
  shopping: '#7c3aed', utilities: '#b45309', entertainment: '#be185d',
  health: '#be123c', savings: '#0f766e', investments: '#4338ca',
  education: '#1d4ed8', personal_care: '#a21caf', church: '#92400e',
  gifts: '#b91c1c', family: '#0e7490', kids: '#db2777', subscriptions: '#334155',
  debts: '#b45309', transfers: '#475569', other: '#64748b',
};
export function catHex(id: string): string {
  return CATEGORY_HEX[id] ?? '#5fd6bd';
}

// ─── Colour math ───────────────────────────────────────────────────────────────
function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

function mix(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Darken a category hue toward a green-black until even the dimmed ink passes
// AA on it, so a bright category (e.g. kids pink) still reads as a calm field.
export function deepen(hex: string): string {
  for (let t = 0.3; t < 0.96; t += 0.05) {
    const field = mix(hex, '#0b1311', t);
    if (contrast(mix(field, INK, INK_DIM_ALPHA), field) >= 4.5) return field;
  }
  return '#0b1311';
}

// Lift a category hue toward white until it holds 3:1 against a dark field —
// the WCAG non-text minimum for bars and dots.
export function liftOnDark(hex: string, field: string): string {
  for (let t = 0; t < 0.81; t += 0.05) {
    const c = mix(hex, '#ffffff', t);
    if (contrast(c, field) >= 3) return c;
  }
  return '#ffffff';
}

// ─── Copy helpers ────────────────────────────────────────────────────────────
// Copy adapts to how the month actually went — a saver gets celebration, an
// overspender gets an honest but kind nudge.
export function headline(recap: MonthlyRecap): { title: string; sub: string } {
  if (recap.totalIncome === 0 && recap.totalSpent === 0) {
    return { title: `${monthName(recap)} is a wrap`, sub: 'A quiet month — here to help you start the new one strong.' };
  }
  if (recap.savingsRate >= 0.2) {
    return { title: 'What a month.', sub: `You kept ${formatPercent(recap.savingsRate, 0)} of what you earned. That's a real win.` };
  }
  if (recap.netSaved > 0) {
    return { title: 'Nicely done.', sub: `You ended ${monthName(recap)} in the green. Every peso saved counts.` };
  }
  if (recap.netSaved === 0) {
    return { title: `${monthName(recap)}, ledged.`, sub: 'You broke even this month — a clean slate for the one ahead.' };
  }
  return { title: `${monthName(recap)}, ledged.`, sub: 'You spent a little more than you earned. A fresh month is a fresh start.' };
}

// The month right after the one being recapped, e.g. '2026-08' → 'September'.
export function nextMonthName(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 1).toLocaleDateString('en-US', { month: 'long' });
}

// A forward-looking nudge, tuned to the same tiers as `headline`.
export function nextMonthNudge(recap: MonthlyRecap): string {
  const next = nextMonthName(recap.monthKey);
  if (recap.totalIncome === 0 && recap.totalSpent === 0) return `Ready when you are — let's make ${next} count.`;
  if (recap.savingsRate >= 0.2) return `Keep this pace and ${next} could be your best month yet.`;
  if (recap.netSaved > 0) return `Aim a little higher in ${next} — you clearly know how.`;
  if (recap.netSaved === 0) return `${next} is a clean slate — let's build a real buffer this time.`;
  return `${next} is a fresh start. Small tweaks now can flip the script.`;
}

// 'August 2026' → 'August'.
export function monthName(recap: MonthlyRecap): string {
  return recap.label.split(' ')[0];
}

// 'YYYY-MM-DD' parsed as local midnight, then labelled.
export function longDate(date: string, opts: Intl.DateTimeFormatOptions): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', opts);
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

// Font size that fits a monospaced string into `width` (Geist Mono advances
// ~0.6em per glyph), clamped to the reveal scale.
export function monoFit(text: string, width: number, max = 92, min = 40): number {
  return Math.max(min, Math.min(max, Math.floor(width / (Math.max(1, text.length) * 0.61))));
}
