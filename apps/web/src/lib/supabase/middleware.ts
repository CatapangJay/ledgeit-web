import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Rolling-inactivity window: a session is considered dead after this much time
 *  passes with no request. Every authenticated request pushes the window forward,
 *  so an actively-used session is never interrupted; an idle one expires after ~1 day. */
const INACTIVITY_MS = 24 * 60 * 60 * 1000 // 24 hours
/** Cookie holding the last-activity epoch (ms). Not sensitive on its own — it only
 *  gates our own expiry logic; the Supabase auth cookies remain the source of truth. */
const ACTIVITY_COOKIE = 'ledgeit-la'

/** Routes reachable without a session. Everything else requires auth. */
function isPublicRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname.startsWith('/about') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') // includes /auth/callback (OAuth/email confirm)
  )
}

/** Build the /login redirect, clearing every auth + activity cookie so the user is
 *  fully signed out (the refresh token can't be reused to silently resume). */
function redirectToLogin(request: NextRequest, reason: 'expired' | 'unauthenticated') {
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.search = ''
  if (reason === 'expired') url.searchParams.set('reason', 'expired')

  const response = NextResponse.redirect(url)
  for (const cookie of request.cookies.getAll()) {
    // Supabase SSR stores the session in `sb-*` cookies; drop them all.
    if (cookie.name.startsWith('sb-')) response.cookies.delete(cookie.name)
  }
  response.cookies.delete(ACTIVITY_COOKIE)
  return response
}

/**
 * Refreshes the Supabase session, enforces route protection, and applies a 24h
 * rolling-inactivity cap. Called from the Next.js middleware (proxy.ts).
 *
 * `requestHeaders` carries app headers (e.g. x-pathname) that must survive onto
 * the response so downstream Server Components still see them.
 */
export async function updateSession(request: NextRequest, requestHeaders: Headers) {
  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write refreshed auth cookies back onto both the request (so this same
          // pass reads the new values) and the response (so the browser stores them).
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Verify the JWT. getClaims() verifies locally via WebCrypto against a cached
  // JWKS when the project uses asymmetric signing keys (no per-request network
  // round-trip) — and transparently falls back to a server request (like
  // getUser) if the project still uses a symmetric secret, so it's never less
  // secure. It also refreshes the session first if the token is near expiry.
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims ?? null

  const pathname = request.nextUrl.pathname
  const isPublic = isPublicRoute(pathname)

  if (!claims) {
    // No valid session. Bounce app routes to login; leave public routes alone.
    if (!isPublic) return redirectToLogin(request, 'unauthenticated')
    return supabaseResponse
  }

  // Authenticated — enforce the rolling-inactivity cap.
  const now = Date.now()
  const lastActivityRaw = request.cookies.get(ACTIVITY_COOKIE)?.value
  const lastActivity = lastActivityRaw ? Number(lastActivityRaw) : NaN

  if (Number.isFinite(lastActivity) && now - lastActivity > INACTIVITY_MS) {
    // Idle too long → sign out server-side and force re-login.
    await supabase.auth.signOut()
    return redirectToLogin(request, 'expired')
  }

  // Push the inactivity window forward on every authenticated request.
  supabaseResponse.cookies.set(ACTIVITY_COOKIE, String(now), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: INACTIVITY_MS / 1000,
  })

  return supabaseResponse
}
