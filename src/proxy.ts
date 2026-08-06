import { type NextRequest, NextResponse } from 'next/server'

// AppShell reads this header to decide whether the current route is an
// auth/marketing route (no SideNav/BottomNav) or an app route. Next.js
// Server Components have no direct access to the request pathname, so we
// forward it here.
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
