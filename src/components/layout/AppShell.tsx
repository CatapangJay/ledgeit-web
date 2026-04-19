import type { ReactNode } from 'react'
import { headers } from 'next/headers'
import BottomNav from './BottomNav'
import SideNav from './SideNav'
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
      {!isAuthRoute && <SideNav />}

      {/* User badge — fixed top-right, mobile only (sidebar handles desktop) */}
      {!isAuthRoute && (
        <div
          className="pointer-events-none fixed left-0 right-0 top-0 z-50 flex items-center justify-end px-5 md:hidden"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)' }}
        >
          <div className="pointer-events-auto">
            <UserBadge />
          </div>
        </div>
      )}

      {/* Page content — bottom nav offset on mobile, sidebar offset on md+ */}
      <main className={!isAuthRoute ? 'pb-24 pt-0 md:pl-60 md:pb-0' : ''}>
        {children}
      </main>

      {!isAuthRoute && <BottomNav />}
    </div>
  )
}
