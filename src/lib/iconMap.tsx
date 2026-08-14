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
  // ─── Custom category icons ───────────────────────────────────────────────────
  Coffee,
  Airplane,
  BookOpen,
  Barbell,
  MusicNote,
  PawPrint,
  Gift,
  Scissors,
  Wrench,
  Globe,
  FilmSlate,
  GraduationCap,
  // ─── Preset category icons ─────────────────────────────────────────────────────
  PiggyBank,
  TrendUp,
  Church,
  UsersThree,
  Baby,
  CreditCard,
  ArrowsLeftRight,
  // ─── Additional custom-picker icons ────────────────────────────────────────────
  Heart,
  HandHeart,
  HandCoins,
  Cross,
  Users,
  House,
  Pill,
  FirstAidKit,
  Wallet,
  Bank,
  Ticket,
  Bicycle,
  Camera,
  Leaf,
  Sun,
  Palette,
  SoccerBall,
  Basketball,
  Confetti,
  Hamburger,
  Pizza,
  Wine,
  TShirt,
  Dog,
  Umbrella,
  TelevisionSimple,
  Sparkle,
  Star,
  Flower,
  Cake,
  Books,
  PencilLine,
  Phone,
  Lightbulb,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

/**
 * Maps CATEGORIES[n].icon string values to their Phosphor React components.
 * Used by CategoryBadge and any component that renders a category icon dynamically.
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
  // Preset category icons
  PiggyBank,
  TrendUp,
  GraduationCap,
  Scissors,
  Church,
  UsersThree,
  Baby,
  CreditCard,
  ArrowsLeftRight,
  // Custom category icon options
  Coffee,
  Airplane,
  BookOpen,
  Barbell,
  MusicNote,
  PawPrint,
  Gift,
  Wrench,
  Globe,
  FilmSlate,
  Heart,
  HandHeart,
  HandCoins,
  Cross,
  Users,
  House,
  Pill,
  FirstAidKit,
  Wallet,
  Bank,
  Ticket,
  Bicycle,
  Camera,
  Leaf,
  Sun,
  Palette,
  SoccerBall,
  Basketball,
  Confetti,
  Hamburger,
  Pizza,
  Wine,
  TShirt,
  Dog,
  Umbrella,
  TelevisionSimple,
  Sparkle,
  Star,
  Flower,
  Cake,
  Books,
  PencilLine,
  Phone,
  Lightbulb,
}

/** Resolve a Phosphor icon component by its string name. Falls back to DotsThree. */
export function getIconComponent(name: string): Icon {
  return PHOSPHOR_ICON_MAP[name] ?? DotsThree
}

// ─── Icon background for transaction rows ────────────────────────────────────

const PRESET_ICON_BG: Record<string, string> = {
  restaurants:   '#c2410c',
  groceries:     '#4d7c0f',
  transport:     '#0369a1',
  shopping:      '#7c3aed',
  utilities:     '#b45309',
  entertainment: '#be185d',
  health:        '#be123c',
  savings:       '#0f766e',
  investments:   '#4338ca',
  education:     '#1d4ed8',
  personal_care: '#a21caf',
  church:        '#92400e',
  gifts:         '#b91c1c',
  family:        '#0e7490',
  kids:          '#db2777',
  subscriptions: '#334155',
  income:        '#1f6950',
  transfers:     '#475569',
  other:         '#64748b',
}

/**
 * Returns a rich hex background colour for the category icon circle.
 * For preset categories: uses the curated PRESET_ICON_BG map.
 * For custom categories: derives from CUSTOM_COLOR_OPTIONS via the stored textColor class.
 */
export function getIconBg(category: { id: string; color: string }): string {
  return (
    PRESET_ICON_BG[category.id] ??
    CUSTOM_COLOR_OPTIONS.find((o) => o.textColor === category.color)?.swatch ??
    '#64748b'
  )
}

// ─── Custom category picker options ──────────────────────────────────────────

