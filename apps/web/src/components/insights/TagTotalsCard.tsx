'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CaretRight, Hash } from '@phosphor-icons/react'
import { useStore } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { summarizeTags } from '@/lib/tags'

/** Tags listed before the "Show all" toggle. */
const COLLAPSED_COUNT = 5

/**
 * Insights widget: net spend per tag across ALL time — tags group an event or
 * project ("Oct Vacation") that usually spans months, so they're deliberately
 * not scoped to the month being viewed. Each row deep-links to the ledger
 * filtered by that tag. Hidden until the user has tagged something.
 *
 * Relies on the insights page having loaded the full history.
 */
export default function TagTotalsCard() {
  const transactions = useStore((s) => s.transactions)
  const fullHistoryLoaded = useStore((s) => s.fullHistoryLoaded)
  const [showAll, setShowAll] = useState(false)

  const summaries = useMemo(() => summarizeTags(transactions), [transactions])

  if (summaries.length === 0) return null

  const visible = showAll ? summaries : summaries.slice(0, COLLAPSED_COUNT)
  const maxSpent = Math.max(...summaries.map((s) => s.spent), 0)

  return (
    <div
      className="rounded-2xl px-5 py-4"
      style={{ background: '#ffffff', boxShadow: '0 4px 24px rgba(0,53,46,0.07)' }}
    >
      {/* Header */}
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: '#00352e' }}>
          Tags
        </span>
        <span className="text-[11px] font-semibold" style={{ color: '#6e9990' }}>
          {fullHistoryLoaded ? 'All time' : 'Loading history…'}
        </span>
      </div>

      <ul className="flex flex-col">
        {visible.map((s, i) => (
          <li key={s.tag} style={i > 0 ? { borderTop: '1px solid #f0f4f2' } : undefined}>
            <Link
              href={`/ledger?tag=${encodeURIComponent(s.tag)}`}
              className="flex items-center gap-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-1 text-[13px] font-semibold" style={{ color: '#191c1c' }}>
                    <Hash size={11} weight="bold" style={{ color: '#1f695d' }} aria-hidden="true" />
                    <span className="truncate">{s.tag}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[13px] font-semibold" style={{ color: '#00352e' }}>
                    {formatCurrency(s.spent)}
                  </span>
                </div>
                {/* Share of the biggest tag — a quick visual ranking */}
                <div className="mt-1.5 h-1 overflow-hidden rounded-full" style={{ background: '#f0f4f2' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${maxSpent > 0 ? Math.max((s.spent / maxSpent) * 100, 0) : 0}%`,
                      background: '#1f695d',
                    }}
                  />
                </div>
                <p className="mt-1 text-[11px]" style={{ color: '#6e9990' }}>
                  {s.count} {s.count === 1 ? 'entry' : 'entries'}
                  {' · '}
                  {s.firstDate === s.lastDate
                    ? formatDate(s.firstDate)
                    : `${formatDate(s.firstDate)} – ${formatDate(s.lastDate)}`}
                </p>
              </div>
              <CaretRight size={12} weight="bold" style={{ color: '#cde0db' }} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>

      {summaries.length > COLLAPSED_COUNT && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-1 text-[11px] font-semibold"
          style={{ color: '#1f695d' }}
        >
          {showAll ? 'Show less' : `Show all ${summaries.length}`}
        </button>
      )}
    </div>
  )
}
