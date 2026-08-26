import { CATEGORIES, resolveCategory } from './types'
import type { Category, CustomCategory, TransactionDraft } from './types'

// ─── Keyword Index ────────────────────────────────────────────────────────────

interface IndexEntry {
  category: Category
  /** Longer keywords get higher specificity weight */
  specificity: number
}

// Build a flat keyword → category map at module load time (once)
const keywordIndex = new Map<string, IndexEntry>()

for (const category of CATEGORIES) {
  for (const keyword of category.keywords) {
    const existing = keywordIndex.get(keyword)
    const specificity = keyword.split(/\s+/).length // multi-word = more specific
    if (!existing || specificity > existing.specificity) {
      keywordIndex.set(keyword, { category, specificity })
    }
  }
}

// ─── Merchant Key ─────────────────────────────────────────────────────────────

/**
 * Returns a stable lower-case key representing the primary entity in a draft.
 * Used as the key for persisted user-correction overrides.
 */
export function getMerchantKey(draft: TransactionDraft): string {
  if (draft.merchant && draft.merchant !== 'Unknown') {
    return draft.merchant.toLowerCase().trim()
  }
  // Fallback: first non-numeric, non-currency token from raw text
  const tokens = draft.raw
    .toLowerCase()
    .split(/[\s,.\-\/;]+/)
    .filter((t) => t && !/^[\d₱$.,]+$/.test(t))
  return tokens[0] ?? draft.raw.slice(0, 20).toLowerCase().trim()
}

// ─── History-based learning ─────────────────────────────────────────────────

/** Minimal transaction shape needed to learn category associations from history. */
interface HistoryTxn {
  merchant: string
  category: { id: string }
  type: string
  createdAt: string
}

// Category ids that carry no merchant→category signal: 'other' is the
// uninformative fallback, and income/transfer/debt entries are typed by their
// direction, not their merchant, so they'd pollute the learned map.
const NON_LEARNABLE_IDS = new Set(['other', 'income', 'transfers', 'debts'])

/**
 * Derive merchant → category overrides from the user's already-logged
 * transactions, so categorization gets smarter with every entry — without any
 * explicit correction. For each merchant key we pick the category the user has
 * assigned it most often (ties broken by most-recent use). Only expense entries
 * with an informative category count.
 *
 * The returned map is keyed the same way `getMerchantKey` produces keys, so it
 * plugs straight into `categorize`'s `learnedOverrides` argument. Explicit
 * user corrections should be layered ON TOP (they win) via object spread.
 */
export function buildHistoryOverrides(
  transactions: HistoryTxn[],
): Record<string, string> {
  // key → categoryId → { count, lastUsed }
  const tally = new Map<string, Map<string, { count: number; lastUsed: string }>>()

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue
    if (NON_LEARNABLE_IDS.has(tx.category.id)) continue
    const key = tx.merchant?.toLowerCase().trim()
    if (!key || key === 'unknown') continue

    let byCat = tally.get(key)
    if (!byCat) {
      byCat = new Map()
      tally.set(key, byCat)
    }
    const cur = byCat.get(tx.category.id)
    if (cur) {
      cur.count++
      if (tx.createdAt > cur.lastUsed) cur.lastUsed = tx.createdAt
    } else {
      byCat.set(tx.category.id, { count: 1, lastUsed: tx.createdAt })
    }
  }

  const overrides: Record<string, string> = {}
  for (const [key, byCat] of tally) {
    let bestId: string | null = null
    let best = { count: 0, lastUsed: '' }
    for (const [catId, stat] of byCat) {
      if (stat.count > best.count || (stat.count === best.count && stat.lastUsed > best.lastUsed)) {
        best = stat
        bestId = catId
      }
    }
    if (bestId) overrides[key] = bestId
  }
  return overrides
}

// ─── Categorize ───────────────────────────────────────────────────────────────

export interface CategorizationResult {
  category: Category
  confidence: number
}

export function categorize(
  draft: TransactionDraft,
  learnedOverrides?: Record<string, string>,
  customCategories: CustomCategory[] = [],
): CategorizationResult {
  const fallback: CategorizationResult = {
    category: CATEGORIES.find((c) => c.id === 'other')!,
    confidence: 0.5,
  }

  // Income type always maps to the Income category
  if (draft.type === 'income') {
    return {
      category: CATEGORIES.find((c) => c.id === 'income')!,
      confidence: 0.99,
    }
  }

  // Transfers (e.g. credit-card payments) map to the neutral Transfer category
  if (draft.type === 'transfer') {
    return {
      category: CATEGORIES.find((c) => c.id === 'transfers')!,
      confidence: 0.99,
    }
  }

  // ── User-learned override (highest priority) ──────────────────────────────
  // Resolves both preset ids and custom-category UUIDs so a merchant the user
  // filed under a custom category is recognised on sight. resolveCategory falls
  // back to 'other' for stale ids (e.g. a deleted custom category), which we
  // treat as "no match" so it doesn't hijack keyword scoring below.
  if (learnedOverrides && Object.keys(learnedOverrides).length > 0) {
    const key = getMerchantKey(draft)
    const learnedId = learnedOverrides[key]
    if (learnedId) {
      const learnedCategory = resolveCategory(learnedId, customCategories)
      if (learnedCategory.id === learnedId) {
        return { category: learnedCategory, confidence: 0.99 }
      }
    }
    // Also check every word in the raw text against overrides
    const words = draft.raw.toLowerCase().split(/[\s,.\-\/;]+/).filter(Boolean)
    for (const word of words) {
      const wordId = learnedOverrides[word]
      if (wordId) {
        const wordCategory = resolveCategory(wordId, customCategories)
        if (wordCategory.id === wordId) return { category: wordCategory, confidence: 0.97 }
      }
    }
  }

  const searchText = `${draft.raw} ${draft.merchant}`.toLowerCase()
  const tokens = searchText.split(/[\s,.\-\/]+/).filter(Boolean)

  let bestMatch: IndexEntry | null = null
  let bestScore = 0

  // Score every category by summing specificities of all matching keywords
  const categoryScores = new Map<string, { entry: IndexEntry; score: number }>()

  for (const [keyword, entry] of keywordIndex) {
    if (entry.category.id === 'income') continue // income handled above

    // Multi-word keywords need a substring match on the full text
    const isMatch = keyword.includes(' ')
      ? searchText.includes(keyword)
      : tokens.includes(keyword)

    if (isMatch) {
      const existing = categoryScores.get(entry.category.id)
      const score = (existing?.score ?? 0) + entry.specificity
      categoryScores.set(entry.category.id, { entry, score })

      if (score > bestScore) {
        bestScore = score
        bestMatch = entry
      }
    }
  }

  if (!bestMatch || bestScore === 0) return fallback

  // Normalize confidence: clamp between 0.5 and 0.99
  // Higher specificity / more matched tokens → higher confidence
  const totalTokens = tokens.length || 1
  const rawConfidence = Math.min(bestScore / totalTokens, 1)
  const confidence = Math.max(0.5, Math.min(0.99, 0.5 + rawConfidence * 0.49))

  return {
    category: bestMatch.category,
    confidence: parseFloat(confidence.toFixed(2)),
  }
}
