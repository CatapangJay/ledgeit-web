import type { ReactNode } from 'react'
import { headers } from 'next/headers'
import BottomNav from './BottomNav'
import UserBadge from './UserBadge'

interface AppShellProps {
  children: ReactNode
}

export default async function AppShell({ children }: AppShellProps) {
  const h = await headers()
  const pathname = h.get('x-pathname') ?? '/'
  const isAuthRoute =
    pathname.startsWith('/login') || pathname.startsWith('/auth')

  return (
    <div className="relative min-h-dvh bg-ledge-bg">
      {/* User badge — fixed top-right, only on app routes */}
      {!isAuthRoute && (
        <div
          className="pointer-events-none fixed left-0 right-0 top-0 z-50 flex items-center justify-end px-5"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)' }}
        >
          <div className="pointer-events-auto">
            <UserBadge />
          </div>
        </div>
      )}

      {/* Page content — padded so nothing hides behind bottom nav */}
      <main className="pb-24 pt-0">{children}</main>

      {!isAuthRoute && <BottomNav />}
    </div>
  )
}
