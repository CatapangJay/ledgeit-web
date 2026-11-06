import { spendAmount, isEarn } from './types'
import type { Transaction } from './types'

/** Longest tag we accept — keeps chips readable on small screens. */
export const MAX_TAG_LENGTH = 30

/** Most tags a single transaction can carry. */
export const MAX_TAGS_PER_TRANSACTION = 10

/**
 * Clean a user-typed tag: trim, drop a leading "#", collapse inner whitespace,
 * and cap the length. Returns '' when nothing usable is left.
 */
export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TAG_LENGTH)
    .trim()
}

/** Case-insensitive identity for a tag ("Oct Vacation" ≡ "oct vacation"). */
export function tagKey(tag: string): string {
  return normalizeTag(tag).toLowerCase()
}

/**
 * Normalize a list of tags, dropping empties and case-insensitive duplicates
 * (the first spelling wins) and capping at MAX_TAGS_PER_TRANSACTION.
 */
export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of tags) {
    const tag = normalizeTag(raw)
    const key = tag.toLowerCase()
    if (!tag || seen.has(key)) continue
    seen.add(key)
    out.push(tag)
    if (out.length >= MAX_TAGS_PER_TRANSACTION) break
  }
  return out
}

/** Whether a transaction carries the given tag (case-insensitive). */
export function hasTag(t: { tags?: string[] }, tag: string): boolean {
  const key = tagKey(tag)
  return (t.tags ?? []).some((x) => tagKey(x) === key)
}

export interface TagSummary {
  /** Display spelling — the most recently used one wins. */
  tag: string
  /** Net spend: expenses minus reimbursements (same rule as category totals). */
  spent: number
  /** Real income tagged with this label. */
  earned: number
  /** Number of tagged transactions (any type). */
  count: number
  /** Earliest / latest tagged date (YYYY-MM-DD). */
  firstDate: string
  lastDate: string
}

/**
 * Roll up every tag across `transactions`, sorted by net spend (highest first),
 * then by most recent use. Transfers count toward `count` but not the totals,
 * matching how the rest of the app excludes them from spending.
 */
export function summarizeTags(transactions: readonly Transaction[]): TagSummary[] {
  const map = new Map<string, TagSummary & { lastCreated: string }>()
  for (const t of transactions) {
    if (!t.tags || t.tags.length === 0) continue
    const spent = spendAmount(t)
    const earned = isEarn(t) ? t.amount : 0
    for (const tag of t.tags) {
      const key = tagKey(tag)
      if (!key) continue
      const s = map.get(key)
      if (!s) {
        map.set(key, {
          tag, spent, earned, count: 1,
          firstDate: t.date, lastDate: t.date, lastCreated: t.createdAt,
        })
        continue
      }
      s.spent += spent
      s.earned += earned
      s.count += 1
      if (t.date < s.firstDate) s.firstDate = t.date
      if (t.date > s.lastDate) s.lastDate = t.date
      if (t.createdAt > s.lastCreated) {
        s.lastCreated = t.createdAt
        s.tag = tag
      }
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.spent - a.spent || b.lastDate.localeCompare(a.lastDate))
    .map(({ lastCreated: _lastCreated, ...s }) => s)
}

/** Distinct tag spellings, most recently used first — for autocomplete. */
export function recentTags(transactions: readonly Transaction[]): string[] {
  const tagged = transactions
    .filter((t) => t.tags && t.tags.length > 0)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of tagged) {
    for (const tag of t.tags ?? []) {
      const key = tagKey(tag)
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(tag)
    }
  }
  return out
}
