'use client'

import Link from 'next/link'
import { CaretLeft } from '@phosphor-icons/react'
import DebtLedger from '@/components/debt/DebtLedger'

export default function DebtsPage() {
  return (
    <div
      className="px-5 pb-4 md:px-8 md:max-w-3xl md:mx-auto lg:max-w-4xl lg:px-10"
      style={{ background: '#f8faf9', minHeight: '100dvh' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 pt-12 md:pt-8">
        <Link
          href="/account"
          aria-label="Back to account"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: '#f0f4f2' }}
        >
          <CaretLeft size={16} weight="bold" style={{ color: '#3f4946' }} aria-hidden="true" />
        </Link>
        <div>
          <h1 className="text-base font-bold tracking-tight" style={{ color: '#00352e' }}>
            Debts &amp; Loans
          </h1>
          <p className="text-[11px]" style={{ color: '#6e9990' }}>
            Money you lent out or borrowed
          </p>
        </div>
      </div>

      <DebtLedger />
    </div>
  )
}
