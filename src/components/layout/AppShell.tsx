import type { ReactNode } from 'react'
import BottomNav from './BottomNav'

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative min-h-[100dvh]" style={{ background: '#f8faf9' }}>
      {/* Page content — padded so nothing hides behind bottom nav */}
      <main className="pb-28 pt-0">{children}</main>
      <BottomNav />
    </div>
  )
}
