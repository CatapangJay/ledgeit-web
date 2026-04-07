'use client'

import { formatCurrency } from '@/lib/formatters'

interface Metric {
  label: string
  value: string
  sub?: string
  color?: string
}

interface Props {
  metrics: Metric[]
}

export default function MetricStrip({ metrics }: Props) {
  return (
    <div className="grid grid-cols-3 gap-0 border-t border-ledge-border py-4">
      {metrics.map((m, i) => (
        <div
          key={m.label}
          className={`flex flex-col gap-1 ${i > 0 ? 'border-l border-ledge-border pl-4' : ''}`}
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ledge-muted">
            {m.label}
          </span>
          <span
            className={`font-mono text-base font-semibold leading-none ${
              m.color ?? 'text-ledge-data'
            }`}
          >
            {m.value}
          </span>
          {m.sub && (
            <span className="font-mono text-[10px] text-ledge-border">{m.sub}</span>
          )}
        </div>
      ))}
    </div>
  )
}

export { formatCurrency }
