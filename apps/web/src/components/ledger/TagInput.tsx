'use client'

import { useState } from 'react'
import { X, Hash, Plus } from '@phosphor-icons/react'
import { normalizeTag, normalizeTags, tagKey, MAX_TAG_LENGTH, MAX_TAGS_PER_TRANSACTION } from '@/lib/tags'

interface Props {
  value: string[]
  onChange: (tags: string[]) => void
  /** Existing tags to offer, most relevant first (see recentTags). */
  suggestions?: string[]
  placeholder?: string
  autoFocus?: boolean
  /** Reports the uncommitted text so a parent can treat it as a pending tag. */
  onDraftChange?: (draft: string) => void
}

/** How many suggestion chips to show under the field. */
const MAX_SUGGESTIONS = 6

/**
 * Chip-style tag editor. Enter or comma commits the typed tag, Backspace on an
 * empty field removes the last one, and existing tags are offered as one-tap
 * suggestions (filtered by what's typed) so spellings stay consistent —
 * "Oct Vacation" totals only work if every entry uses the same label.
 */
export default function TagInput({ value, onChange, suggestions = [], placeholder = 'Add a tag, e.g. Oct Vacation', autoFocus, onDraftChange }: Props) {
  const [draft, setDraftState] = useState('')
  const setDraft = (next: string) => {
    setDraftState(next)
    onDraftChange?.(next)
  }
  const full = value.length >= MAX_TAGS_PER_TRANSACTION

  /** Commit one or more typed tags, keeping `rest` as the new draft. */
  function add(raws: string[], rest = '') {
    setDraft(rest)
    const tags = raws
      .map(normalizeTag)
      .filter(Boolean)
      // Reuse an existing spelling ("oct vacation" → "Oct Vacation").
      .map((typed) => suggestions.find((s) => tagKey(s) === tagKey(typed)) ?? typed)
    if (tags.length > 0) onChange(normalizeTags([...value, ...tags]))
  }

  function remove(tag: string) {
    onChange(value.filter((t) => t !== tag))
  }

  const query = tagKey(draft)
  const taken = new Set(value.map((t) => t.toLowerCase()))
  const matches = suggestions
    .filter((s) => !taken.has(s.toLowerCase()) && (query === '' || s.toLowerCase().includes(query)))
    .slice(0, MAX_SUGGESTIONS)

  return (
    <div>
      <div
        className="flex flex-wrap items-center gap-1.5 rounded-xl px-3 py-2.5"
        style={{ background: '#ffffff', border: '1px solid #e7edeb' }}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full py-1 pl-2.5 pr-1 text-[12px] font-semibold"
            style={{ background: 'rgba(31,105,80,0.1)', color: '#1f695d' }}
          >
            <Hash size={10} weight="bold" aria-hidden="true" />
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              aria-label={`Remove tag ${tag}`}
              className="flex h-4 w-4 items-center justify-center rounded-full"
              style={{ background: 'rgba(31,105,80,0.14)' }}
            >
              <X size={8} weight="bold" aria-hidden="true" />
            </button>
          </span>
        ))}
        {!full && (
          <input
            type="text"
            value={draft}
            autoFocus={autoFocus}
            onChange={(e) => {
              // Commas separate tags: commit every complete part (so pasting
              // "Trip, Food" adds both) and keep the trailing part as the draft.
              const parts = e.target.value.split(',')
              const rest = parts.pop() ?? ''
              if (parts.length > 0) add(parts, rest.slice(0, MAX_TAG_LENGTH))
              else setDraft(rest.slice(0, MAX_TAG_LENGTH))
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add([draft])
              } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
                remove(value[value.length - 1])
              }
            }}
            onBlur={() => { if (draft.trim()) add([draft]) }}
            placeholder={value.length === 0 ? placeholder : 'Add another…'}
            aria-label="Add tag"
            className="min-w-[8rem] flex-1 bg-transparent py-0.5 text-[13px] font-semibold outline-none"
            style={{ color: '#191c1c' }}
          />
        )}
      </div>

      {!full && matches.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Suggested tags">
          {matches.map((tag) => (
            <button
              key={tag}
              type="button"
              // Keep focus in the field so its onBlur doesn't commit the draft first.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add([tag])}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{ background: '#f0f4f2', color: '#3f4946' }}
            >
              <Plus size={9} weight="bold" aria-hidden="true" />
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
