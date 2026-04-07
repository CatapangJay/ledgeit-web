import type { TransactionDraft } from '@/types'

// ─── Amount Extraction ────────────────────────────────────────────────────────

const AMOUNT_PATTERNS = [
  // $20, ₱20, $1,234.56
  /[₱$]\s*([\d,]+(?:\.\d{1,2})?)/,
  // 20 dollars, 1500 pesos
  /([\d,]+(?:\.\d{1,2})?)\s*(?:dollars?|pesos?|php|usd)/i,
  // plain number (last resort) — must be at least 2 digits to avoid matching day numbers
  /\b([\d,]{2,}(?:\.\d{1,2})?)\b/,
]

export function parseAmount(text: string): number | null {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const raw = match[1].replace(/,/g, '')
      const value = parseFloat(raw)
      if (!isNaN(value) && value > 0) return value
    }
  }
  return null
}

// ─── Direction Detection ──────────────────────────────────────────────────────

const INCOME_KEYWORDS = [
  'received', 'receive', 'salary', 'payroll', 'freelance', 'payment received',
  'invoice', 'deposit', 'transfer in', 'refund', 'income', 'earnings', 'bonus',
  'allowance', 'commission', 'profit', 'revenue', 'paid', 'payout', 'reimbursement',
]

export function parseDirection(text: string): 'expense' | 'income' {
  const lower = text.toLowerCase()
  if (INCOME_KEYWORDS.some((kw) => lower.includes(kw))) return 'income'
  return 'expense'
}

// ─── Date Resolution ──────────────────────────────────────────────────────────

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function getPastDayOfWeek(dayName: string, weeksAgo = 1): Date {
  const target = DAY_NAMES.indexOf(dayName.toLowerCase())
  if (target === -1) return new Date()
  const today = new Date()
  const todayDay = today.getDay()
  let diff = todayDay - target
  if (diff <= 0) diff += 7
  diff += (weeksAgo - 1) * 7
  const result = new Date(today)
  result.setDate(today.getDate() - diff)
  return result
}

export function parseDate(text: string): string {
  const lower = text.toLowerCase()
  const today = new Date()

  // Explicit ISO date: 2026-04-07
  const isoMatch = lower.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  if (isoMatch) return isoMatch[1]

  // Explicit date with slashes: 04/07, 04/07/2026
  const slashMatch = lower.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
  if (slashMatch) {
    const year = slashMatch[3]
      ? slashMatch[3].length === 2
        ? `20${slashMatch[3]}`
        : slashMatch[3]
      : today.getFullYear()
    const d = new Date(`${year}-${slashMatch[1].padStart(2, '0')}-${slashMatch[2].padStart(2, '0')}`)
    if (!isNaN(d.getTime())) return toISODate(d)
  }

  if (lower.includes('yesterday')) {
    const d = new Date(today)
    d.setDate(today.getDate() - 1)
    return toISODate(d)
  }

  if (lower.includes('today') || lower.includes('now')) {
    return toISODate(today)
  }

  // "last monday", "last friday"
  const lastDayMatch = lower.match(/last\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/)
  if (lastDayMatch) {
    return toISODate(getPastDayOfWeek(lastDayMatch[1], 1))
  }

  // "2 days ago", "3 days ago"
  const daysAgoMatch = lower.match(/(\d+)\s+days?\s+ago/)
  if (daysAgoMatch) {
    const d = new Date(today)
    d.setDate(today.getDate() - parseInt(daysAgoMatch[1]))
    return toISODate(d)
  }

  // Plain day name: "monday", "friday"
  for (const day of DAY_NAMES) {
    if (lower.includes(day)) {
      return toISODate(getPastDayOfWeek(day, 1))
    }
  }

  return toISODate(today)
}

// ─── Merchant Extraction ──────────────────────────────────────────────────────

// Tokens that should be removed from the raw string before extracting merchant
const STRIP_PATTERNS: RegExp[] = [
  // Currency amounts
  /[₱$]\s*[\d,]+(?:\.\d{1,2})?/g,
  /[\d,]+(?:\.\d{1,2})?\s*(?:dollars?|pesos?|php|usd)/gi,
  /\b[\d,]{2,}(?:\.\d{1,2})?\b/g,
  // Date words
  /\b(?:yesterday|today|now|last\s+(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)|\d+\s+days?\s+ago)\b/gi,
  /\b(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi,
  // ISO / slash dates
  /\b\d{4}-\d{2}-\d{2}\b/g,
  /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g,
  // Filler words
  /\b(?:for|at|in|on|from|to|the|a|an|my|i|me|bought|paid|spent|got|used|went)\b/gi,
]

const MERCHANT_NORMALIZATIONS: Array<[RegExp, string]> = [
  [/\bmcd(?:onalds?)?\b/i, "McDonald's"],
  [/\bjollibee\b/i, 'Jollibee'],
  [/\bkfc\b/i, 'KFC'],
  [/\bstarbucks?\b/i, 'Starbucks'],
  [/\bgrab(?:food|taxi|express|mart)?\b/i, 'Grab'],
  [/\bangkas\b/i, 'Angkas'],
  [/\bnetflix\b/i, 'Netflix'],
  [/\bspotify\b/i, 'Spotify'],
  [/\blazada\b/i, 'Lazada'],
  [/\bshopee\b/i, 'Shopee'],
  [/\bmeralco\b/i, 'Meralco'],
  [/\bpldt\b/i, 'PLDT'],
  [/\bglobe\b/i, 'Globe'],
  [/\bsmart\b/i, 'Smart'],
  [/\bwatsons?\b/i, 'Watsons'],
  [/\bmercury drug\b/i, 'Mercury Drug'],
  [/\bsm\b/i, 'SM'],
  [/\bpuregold\b/i, 'Puregold'],
  [/\blanders\b/i, "Lander's"],
  [/\brobinsons?\b/i, 'Robinsons'],
  [/\bsteam\b/i, 'Steam'],
]

export function parseMerchant(text: string): string {
  let clean = text

  for (const pattern of STRIP_PATTERNS) {
    clean = clean.replace(pattern, ' ')
  }

  // Collapse whitespace
  clean = clean.replace(/\s+/g, ' ').trim()

  if (!clean) return 'Unknown'

  // Apply known normalizations
  for (const [pattern, normalized] of MERCHANT_NORMALIZATIONS) {
    if (pattern.test(clean)) return normalized
  }

  // Title-case whatever remains
  return clean
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .slice(0, 3) // cap at 3 words for a clean merchant name
    .join(' ')
}

// ─── Compose ──────────────────────────────────────────────────────────────────

export function parseTransaction(raw: string): TransactionDraft {
  const trimmed = raw.trim()

  return {
    raw: trimmed,
    amount: parseAmount(trimmed),
    merchant: parseMerchant(trimmed),
    type: parseDirection(trimmed),
    date: parseDate(trimmed),
  }
}
