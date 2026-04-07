'use client'

import { motion } from 'framer-motion'
import { formatCurrency } from '@/lib/formatters'

interface Props {
  spent: number
  saved: number
}

export default function SpendDonut({ spent, saved }: Props) {
  const total = spent + saved
  const spentRatio = total > 0 ? spent / total : 0
  const size = 96
  const strokeWidth = 8
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const spentDash = circumference * spentRatio
  const savedDash = circumference * (1 - spentRatio)

  return (
    <div className="flex items-center gap-6 border-t border-ledge-border py-5">
      {/* SVG ring */}
      <div className="shrink-0">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#1F1F27"
            strokeWidth={strokeWidth}
          />
          {/* Spent arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#F43F5E"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - spentDash }}
            transition={{ type: 'spring', stiffness: 60, damping: 18, delay: 0.15 }}
          />
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-3 min-w-0">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ledge-muted">
            Spent
          </p>
          <p className="font-mono text-xl font-semibold text-rose-400">
            {formatCurrency(spent)}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ledge-muted">
            Saved
          </p>
          <p className="font-mono text-xl font-semibold text-emerald-400">
            {formatCurrency(saved)}
          </p>
        </div>
      </div>
    </div>
  )
}
