import { PAYMENT_METHODS, DEFAULT_PAYMENT_METHOD } from './types'
import type { TransactionDraft, PaymentMethodId, DebtDirection } from './types'

// ─── Amount Extraction ────────────────────────────────────────────────────────

const AMOUNT_PATTERNS = [
  // $20, ₱20, $1,234.56
  /[₱$]\s*([\d,]+(?:\.\d{1,2})?)/,
  // php 50, usd 20, php50
  /\b(?:php|usd)\s*([\d,]+(?:\.\d{1,2})?)/i,
  // 1.5k → 1,500 · 2k → 2,000 · 1.2m → 1,200,000 (everyday shorthand)
  /\b([\d,]*\.?\d+)\s*([km])\b/i,
  // 20 dollars, 1500 pesos, 50php
  /([\d,]+(?:\.\d{1,2})?)\s*(?:dollars?|pesos?|php|usd)/i,
  // plain number (last resort) — must be at least 2 digits to avoid matching day numbers
  /\b([\d,]{2,}(?:\.\d{1,2})?)\b/,
]

// Arithmetic expression: two or more numbers joined by + or × (x / *). Requires
// a real operator *between digits* so "337+130" or "3x150" match, but "3x kiddie
// meal" (quantity prefix) and "1,246/cc" (payment suffix) do not. `-` and `/`
// are deliberately excluded — they collide with dates (2026-08-08) and slash
// dates / payment suffixes.
const ARITHMETIC_PATTERN = /\d[\d,]*(?:\.\d{1,2})?(?:\s*[+x*×]\s*\d[\d,]*(?:\.\d{1,2})?)+/i

/** Evaluate a +/× expression with correct precedence (× before +). Returns null
 *  if any factor fails to parse or the total is non-positive. */
function evalArithmetic(expr: string): number | null {
  const normalized = expr.replace(/,/g, '').replace(/[x×]/gi, '*')
  let total = 0
  for (const term of normalized.split('+')) {
    let product = 1
    for (const factor of term.split('*')) {
      const n = parseFloat(factor)
      if (isNaN(n)) return null
      product *= n
    }
    total += product
  }
  return total > 0 ? total : null
}

export function parseAmount(text: string): number | null {
  // Arithmetic first: "337+130" → 467, "3x150" → 450. Only matches when an
  // operator sits between two numbers, so plain amounts fall through untouched.
  const arith = text.match(ARITHMETIC_PATTERN)
  if (arith) {
    const value = evalArithmetic(arith[0])
    if (value !== null) return value
  }

  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const raw = match[1].replace(/,/g, '')
      let value = parseFloat(raw)
      if (isNaN(value) || value <= 0) continue
      // Apply k / m multiplier when present (pattern index 2)
      const suffix = match[2]?.toLowerCase()
      if (suffix === 'k') value *= 1_000
      else if (suffix === 'm') value *= 1_000_000
      return value
    }
  }
  return null
}

// ─── Direction Detection ──────────────────────────────────────────────────────

const INCOME_KEYWORDS = [
  'received', 'receive', 'salary', 'payroll', 'freelance', 'payment received',
  'invoice', 'deposit', 'transfer in', 'income', 'earnings', 'bonus',
  'allowance', 'commission', 'profit', 'revenue', 'paid', 'payout',
]

// A reimbursement/refund gives money back against a category you spent in
// (e.g. "grocery refund 500", "reimbursed 1200 gcash"). It is NOT generic
// income — it offsets that category's spending. Detected here so the entry can
// be flagged; it stays typed 'expense' and keeps its category, with the flag
// telling analytics to subtract rather than add. Checked before income so
// "refund"/"reimbursement" resolve here rather than as plain income.
const REIMBURSEMENT_KEYWORDS = [
  'refund', 'refunded', 'reimburse', 'reimbursed', 'reimbursement',
  'rebate', 'cashback', 'cash back', 'money back', 'chargeback',
]

