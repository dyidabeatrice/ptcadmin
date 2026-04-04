import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow all public paths
  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/privacy' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/logo') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check auth cookie
  const isAuth = request.cookies.get('ptc_auth')?.value === 'authenticated'
  if (!isAuth) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}