import { formatDate, formatCurrency } from '@/lib/formatters'
import type { Transaction } from '@/types'

interface Props {
  date: string
  transactions: Transaction[]
}

export default function DateGroup({ date, transactions }: Props) {
  const subtotal = transactions.reduce(
    (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount),
    0
  )
  const isNet = subtotal >= 0

  return (
    <div className="flex items-center justify-between border-t border-ledge-border pb-1 pt-5">
      <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ledge-muted">
        {formatDate(date)}
      </span>
      <span
        className={`font-mono text-xs font-semibold ${
          isNet ? 'text-emerald-400' : 'text-rose-400'
        }`}
      >
        {subtotal >= 0 ? '+' : '−'}
        {formatCurrency(Math.abs(subtotal))}
      </span>
    </div>
  )
}