/** Whether the text describes a refund/reimbursement against a spend category. */
export function parseReimbursement(text: string): boolean {
  const lower = text.toLowerCase()
  return REIMBURSEMENT_KEYWORDS.some((kw) => lower.includes(kw))
}

// A transfer moves money between the user's own pockets (paying a credit card,
// moving to savings). Checked BEFORE income so phrasing like "cc payment" isn't
// mis-read as income by the shared 'paid'/'payment' keywords.
const TRANSFER_KEYWORDS = [
  'credit card payment', 'cc payment', 'card payment', 'pay credit card',
  'pay cc', 'pay off card', 'creditcard payment', 'statement payment',
  'move to savings', 'transfer to savings', 'fund transfer', 'bank transfer',
]

export function parseDirection(text: string): 'expense' | 'income' | 'transfer' {
  const lower = text.toLowerCase()
  if (TRANSFER_KEYWORDS.some((kw) => lower.includes(kw))) return 'transfer'
  // A reimbursement stays an expense-typed entry (offsetting its category), so
  // it must not be swept up as income by shared keywords like 'received'.
  if (parseReimbursement(lower)) return 'expense'
  if (INCOME_KEYWORDS.some((kw) => lower.includes(kw))) return 'income'
  return 'expense'
}

// ─── Debt Direction & Person Inference ─────────────────────────────────────────

// Phrases that clearly mean the money is coming back to you eventually — someone
// owes you (a receivable). "lent", "utang sa akin" (owed to me), etc.
const OWED_TO_ME_KEYWORDS = [
  'lent', 'lend', 'loaned', 'i lent', 'owes me', 'owe me', 'owes',
  'utang sa akin', 'utang niya', 'pautang', 'pinautang', 'nangutang sa akin',
]

// Phrases that clearly mean YOU owe someone (a liability): "borrowed", "I owe".
const I_OWE_KEYWORDS = [
  'borrowed', 'borrow', 'i owe', 'owe ', 'utang ko', 'nangutang ako',
  'inutang', 'hiniram', 'hiram',
]

/**
 * Infer the direction of a debt entry from its text. Returns `null` when the
 * phrasing is ambiguous (e.g. a bare "utang 500 juan") so callers can apply
 * their own default. Checked most-specific first.
 */
export function parseDebtDirection(text: string): DebtDirection | null {
  const lower = text.toLowerCase()
  // "owed to me" cues take priority over the generic "owe" substring in the
  // "i owe" list so "owes me 500" isn't mis-read as a liability.
  if (OWED_TO_ME_KEYWORDS.some((kw) => lower.includes(kw))) return 'owed_to_me'
  if (I_OWE_KEYWORDS.some((kw) => lower.includes(kw))) return 'i_owe'
  return null
}

// Pronouns and connectors that are never a counterparty name — filtered out so
// "owes me" doesn't capture "me", etc.
const PERSON_STOPWORDS = new Set([
  'me', 'you', 'him', 'her', 'them', 'us', 'i', 'to', 'from', 'kay', 'sa',
])

// A currency/amount chunk that may sit between the connector and the name
// ("borrowed 1000 from mama", "lent to juan 500"): skipped during capture.
const AMT = String.raw`(?:[₱$]?\s*[\d,]+(?:\.\d{1,2})?\s*(?:php|usd|pesos?|dollars?|k|m)?\s*)?`

