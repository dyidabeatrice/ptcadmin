import { NextResponse } from 'next/server'

// Parent Portal is still being finalized — this keeps every /parent/* page
// and /api/parent/* route fully blocked until PARENT_PORTAL_LIVE=true is
// explicitly set in the environment. Nothing here affects any other part
// of the app.
export function middleware(request) {
  const isLive = process.env.PARENT_PORTAL_LIVE === 'true'
  if (isLive) return NextResponse.next()

  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/parent/')) {
    return NextResponse.json({ success: false, error: 'Not available yet' }, { status: 404 })
  }

  if (pathname.startsWith('/parent/')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/parent/:path*', '/api/parent/:path*']
}