/** Phosphor icon names available in the custom category icon picker. */
export const CUSTOM_ICON_OPTIONS: string[] = [
  // Everyday
  'Coffee',
  'ForkKnife',
  'Hamburger',
  'Pizza',
  'Wine',
  'Cake',
  'ShoppingCart',
  'Bag',
  'TShirt',
  // Money & bills
  'Wallet',
  'CreditCard',
  'Bank',
  'HandCoins',
  'PiggyBank',
  'TrendUp',
  // Home & family
  'House',
  'Users',
  'UsersThree',
  'Baby',
  'Dog',
  'PawPrint',
  // Faith & giving
  'Church',
  'Cross',
  'HandHeart',
  'Heart',
  'Gift',
  // Health
  'Heartbeat',
  'FirstAidKit',
  'Pill',
  'Barbell',
  // Leisure & travel
  'Airplane',
  'Car',
  'Bicycle',
  'Ticket',
  'GameController',
  'MusicNote',
  'FilmSlate',
  'TelevisionSimple',
  'Camera',
  'SoccerBall',
  'Basketball',
  'Confetti',
  // Learning & work
  'BookOpen',
  'Books',
  'GraduationCap',
  'PencilLine',
  'Wrench',
  'Palette',
  'Phone',
  'Lightbulb',
  // Nature & misc
  'Leaf',
  'Flower',
  'Sun',
  'Umbrella',
  'Globe',
  'Star',
  'Sparkle',
  'Scissors',
]

/** Color themes for custom categories. Full class strings ensure Tailwind includes them. */
export const CUSTOM_COLOR_OPTIONS = [
  { label: 'Red',     textColor: 'text-red-700',     bgColor: 'bg-red-50',     swatch: '#b91c1c' },
  { label: 'Orange',  textColor: 'text-orange-700',  bgColor: 'bg-orange-50',  swatch: '#c2410c' },
  { label: 'Amber',   textColor: 'text-amber-700',   bgColor: 'bg-amber-50',   swatch: '#b45309' },
  { label: 'Yellow',  textColor: 'text-yellow-700',  bgColor: 'bg-yellow-50',  swatch: '#a16207' },
  { label: 'Lime',    textColor: 'text-lime-700',    bgColor: 'bg-lime-50',    swatch: '#4d7c0f' },
  { label: 'Green',   textColor: 'text-green-700',   bgColor: 'bg-green-50',   swatch: '#15803d' },
  { label: 'Emerald', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50', swatch: '#047857' },
  { label: 'Teal',    textColor: 'text-teal-700',    bgColor: 'bg-teal-50',    swatch: '#0f766e' },
  { label: 'Cyan',    textColor: 'text-cyan-700',    bgColor: 'bg-cyan-50',    swatch: '#0891b2' },
  { label: 'Sky',     textColor: 'text-sky-700',     bgColor: 'bg-sky-50',     swatch: '#0369a1' },
  { label: 'Blue',    textColor: 'text-blue-700',    bgColor: 'bg-blue-50',    swatch: '#1d4ed8' },
  { label: 'Indigo',  textColor: 'text-indigo-700',  bgColor: 'bg-indigo-50',  swatch: '#4338ca' },
  { label: 'Violet',  textColor: 'text-violet-700',  bgColor: 'bg-violet-50',  swatch: '#6d28d9' },
  { label: 'Purple',  textColor: 'text-purple-700',  bgColor: 'bg-purple-50',  swatch: '#7c3aed' },
  { label: 'Fuchsia', textColor: 'text-fuchsia-700', bgColor: 'bg-fuchsia-50', swatch: '#a21caf' },
  { label: 'Pink',    textColor: 'text-pink-700',    bgColor: 'bg-pink-50',    swatch: '#be185d' },
  { label: 'Rose',    textColor: 'text-rose-700',    bgColor: 'bg-rose-50',    swatch: '#be123c' },
  { label: 'Slate',   textColor: 'text-slate-700',   bgColor: 'bg-slate-50',   swatch: '#334155' },
] as const

export type CustomColorOption = typeof CUSTOM_COLOR_OPTIONS[number]

