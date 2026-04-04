'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicPage = ['/', '/login', '/privacy'].includes(pathname)

  return (
    <html lang="en">
      <head>
        <meta name="facebook-domain-verification" content="87rzobk3xkzrf5ndn7cdaiovyodrtb" />

        <style>{`
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
          input, select, button, textarea { font-family: inherit; }
        `}</style>
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        {!isPublicPage && (
          <nav style={{
            background: '#0f4c81', color: 'white', padding: '0 2rem',
            display: 'flex', alignItems: 'center', gap: '1.5rem',
            height: '56px', position: 'sticky', top: 0, zIndex: 50,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
          }}>
            <Link href="/dashboard" style={{ color: '#fcc200', fontWeight: '700', textDecoration: 'none', fontSize: '15px', marginRight: '8px' }}>PTC</Link>
            {[
              { href: '/dashboard', label: 'Dashboard' },
              { href: '/sessions', label: 'Schedule' },
              { href: '/clients', label: 'Clients' },
              { href: '/master', label: 'Master' },
              { href: '/therapists', label: 'Therapists' },
              { href: '/payments', label: 'Payments' },
              { href: '/messages', label: 'Messages' },
            ].map(l => (
              <Link key={l.href} href={l.href} style={{
                color: pathname === l.href ? '#fcc200' : 'rgba(255,255,255,0.8)',
                textDecoration: 'none', fontSize: '13px', fontWeight: pathname === l.href ? '600' : '400'
              }}>{l.label}</Link>
            ))}
            <div style={{ marginLeft: 'auto' }}>
              <button onClick={async () => {
                await fetch('/api/auth', { method: 'DELETE' })
                window.location.href = '/login'
              }} style={{
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                color: 'white', padding: '6px 14px', borderRadius: '6px',
                cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit'
              }}>Log out</button>
            </div>
          </nav>
        )}
        {children}
      </body>
    </html>
  )
}
