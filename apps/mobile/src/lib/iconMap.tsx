import {
  ForkKnife,
  ShoppingCart,
  Car,
  Bag,
  Lightning,
  GameController,
  Heartbeat,
  ArrowFatLineDown,
  DotsThree,
  PiggyBank,
  TrendUp,
  GraduationCap,
  Scissors,
  Church,
  UsersThree,
  Baby,
  CreditCard,
  ArrowsLeftRight,
  HandCoins,
  type Icon,
} from 'phosphor-react-native';

/**
 * Maps CATEGORIES[n].icon string values (from @ledgeit/core) to their Phosphor
 * React Native components. Mirrors apps/web/src/lib/iconMap.tsx, scoped to the
 * icon names actually used by the preset category registry (custom category
 * picker icons land here once that feature is ported).
 */
export const PHOSPHOR_ICON_MAP: Record<string, Icon> = {
  ForkKnife,
  ShoppingCart,
  Car,
  Bag,
  Lightning,
  GameController,
  Heartbeat,
  ArrowFatLineDown,
  DotsThree,
  PiggyBank,
  TrendUp,
  GraduationCap,
  Scissors,
  Church,
  UsersThree,
  Baby,
  CreditCard,
  ArrowsLeftRight,
  HandCoins,
};

/** Resolve a Phosphor icon component by its string name. Falls back to DotsThree. */
export function getIconComponent(name: string): Icon {
  return PHOSPHOR_ICON_MAP[name] ?? DotsThree;
}

// ─── Icon background for category chips/rows ─────────────────────────────────
// Mirrors apps/web/src/lib/iconMap.tsx's PRESET_ICON_BG (curated, on-brand hues).

const PRESET_ICON_BG: Record<string, string> = {
  restaurants: '#c2410c',
  groceries: '#4d7c0f',
  transport: '#0369a1',
  shopping: '#7c3aed',
  utilities: '#b45309',
  entertainment: '#be185d',
  health: '#be123c',
  savings: '#0f766e',
  investments: '#4338ca',
  education: '#1d4ed8',
  personal_care: '#a21caf',
  church: '#92400e',
  gifts: '#b91c1c',
  family: '#0e7490',
  kids: '#db2777',
  subscriptions: '#334155',
  income: '#1f6950',
  transfers: '#475569',
  debts: '#b45309',
  other: '#64748b',
};

/** Returns a hex background colour for the category icon circle. */
export function getIconBg(category: { id: string; color?: string }): string {
  return PRESET_ICON_BG[category.id] ?? '#64748b';
}
