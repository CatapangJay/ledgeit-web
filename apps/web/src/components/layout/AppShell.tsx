import type { ReactNode } from 'react'
import { headers } from 'next/headers'
import BottomNav from './BottomNav'
import SideNav from './SideNav'

interface AppShellProps {
  children: ReactNode
}

export default async function AppShell({ children }: AppShellProps) {
  const h = await headers()
  const pathname = h.get('x-pathname') ?? '/'
  const isAuthRoute      = pathname.startsWith('/login') || pathname.startsWith('/auth')
  const isMarketingRoute = pathname === '/' || pathname.startsWith('/about')

  return (
    <div className="relative min-h-dvh bg-ledge-bg">
      {!isAuthRoute && !isMarketingRoute && <SideNav />}

      {/* Page content — bottom nav offset on mobile, sidebar offset on md+ (app routes only) */}
      <main className={!isAuthRoute && !isMarketingRoute ? 'pb-24 pt-0 md:pl-60 md:pb-0' : ''}>
        {children}
      </main>

      {!isAuthRoute && !isMarketingRoute && <BottomNav />}
    </div>
  )
}
