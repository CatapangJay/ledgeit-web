// Wallet accent color key → concrete hex. Kept in one place so every
// wallet surface (Wallets page, dashboard, ledger, insights) renders the same
// palette. The first six keys mirror WALLET_KINDS[n].color in
// packages/core/types.ts (the kind defaults); the rest are extra choices a user
// can pick when customizing a wallet.
export const WALLET_COLOR_HEX: Record<string, string> = {
  teal:    '#0f766e',
  indigo:  '#4338ca',
  rose:    '#be123c',
  amber:   '#b45309',
  green:   '#15803d',
  slate:   '#334155',
  // Extra custom choices
  emerald: '#047857',
  cyan:    '#0891b2',
  sky:     '#0369a1',
  blue:    '#1d4ed8',
  violet:  '#6d28d9',
  purple:  '#7c3aed',
  fuchsia: '#a21caf',
  pink:    '#be185d',
  red:     '#b91c1c',
  orange:  '#c2410c',
  lime:    '#4d7c0f',
  // Additional hues & tones
  yellow:  '#a16207',
  gold:    '#92840b',
  mint:    '#0d9488',
  seafoam: '#0e7490',
  ocean:   '#0c4a6e',
  navy:    '#1e3a8a',
  periwinkle: '#5b6ad0',
  lavender:   '#7c5cbf',
  grape:   '#86198f',
  magenta: '#c026d3',
  coral:   '#e11d48',
  crimson: '#9f1239',
  brick:   '#9a3412',
  bronze:  '#78350f',
  olive:   '#3f6212',
  forest:  '#166534',
  charcoal:'#1f2937',
  stone:   '#57534e',
}

/** Resolve a wallet's accent color key to a hex value, defaulting to teal. */
export function walletAccent(colorKey: string): string {
  return WALLET_COLOR_HEX[colorKey] ?? WALLET_COLOR_HEX.teal
}

// Diagonal gradient per accent key, used to give each wallet an "ATM card"
// look. Each pair is [lighter start, darker end] tuned so white text and the
// translucent chrome on top read clearly.
export const WALLET_COLOR_GRADIENT: Record<string, [string, string]> = {
  teal:    ['#14a89a', '#0c5e57'],
  indigo:  ['#5b52e0', '#312e81'],
  rose:    ['#e11d55', '#881337'],
  amber:   ['#d97706', '#7c2d12'],
  green:   ['#1c9e4b', '#14532d'],
  slate:   ['#475569', '#1e293b'],
  emerald: ['#10b981', '#065f46'],
  cyan:    ['#06b6d4', '#155e75'],
  sky:     ['#0ea5e9', '#075985'],
  blue:    ['#3b82f6', '#1e3a8a'],
  violet:  ['#8b5cf6', '#4c1d95'],
  purple:  ['#a855f7', '#581c87'],
  fuchsia: ['#d946ef', '#701a75'],
  pink:    ['#ec4899', '#831843'],
  red:     ['#ef4444', '#7f1d1d'],
  orange:  ['#f97316', '#7c2d12'],
  lime:    ['#84cc16', '#3f6212'],
  // Additional hues & tones
  yellow:  ['#eab308', '#854d0e'],
  gold:    ['#d4af37', '#78650b'],
  mint:    ['#2dd4bf', '#0f766e'],
  seafoam: ['#22d3ee', '#0e7490'],
  ocean:   ['#0891b2', '#0c4a6e'],
  navy:    ['#3b5bdb', '#1e3a8a'],
  periwinkle: ['#818cf8', '#4f46e5'],
  lavender:   ['#a78bfa', '#6d28d9'],
  grape:   ['#c026d3', '#701a75'],
  magenta: ['#e879f9', '#a21caf'],
  coral:   ['#fb7185', '#be123c'],
  crimson: ['#f43f5e', '#9f1239'],
  brick:   ['#ea580c', '#7c2d12'],
  bronze:  ['#b45309', '#78350f'],
  olive:   ['#65a30d', '#3f6212'],
  forest:  ['#22c55e', '#166534'],
  charcoal:['#4b5563', '#111827'],
  stone:   ['#78716c', '#292524'],
}

/** CSS diagonal gradient for a wallet's accent key, defaulting to teal. */
export function walletGradient(colorKey: string): string {
  const [from, to] = WALLET_COLOR_GRADIENT[colorKey] ?? WALLET_COLOR_GRADIENT.teal
  return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`
}

/** Ordered list of accent keys shown in the wallet color picker. */
export const WALLET_COLOR_OPTIONS: string[] = [
  'teal', 'mint', 'emerald', 'forest', 'green', 'olive', 'lime',
  'seafoam', 'cyan', 'ocean', 'sky', 'blue', 'navy', 'indigo',
  'periwinkle', 'violet', 'lavender', 'purple', 'grape', 'fuchsia', 'magenta',
  'pink', 'coral', 'rose', 'crimson', 'red', 'brick', 'orange',
  'amber', 'bronze', 'gold', 'yellow',
  'slate', 'stone', 'charcoal',
]
