'use client'

import { motion } from 'framer-motion'
import BalanceMetric from '@/components/dashboard/BalanceMetric'
import SpendStrip from '@/components/dashboard/SpendStrip'
import RecentFeed from '@/components/dashboard/RecentFeed'

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 26 } },
}

export default function DashboardPage() {
  return (
    <div className="px-5">
      {/* Header */}
      <div className="flex items-center justify-between pt-12 pb-1">
        <span className="font-mono text-lg font-semibold tracking-tighter text-ledge-data">
          LedgeIt
        </span>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show">
        {/* Balance */}
        <motion.div variants={fadeUp}>
          <BalanceMetric />
        </motion.div>

        {/* Today spend strip */}
        <motion.div variants={fadeUp}>
          <SpendStrip />
        </motion.div>

        {/* Recent feed header */}
        <motion.div variants={fadeUp} className="mt-2 flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ledge-muted">
            Recent
          </span>
        </motion.div>

        {/* Transactions */}
        <motion.div variants={fadeUp}>
          <RecentFeed />
        </motion.div>
      </motion.div>
    </div>
  )
}
