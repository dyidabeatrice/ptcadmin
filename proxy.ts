import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Parent Portal is still being finalized — blocked entirely until
  // PARENT_PORTAL_LIVE=true is explicitly set in the environment.
  const parentPortalLive = process.env.PARENT_PORTAL_LIVE === 'true'
  if (!parentPortalLive) {
    if (pathname.startsWith('/api/parent/')) {
      return NextResponse.json({ success: false, error: 'Not available yet' }, { status: 404 })
    }
    if (pathname.startsWith('/parent/')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  const isAuth = request.cookies.get('ptc_auth')?.value === 'authenticated'
  const protectedPrefixes = [
    '/dashboard', '/sessions', '/clients', '/master',
    '/therapists', '/payments', '/messages', '/documents'
  ]
  const needsAuth = protectedPrefixes.some(p => pathname.startsWith(p))
  if (needsAuth && !isAuth) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|api|.*\\.jpg|.*\\.png|.*\\.jpeg|.*\\.webp|.*\\.svg).*)',
    '/api/parent/:path*'
  ]
}