// Debt verbs / connectors that sit around the person's name, used to isolate it.
const DEBT_PERSON_PATTERNS: RegExp[] = [
  // "<subject> owes/owe me" — the person is the SUBJECT, before the verb.
  /\b([a-z][a-z.'-]{0,30}?)\s+owes?\s+me\b/i,
  // "to/from/kay/sa [amount] <name>" — explicit connector, amount tolerated.
  new RegExp(String.raw`\b(?:to|from|kay|sa)\s+${AMT}([a-z][a-z .'-]{0,30}?)(?=\s|$)`, 'i'),
  // "<verb> [amount] <name>" — verb directly followed by the name. `owe`/`owes`
  // come last (the subject-first "X owes me" pattern above already ran) so
  // "i owe ana" captures "ana" while "ana owes me" stays subject-anchored.
  new RegExp(String.raw`\b(?:lent|loaned|borrowed|borrow|repaid|repay|paid\s+back|owes?)\s+${AMT}([a-z][a-z .'-]{0,30}?)(?=\s|$)`, 'i'),
]

/**
 * Best-effort extraction of the counterparty's name from a debt entry. Returns
 * null when nothing usable is found so callers can fall back to the merchant.
 */
export function parseDebtPerson(text: string): string | null {
  const stripped = stripDates(text)
  for (const pattern of DEBT_PERSON_PATTERNS) {
    const m = stripped.match(pattern)
    if (m && m[1]) {
      // Drop amount words / noise, then reject pure stopwords/pronouns.
      const cleaned = m[1]
        .replace(/\b(?:php|usd|pesos?|dollars?)\b/gi, '')
        .replace(/[\d,₱$]+/g, '')
        .trim()
      const words = cleaned
        .split(/\s+/)
        .filter((w) => w && !PERSON_STOPWORDS.has(w.toLowerCase()))
      if (words.length > 0) {
        return words
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .slice(0, 3)
          .join(' ')
      }
    }
  }
  return null
}

// ─── Payment Method Detection ───────────────────────────────────────────────────

// Each method's tokens as whole words. Longer/more-specific keywords are tried
// first so "creditcard" wins over a bare "credit", etc.
const PAYMENT_METHOD_KEYWORDS: Array<{ id: PaymentMethodId; words: string[] }> = PAYMENT_METHODS
  .filter((m) => m.id !== DEFAULT_PAYMENT_METHOD) // cash is the fallback, no keywords needed
  .map((m) => ({ id: m.id, words: [...m.keywords].sort((a, b) => b.length - a.length) }))

/**
 * A method tag is a word like "cc", "gcash", "debit" — commonly written as a
 * trailing annotation: "grocery /cc", "Dali - gcash", "coffee cash". This regex
 * matches such a token bounded by start/space/punctuation (incl. a leading
 * slash or dash) so it can be both detected and stripped from the merchant.
 */
function methodTokenRegex(word: string): RegExp {
  return new RegExp(`(?:^|[\\s/\\-–—(,])${word}(?=$|[\\s/\\-–—).,])`, 'i')
}

/** Global variant of methodTokenRegex for stripping every occurrence. Keeps the
 *  leading boundary char via a capture so we don't glue adjacent words together. */
function methodTokenRegex_global(word: string): RegExp {
  return new RegExp(`(^|[\\s/\\-–—(,])${word}(?=$|[\\s/\\-–—).,])`, 'gi')
}

/** Detect the payment method from free text. Defaults to cash when none found. */
export function parsePaymentMethod(text: string): PaymentMethodId {
  const lower = text.toLowerCase()
  for (const { id, words } of PAYMENT_METHOD_KEYWORDS) {
    if (words.some((w) => methodTokenRegex(w).test(lower))) return id
  }
  return DEFAULT_PAYMENT_METHOD
}

// ─── Date Resolution ──────────────────────────────────────────────────────────

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
  september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
}
const MONTH_ALT = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|')

function toISODate(d: Date): string {
  // Use LOCAL calendar date components — NOT d.toISOString() which is UTC.
  // UTC offset can shift the date to a different day (or even month) for
  // UTC+ users, causing transactions to fall outside the month filter.
  const year  = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day   = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

/**
 * Build an ISO date from month/day/optional-year. When the year is omitted and
 * the resulting date would land in the future (you can't spend tomorrow), roll
 * back one year — everyday logs are always for purchases that already happened.
 */
function fromMonthDay(month: number, day: number, year?: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const today = new Date()
  const resolvedYear = year ?? today.getFullYear()
  const d = new Date(resolvedYear, month - 1, day)
  if (isNaN(d.getTime()) || d.getMonth() !== month - 1) return null // reject invalid days (e.g. Feb 30)
  if (year === undefined) {
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    if (d.getTime() > endOfToday.getTime()) d.setFullYear(resolvedYear - 1)
  }
  return toISODate(d)
}

// Month-name dates: "march 5", "mar 5 2026", "march 5, 2026", "5 march", "5 mar 2026"
// The month↔day gap is `\s*` (optional) so glued forms like "Aug8" / "8aug"
// — common in quickly-typed logs — parse just like their spaced equivalents.
const MONTH_NAME_PATTERNS: RegExp[] = [
  new RegExp(`\\b(${MONTH_ALT})\\.?\\s*(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, 'i'),
  new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*(${MONTH_ALT})\\.?(?:,?\\s+(\\d{4}))?\\b`, 'i'),
]

function parseMonthName(text: string): string | null {
  // Form 1: <month> <day> [year]
  const m1 = text.match(MONTH_NAME_PATTERNS[0])
  if (m1) {
    const month = MONTHS[m1[1].toLowerCase()]
    const iso = fromMonthDay(month, parseInt(m1[2]), m1[3] ? parseInt(m1[3]) : undefined)
    if (iso) return iso
  }
  // Form 2: <day> <month> [year]
  const m2 = text.match(MONTH_NAME_PATTERNS[1])
  if (m2) {
    const month = MONTHS[m2[2].toLowerCase()]
    const iso = fromMonthDay(month, parseInt(m2[1]), m2[3] ? parseInt(m2[3]) : undefined)
    if (iso) return iso
  }
  return null
}

/**
 * Extract an explicit date from text, or `null` when none is present.
 * Unlike `parseDate`, this does NOT fall back to today — callers that need a
 * default should do so themselves (bulk mode relies on the null signal to know
 * whether an entry should inherit a context date from a preceding date line).
 */
export function findDate(text: string): string | null {
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
        ? parseInt(`20${slashMatch[3]}`)
        : parseInt(slashMatch[3])
      : undefined
    const iso = fromMonthDay(parseInt(slashMatch[1]), parseInt(slashMatch[2]), year)
    if (iso) return iso
  }

  // Month-name dates: "march 5", "5 mar 2026"
  const monthName = parseMonthName(lower)
  if (monthName) return monthName

  if (lower.includes('yesterday')) {
    const d = new Date(today)
    d.setDate(today.getDate() - 1)
    return toISODate(d)
  }

  if (/\b(?:today|now)\b/.test(lower)) {
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
    if (new RegExp(`\\b${day}\\b`).test(lower)) {
      return toISODate(getPastDayOfWeek(day, 1))
    }
  }

  return null
}

export function parseDate(text: string): string {
  return findDate(text) ?? toISODate(new Date())
}

// Date-stripping patterns — shared by merchant extraction and `isDateOnly`.
const DATE_STRIP_PATTERNS: RegExp[] = [
  // Relative words
  /\b(?:yesterday|today|now|last\s+(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)|\d+\s+days?\s+ago)\b/gi,
  /\b(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi,
  // Month-name dates — `\s*` mirrors the optional gap in MONTH_NAME_PATTERNS so
  // glued forms ("Aug8") are stripped from merchant text and read as date-only.
  new RegExp(`\\b(${MONTH_ALT})\\.?\\s*\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?\\b`, 'gi'),
  new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s*(${MONTH_ALT})\\.?(?:,?\\s+\\d{4})?\\b`, 'gi'),
  // ISO / slash dates
  /\b\d{4}-\d{2}-\d{2}\b/g,
  /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g,
]

function stripDates(text: string): string {
  let clean = text
  for (const pattern of DATE_STRIP_PATTERNS) clean = clean.replace(pattern, ' ')
  return clean
}

/**
 * True when the (trimmed) text is *only* a date expression — i.e. a standalone
 * date line whose date should apply to the entries that follow it. Optional
 * leading filler like "on" / "date:" / "-" is tolerated.
 */
export function isDateOnly(text: string): boolean {
  const t = text.trim().replace(/^(?:on|date)\s*:?\s+/i, '').replace(/^[-–—•*]\s*/, '').trim()
  if (!t) return false
  if (!findDate(t)) return false
  // Nothing but the date (and punctuation) may remain after stripping.
  const remainder = stripDates(t).replace(/[\s,.:;–—-]+/g, '')
  return remainder === ''
}

// ─── Merchant Extraction ──────────────────────────────────────────────────────

// Tokens that should be removed from the raw string before extracting merchant
const STRIP_PATTERNS: RegExp[] = [
  // Currency amounts
  /[₱$]\s*[\d,]+(?:\.\d{1,2})?/g,
  /\b(?:php|usd)\s*[\d,]+(?:\.\d{1,2})?/gi,
  /\b[\d,]*\.?\d+\s*[km]\b/gi,
  /[\d,]+(?:\.\d{1,2})?\s*(?:dollars?|pesos?|php|usd)/gi,
  // Arithmetic amounts ("337+130", "3x150") — stripped whole so no stray
  // operator survives into the merchant name. Must precede the plain-number
  // rule, which would otherwise leave the operator behind.
  new RegExp(ARITHMETIC_PATTERN.source, 'gi'),
  /\b[\d,]{2,}(?:\.\d{1,2})?\b/g,
  // Colon that separates a name from its amount ("Dali: 376" → "Dali"). Dropped
  // here so it never leaks into the merchant name.
  /:/g,
  // Filler words
  /\b(?:for|at|in|on|from|to|the|a|an|my|i|me|bought|paid|spent|got|used|went|worth|of)\b/gi,
]

const MERCHANT_NORMALIZATIONS: Array<[RegExp, string]> = [
  [/\bmcd(?:onalds?)?\b/i, "McDonald's"],
  [/\bjollibee\b/i, 'Jollibee'],
  [/\bjbee\b/i, 'Jollibee'],
  [/\bkfc\b/i, 'KFC'],
  [/\bchowking\b/i, 'Chowking'],
  [/\bgreenwich\b/i, 'Greenwich'],
  [/\bmang\s*inasal\b/i, 'Mang Inasal'],
  [/\bmax'?s\b/i, "Max's"],
  [/\bgoldilocks\b/i, 'Goldilocks'],
  [/\bred\s*ribbon\b/i, 'Red Ribbon'],
  [/\bdunkin'?\b/i, 'Dunkin'],
  [/\bstarbucks?\b/i, 'Starbucks'],
  [/\bbo'?s\s*coffee\b/i, "Bo's Coffee"],
  [/\bfoodpanda\b/i, 'Foodpanda'],
  [/\bgrab(?:food|taxi|express|mart|car)?\b/i, 'Grab'],
  [/\bangkas\b/i, 'Angkas'],
  [/\bjoyride\b/i, 'JoyRide'],
  [/\bnetflix\b/i, 'Netflix'],
  [/\bspotify\b/i, 'Spotify'],
  [/\byoutube\b/i, 'YouTube'],
  [/\blazada\b/i, 'Lazada'],
  [/\bshopee\b/i, 'Shopee'],
  [/\btiktok\b/i, 'TikTok'],
  [/\bmeralco\b/i, 'Meralco'],
  [/\bpldt\b/i, 'PLDT'],
  [/\bglobe\b/i, 'Globe'],
  [/\bsmart\b/i, 'Smart'],
  [/\bconverge\b/i, 'Converge'],
  [/\bmaynilad\b/i, 'Maynilad'],
  [/\bwatsons?\b/i, 'Watsons'],
  [/\bmercury\s*drug\b/i, 'Mercury Drug'],
  [/\b7[\s-]?eleven\b/i, '7-Eleven'],
  [/\bministop\b/i, 'Ministop'],
  [/\bfamily\s*mart\b/i, 'FamilyMart'],
  [/\bnational\s*book\s*store\b/i, 'National Book Store'],
  [/\bgcash\b/i, 'GCash'],
  [/\bmaya\b/i, 'Maya'],
  [/\bsm\b/i, 'SM'],
  [/\bpuregold\b/i, 'Puregold'],
  [/\blanders\b/i, "Lander's"],
  [/\brobinsons?\b/i, 'Robinsons'],
  [/\bsteam\b/i, 'Steam'],
]

// All payment-method tokens (except cash's), longest first — used to strip a
// trailing method tag like "/cc" or "- gcash" from the merchant name.
const METHOD_STRIP_WORDS: string[] = PAYMENT_METHODS
  .flatMap((m) => m.keywords)
  .sort((a, b) => b.length - a.length)

export function parseMerchant(text: string): string {
  let clean = stripDates(text)

  for (const pattern of STRIP_PATTERNS) {
    clean = clean.replace(pattern, ' ')
  }

  // Strip payment-method tags ("grocery /cc" → "grocery"). Guarded: if removing
  // them would empty the name (e.g. the entry IS "gcash 500"), keep the original
  // so the method word can still serve as the merchant.
  let withoutMethod = clean
  for (const word of METHOD_STRIP_WORDS) {
    withoutMethod = withoutMethod.replace(methodTokenRegex_global(word), ' ')
  }
  if (withoutMethod.replace(/\s+/g, ' ').trim()) {
    clean = withoutMethod
  }

  // Collapse whitespace, then trim any orphaned separator punctuation left where
  // a method tag was removed ("Dali - db" → "Dali -" → "Dali").
  clean = clean.replace(/\s+/g, ' ').trim().replace(/[\s/\-–—,]+$/, '').replace(/^[\s/\-–—,]+/, '').trim()

  if (!clean) return 'Unknown'

  // Apply known normalizations
  for (const [pattern, normalized] of MERCHANT_NORMALIZATIONS) {
    if (pattern.test(clean)) return normalized
  }

  const titleCase = (s: string) =>
    s
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())

  // A parenthetical/bracketed group is an itemized detail the user typed on
  // purpose — e.g. "veggies (lettuce, celery, gabi, etc)" — not extra merchant
  // words to trim. Keep it verbatim and apply the 3-word cap only to the head
  // that precedes it, so nothing inside the brackets is dropped.
  const bracketIdx = clean.search(/[([{]/)
  if (bracketIdx !== -1) {
    const head = clean.slice(0, bracketIdx).trim()
    const detail = clean.slice(bracketIdx).trim()
    const headTitled = titleCase(head).slice(0, 3).join(' ')
    return headTitled ? `${headTitled} ${detail}` : detail
  }

  // Title-case whatever remains, capped at 3 words for a clean merchant name.
  return titleCase(clean).slice(0, 3).join(' ')
}

// ─── Compose ──────────────────────────────────────────────────────────────────

export function parseTransaction(raw: string, contextDate?: string): TransactionDraft {
  const trimmed = raw.trim()

  // Prefer a date written on the entry's own line. When none is present, fall
  // back to a context date (e.g. a standalone date line above this entry in a
  // bulk paste), and only then to today.
  const inlineDate = findDate(trimmed)
  const date = inlineDate ?? contextDate ?? toISODate(new Date())

  return {
    raw: trimmed,
    amount: parseAmount(trimmed),
    merchant: parseMerchant(trimmed),
    type: parseDirection(trimmed),
    paymentMethod: parsePaymentMethod(trimmed),
    date,
    isReimbursement: parseReimbursement(trimmed),
  }
}
