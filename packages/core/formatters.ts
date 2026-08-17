// ─── Currency ─────────────────────────────────────────────────────────────────

const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Format a number as Philippine Peso.
 * @param amount   The raw value (always positive — pass `type` separately if needed)
 * @param showSign If true, prepend + for positive values
 */
export function formatCurrency(amount: number, showSign = false): string {
  const formatted = pesoFormatter.format(Math.abs(amount))
  if (showSign && amount > 0) return `+${formatted}`
  if (amount < 0) return `-${formatted}`
  return formatted
}

/**
 * Compact format: ₱1.2k, ₱3.4M
 */
export function formatCurrencyCompact(amount: number): string {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}₱${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}₱${(abs / 1_000).toFixed(1)}k`
  return `${sign}₱${abs.toFixed(2)}`
}

// ─── Dates ────────────────────────────────────────────────────────────────────

function parseISODate(dateStr: string): Date {
  // Parse YYYY-MM-DD as local midnight to avoid timezone flips
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function yesterdayStr(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

/**
 * Human-readable date label: "Today", "Yesterday", or "Mon, Apr 7"
 */
export function formatDate(dateStr: string): string {
  if (dateStr === todayStr()) return 'Today'
  if (dateStr === yesterdayStr()) return 'Yesterday'

  const d = parseISODate(dateStr)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Compact month label: "April 2026"
 */
export function formatMonthLabel(dateStr: string): string {
  const d = parseISODate(dateStr)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/**
 * Relative time string: "just now", "2h ago", "Yesterday", "3 days ago"
 */
export function formatRelativeDate(createdAt: string): string {
  const now = Date.now()
  const then = new Date(createdAt).getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return formatDate(createdAt.split('T')[0])
}

/**
 * Short time: "2:34 PM"
 */
export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

// ─── Numbers ──────────────────────────────────────────────────────────────────

/**
 * Format a percentage with one decimal: "47.2%"
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Format a raw fraction (0–1) as a display percentage string: 0.472 → "47.2%"
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}
