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
    <div className="flex items-center justify-between pb-1.5 pt-5">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: '#6e9990' }}>
        {formatDate(date)}
      </span>
      <span
        className="font-mono text-xs font-semibold"
        style={{ color: isNet ? '#1f6950' : '#ba1a1a' }}
      >
        {subtotal >= 0 ? '+' : '−'}
        {formatCurrency(Math.abs(subtotal))}
      </span>
    </div>
  )
}
