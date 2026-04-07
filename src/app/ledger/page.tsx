'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FilterChips from '@/components/ledger/FilterChips'
import DateGroup from '@/components/ledger/DateGroup'
import TransactionRow from '@/components/ledger/TransactionRow'
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
      <p className="text-sm text-ledge-muted">No transactions in this filter.</p>
      <p className="text-xs text-ledge-border">Try selecting a different category.</p>
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
    <div className="px-5">
      {/* Header */}
      <div className="flex items-baseline gap-3 pb-4 pt-12">
        <h1 className="font-mono text-lg font-semibold tracking-tighter text-ledge-data">
          Ledger
        </h1>
        <span className="font-mono text-xs text-ledge-muted">
          {filtered.length} entries
        </span>
      </div>

      {/* Filter chips */}
      <div className="mb-2">
        <FilterChips active={filter} onChange={setFilter} />
      </div>

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
                <div key={date}>
                  <DateGroup date={date} transactions={txns} />
                  <AnimatePresence>
                    {txns.map((tx) => (
                      <TransactionRow key={tx.id} tx={tx} onDelete={deleteTransaction} />
                    ))}
                  </AnimatePresence>
                </div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
