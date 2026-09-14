// ─── Canonical Merchant List ──────────────────────────────────────────────────
// PH-centric brand registry used as the base for fuzzy resolution.

const CANONICAL_MERCHANTS = [
  // Fast food
  "McDonald's",
  'Jollibee',
  'KFC',
  'Burger King',
  "Wendy's",
  'Chowking',
  'Mang Inasal',
  'Greenwich',
  'Goldilocks',
  'Red Ribbon',
  'Pizza Hut',
  "Shakey's",
  'Yellow Cab',
  // Coffee
  'Starbucks',
  'Coffee Bean',
  'Dunkin',
  "Bo's Coffee",
  // Delivery / Ride-hailing
  'Grab',
  'GrabFood',
  'GrabMart',
  'Angkas',
  'Uber',
  'Foodpanda',
  // Streaming / Digital
  'Netflix',
  'Spotify',
  'Disney+',
  'HBO Go',
  'Apple TV',
  'YouTube Premium',
  'Steam',
  'PlayStation Store',
  // E-commerce
  'Lazada',
  'Shopee',
  'Zalora',
  'Shein',
  'Amazon',
  // Grocery / Retail
  'SM',
  'Puregold',
  "Lander's",
  'Robinsons',
  'S&R',
  'Waltermart',
  'AllDay Supermarket',
  // Utilities / Telco
  'Meralco',
  'PLDT',
  'Globe',
  'Smart',
  'Converge',
  'Cignal',
  'SKY Cable',
  // Pharmacy
  'Watsons',
  'Mercury Drug',
  'Rose Pharmacy',
  'Generika',
  // Fashion / General retail
  'Uniqlo',
  'H&M',
  'Zara',
  'SM Store',
  'Bench',
  'Penshoppe',
  // Payments / Remittance
  'GCash',
  'Maya',
  'Bayad Center',
  'LBC',
  'Western Union',
  'Palawan Express',
]

// ─── Levenshtein Distance ─────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  // Use two rolling rows to save memory
  const prev = Array.from({ length: n + 1 }, (_, i) => i)
  const curr: number[] = new Array(n + 1)
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1])
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j]
  }
  return prev[n]
}

// ─── Score ────────────────────────────────────────────────────────────────────

/**
 * Returns a 0–1 similarity score between `input` and `candidate`.
 * Applies several heuristics in priority order before falling back to edit distance.
 */
