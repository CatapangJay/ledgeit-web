import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Runs on every matched request. Two jobs:
//  1. Forward the pathname as `x-pathname` — AppShell (a Server Component, which
//     can't read the request URL directly) reads it to decide whether to show
//     the app chrome (SideNav/BottomNav) or the auth/marketing layout.
//  2. Refresh the Supabase session, protect app routes, and enforce the 24h
//     rolling-inactivity cap (see updateSession). Without this, an expired
//     access token was never refreshed and protected pages rendered empty.
export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  return updateSession(request, requestHeaders)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
