'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FilterChips from '@/components/ledger/FilterChips'
import DateGroup from '@/components/ledger/DateGroup'
import TransactionRow from '@/components/ledger/TransactionRow'
import CategoryBreakdownBar from '@/components/ledger/CategoryBreakdownBar'
import { useStore } from '@/lib/store'
import type { FilterValue } from '@/components/ledger/FilterChips'
import type { Transaction } from '@/types'

function groupByDate(txns: Transaction[]): [string, Transaction[]][] {
  const map = new Map<string, Transaction[]>()
  for (const tx of txns) {
    const list = map.get(tx.date) ?? []
    list.push(tx)
    map.set(tx.date, list)
  }
  return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a))
}

function EmptyFiltered() {
  return (
    <div className="flex flex-col items-start gap-2 py-14">
      <p className="text-sm font-medium" style={{ color: '#6e9990' }}>No transactions in this filter.</p>
      <p className="text-xs" style={{ color: '#cde0db' }}>Try selecting a different category.</p>
    </div>
  )
}

export default function LedgerPage() {
  const [filter, setFilter] = useState<FilterValue>('all')
  const transactions = useStore((s) => s.transactions)
  const deleteTransaction = useStore((s) => s.deleteTransaction)

  const filtered = useMemo(() => {
    if (filter === 'all') return transactions
    if (filter === 'expense') return transactions.filter((t) => t.type === 'expense')
    if (filter === 'income') return transactions.filter((t) => t.type === 'income')
    return transactions.filter((t) => t.category.id === filter)
  }, [transactions, filter])

  const groups = groupByDate(filtered)

  return (
    <div className="px-5 pb-4" style={{ background: '#f8faf9', minHeight: '100dvh' }}>
      {/* Header */}
      <div className="flex items-baseline gap-3 pb-4 pt-12">
        <h1 className="text-base font-bold tracking-tight" style={{ color: '#00352e' }}>
          Activity
        </h1>
        <span className="text-xs font-semibold" style={{ color: '#6e9990' }}>
          {filtered.length} entries
        </span>
      </div>

      {/* Filter chips */}
      <div className="mb-4">
        <FilterChips active={filter} onChange={setFilter} />
      </div>

      {/* Category breakdown bar */}
      <CategoryBreakdownBar transactions={transactions} />

      {/* Transaction list */}
      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <EmptyFiltered key="empty" />
        ) : (
          <motion.div
            key={filter}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <AnimatePresence initial={false}>
              {groups.map(([date, txns]) => (
                <div key={date} className="mb-4">
                  <DateGroup date={date} transactions={txns} />
                  <div
                    className="overflow-hidden rounded-2xl"
                    style={{ background: '#ffffff', boxShadow: '0 2px 12px rgba(0,53,46,0.06)' }}
                  >
                    <AnimatePresence initial={false}>
                      {txns.map((tx, i) => (
                        <div
                          key={tx.id}
                          style={i > 0 ? { borderTop: '1px solid #f0f4f2' } : undefined}
                        >
                          <TransactionRow tx={tx} onDelete={deleteTransaction} />
                        </div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
