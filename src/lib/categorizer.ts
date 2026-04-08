import { CATEGORIES } from '@/types'
import type { Category, CategoryId, TransactionDraft } from '@/types'

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

// ─── Categorize ───────────────────────────────────────────────────────────────

export interface CategorizationResult {
  category: Category
  confidence: number
}

export function categorize(
  draft: TransactionDraft,
  learnedOverrides?: Record<string, CategoryId>,
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

  // ── User-learned override (highest priority) ──────────────────────────────
  if (learnedOverrides && Object.keys(learnedOverrides).length > 0) {
    const key = getMerchantKey(draft)
    const learnedId = learnedOverrides[key]
    if (learnedId) {
      const learnedCategory = CATEGORIES.find((c) => c.id === learnedId)
      if (learnedCategory) {
        return { category: learnedCategory, confidence: 0.99 }
      }
    }
    // Also check every word in the raw text against overrides
    const words = draft.raw.toLowerCase().split(/[\s,.\-\/;]+/).filter(Boolean)
    for (const word of words) {
      const wordId = learnedOverrides[word]
      if (wordId) {
        const wordCategory = CATEGORIES.find((c) => c.id === wordId)
        if (wordCategory) return { category: wordCategory, confidence: 0.97 }
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
