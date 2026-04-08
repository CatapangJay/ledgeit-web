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
    <div
      className="flex items-center gap-6 rounded-2xl p-5"
      style={{ background: '#ffffff', boxShadow: '0 2px 12px rgba(0,53,46,0.06)' }}
    >
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
            stroke="#f0f4f2"
            strokeWidth={strokeWidth}
          />
          {/* Spent arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#ba1a1a"
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
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
            Spent
          </p>
          <p className="font-mono text-xl font-bold" style={{ color: '#ba1a1a' }}>
            {formatCurrency(spent)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
            Saved
          </p>
          <p className="font-mono text-xl font-bold" style={{ color: '#1f6950' }}>
            {formatCurrency(saved)}
          </p>
        </div>
      </div>
    </div>
  )
}
