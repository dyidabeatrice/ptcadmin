import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/privacy', '/api/auth']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = pathname === '/' || 
    pathname === '/login' || 
    pathname === '/privacy' || 
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/logo')
  const isAuth = request.cookies.get('ptc_auth')?.value === 'authenticated'

  if (!isPublic && !isAuth) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)']
}