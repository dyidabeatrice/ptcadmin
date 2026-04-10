import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuth = request.cookies.get('ptc_auth')?.value === 'authenticated'

  // Protected paths — only these require login
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|api|.*\\.jpg|.*\\.png|.*\\.jpeg|.*\\.webp|.*\\.svg).*)']
}