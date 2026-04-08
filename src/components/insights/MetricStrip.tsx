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
    <div
      className="grid grid-cols-3 gap-0 rounded-2xl overflow-hidden py-4"
      style={{ background: '#ffffff', boxShadow: '0 2px 12px rgba(0,53,46,0.06)' }}
    >
      {metrics.map((m, i) => (
        <div
          key={m.label}
          className={`flex flex-col gap-1 px-4 ${i > 0 ? 'pl-4' : ''}`}
          style={i > 0 ? { borderLeft: '1px solid #e7edeb' } : {}}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: '#6e9990' }}>
            {m.label}
          </span>
          <span
            className="font-mono text-base font-bold leading-none"
            style={{ color: m.color ?? '#191c1c' }}
          >
            {m.value}
          </span>
          {m.sub && (
            <span className="text-[10px] font-medium" style={{ color: '#6e9990' }}>{m.sub}</span>
          )}
        </div>
      ))}
    </div>
  )
}

export { formatCurrency }
