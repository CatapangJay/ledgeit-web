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
  // Custom category icon options
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
  income:        '#1f6950',
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
  'Coffee',
  'Airplane',
  'BookOpen',
  'Barbell',
  'MusicNote',
  'PawPrint',
  'Gift',
  'Scissors',
  'Wrench',
  'Globe',
  'FilmSlate',
  'GraduationCap',
]

/** Color themes for custom categories. Full class strings ensure Tailwind includes them. */
export const CUSTOM_COLOR_OPTIONS = [
  { label: 'Blue',    textColor: 'text-blue-700',    bgColor: 'bg-blue-50',    swatch: '#1d4ed8' },
  { label: 'Teal',    textColor: 'text-teal-700',    bgColor: 'bg-teal-50',    swatch: '#0f766e' },
  { label: 'Cyan',    textColor: 'text-cyan-700',    bgColor: 'bg-cyan-50',    swatch: '#0891b2' },
  { label: 'Indigo',  textColor: 'text-indigo-700',  bgColor: 'bg-indigo-50',  swatch: '#4338ca' },
  { label: 'Purple',  textColor: 'text-purple-700',  bgColor: 'bg-purple-50',  swatch: '#7c3aed' },
  { label: 'Fuchsia', textColor: 'text-fuchsia-700', bgColor: 'bg-fuchsia-50', swatch: '#a21caf' },
  { label: 'Rose',    textColor: 'text-rose-700',    bgColor: 'bg-rose-50',    swatch: '#be185d' },
  { label: 'Yellow',  textColor: 'text-yellow-700',  bgColor: 'bg-yellow-50',  swatch: '#a16207' },
] as const

export type CustomColorOption = typeof CUSTOM_COLOR_OPTIONS[number]