function scoreCandidate(input: string, candidate: string): number {
  const a = input.toLowerCase().trim()
  const b = candidate.toLowerCase().trim()
  const bWords = b.split(/\s+/)

  // ── Exact match ──
  if (a === b) return 1.0

  // ── Full prefix: "maca" starts "macau imperial" ──
  if (b.startsWith(a)) {
    return Math.max(0.72, 0.93 - (b.length - a.length) * 0.012)
  }

  // ── Input starts with candidate (e.g. "mcdonald" ≈ "mcd") ──
  if (a.startsWith(b) && b.length >= 3) return 0.87

  // ── Any word in candidate starts with input ("macau" starts with "maca") ──
  if (bWords.some((w) => w.startsWith(a) && a.length >= 3)) return 0.84

  // ── Doubled-letter transposition typo: "jolibee" ↔ "jollibee" ──
  // Remove consecutive duplicate chars and check equality
  const bDedoubled = b.replace(/(.)\1+/g, '$1')
  const aDedoubled = a.replace(/(.)\1+/g, '$1')
  if (bDedoubled === a || aDedoubled === b || aDedoubled === bDedoubled) return 0.87

  // ── Adjacent-swap typo: "mcod" → "mcdo", "recieve" → "receive" ──
  // Try every single adjacent-character swap in the input. If a swap lands on
  // the whole candidate it's a clean typo; if it lands on the candidate's start
  // it's a typo'd abbreviation of a longer brand ("mcod" → "mcdo…nald's").
  for (let i = 0; i < a.length - 1; i++) {
    if (a[i] === a[i + 1]) continue
    const swapped = a.slice(0, i) + a[i + 1] + a[i] + a.slice(i + 2)
    if (swapped === b) return 0.9
    if (b.startsWith(swapped) && swapped.length >= 3) {
      return Math.max(0.8, 0.9 - (b.length - swapped.length) * 0.012)
    }
  }

  // ── Levenshtein on full strings ──
  const minLen = Math.min(a.length, b.length)
  const threshold = Math.max(1, Math.floor(minLen / 4))
  const dist = levenshtein(a, b)
  if (dist <= threshold) return 0.52 + (1 - dist / (threshold + 1)) * 0.28

  // ── Word-level levenshtein for multi-word candidates ──
  for (const word of bWords) {
    if (word.length < 3) continue
    const wThreshold = Math.max(1, Math.floor(Math.min(a.length, word.length) / 4))
    const wDist = levenshtein(a, word)
    if (wDist <= wThreshold) return 0.46 + (1 - wDist / (wThreshold + 1)) * 0.2
  }

  return 0
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface MerchantSuggestion {
  name: string
  score: number
  /** Whether this came from the builtin canonical list or from the user's history */
  source: 'builtin' | 'history'
}

export interface HistoryMerchant {
  name: string
  /** Number of times this merchant has appeared in logged transactions */
  freq: number
}

/**
 * Score all canonical + history merchants against `input` and return the top
 * matches sorted by descending score.
 *
 * Pass in `historyMerchants` derived from the persisted transaction store so
 * that user-logged merchants are always preferred.
 *
 * Suggestions where the name equals the current `input` exactly (case-insensitive)
 * are **filtered out** — they are not corrections.
 */
export function getMerchantSuggestions(
  input: string,
  historyMerchants: HistoryMerchant[],
  opts: { maxResults?: number; minScore?: number } = {},
): MerchantSuggestion[] {
  const { maxResults = 3, minScore = 0.60 } = opts

  if (!input || input === 'Unknown' || input.length < 2) return []

  const inputLower = input.toLowerCase().trim()
  const seen = new Map<string, MerchantSuggestion>() // name (lowercase) → suggestion

  // ── Score builtin canonicals ──
  for (const name of CANONICAL_MERCHANTS) {
    const score = scoreCandidate(input, name)
    if (score < minScore) continue
    const key = name.toLowerCase()
    const existing = seen.get(key)
    if (!existing || score > existing.score) {
      seen.set(key, { name, score, source: 'builtin' })
    }
  }

  // ── Score history merchants (boost by log-frequency) ──
  for (const { name, freq } of historyMerchants) {
    if (!name || name === 'Unknown') continue
    const score = scoreCandidate(input, name)
    const freqBoost = Math.min(0.08, Math.log(1 + freq) * 0.04)
    const boostedScore = Math.min(0.99, score + freqBoost)
    if (boostedScore < minScore) continue
    const key = name.toLowerCase()
    const existing = seen.get(key)
    if (!existing || boostedScore > existing.score) {
      seen.set(key, { name, score: boostedScore, source: 'history' })
    }
  }

  return [...seen.values()]
    .filter((s) => s.name.toLowerCase() !== inputLower) // don't suggest same name
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
}

/**
 * Returns the single best merchant resolution, or `null` if confidence is below
 * `threshold`. Used for *silent* auto-correction of the merchant name.
 *
 * Silent correction is intentionally conservative: it fixes typos and expands
 * abbreviations ("mcod" → "McDonald's") but must NEVER flatten a name the user
 * deliberately made more specific. When someone types "Grocers gulay and stuff"
 * they want that verbatim, not a silent replacement with the generic "Groceries"
 * from their history. So a match is only auto-applied when it doesn't DROP words
 * the user typed — i.e. the correction has at least as many words as the input.
 * Anything that would shorten a multi-word entry is left to the (non-destructive)
 * suggestion chips instead. `getMerchantSuggestions` is unaffected, so the match
 * still surfaces there as an opt-in.
 */
export function resolveMerchant(
  input: string,
  historyMerchants: HistoryMerchant[],
  threshold = 0.75,
): string | null {
  const [top] = getMerchantSuggestions(input, historyMerchants, {
    maxResults: 1,
    minScore: threshold,
  })
  if (!top) return null

  const inputWords = input.trim().split(/\s+/).filter(Boolean).length
  const matchWords = top.name.trim().split(/\s+/).filter(Boolean).length
  // The user added descriptive words the match doesn't preserve → keep theirs.
  if (matchWords < inputWords) return null

  return top.name
}
