'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicPage = ['/', '/login', '/privacy'].includes(pathname) || pathname.startsWith('/therapist/')

  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
        <title>Potentials Therapy Center</title>
        <link rel="icon" href="/favicon.ico" />
        <style>{`
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
          input, select, button, textarea { font-family: inherit; }
        `}</style>

        <meta name="facebook-domain-verification" content="87rzobk3xkzrf5ndn7cdaiovyodrtb" />

        <style>{`
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
          input, select, button, textarea { font-family: inherit; }
          .desktop-links { display: flex !important; }
          .hamburger-btn { display: none !important; }
          @media (max-width: 768px) {
            .desktop-links { display: none !important; }
            .hamburger-btn { display: flex !important; }
          }
        `}</style>
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        {!isPublicPage && (
          <nav style={{
            background: '#0f4c81', color: 'white', padding: '0 1.25rem',
            display: 'flex', alignItems: 'center',
            height: '56px', position: 'sticky', top: 0, zIndex: 50,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            justifyContent: 'space-between'
          }}>
            <Link href="/dashboard" style={{ color: '#fcc200', fontWeight: '700', textDecoration: 'none', fontSize: '15px', flexShrink: 0 }}>PTC</Link>

           <div className="desktop-links" style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, marginLeft: '1rem' }}>
              {[
                { href: '/dashboard', label: 'Dashboard' },
                { href: '/tasks', label: 'To-do' },
                { href: '/clients', label: 'Clients' },
                { href: '/master', label: 'Master' },
                { href: '/sessions', label: 'Schedule' },
                { href: '/payments', label: 'Payments' },
                { href: '/documents', label: 'Reports' },
                { href: '/messages', label: 'Messages' },
                { href: '/therapists', label: 'Therapists' },
                { href: '/help', label: 'Help' },
              ].map(l => (
                <Link key={l.href} href={l.href} style={{
                  color: pathname === l.href ? '#fcc200' : 'rgba(255,255,255,0.8)',
                  textDecoration: 'none', fontSize: '13px',
                  fontWeight: pathname === l.href ? '600' : '400',
                  padding: '6px 10px', borderRadius: '6px',
                  background: pathname === l.href ? 'rgba(255,255,255,0.1)' : 'transparent',
                }}>{l.label}</Link>
              ))}
            </div>


            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={async () => {
                await fetch('/api/auth', { method: 'DELETE' })
                window.location.href = '/login'
              }} className="desktop-links" style={{
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                color: 'white', padding: '6px 14px', borderRadius: '6px',
                cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit'
              }}>Log out</button>

              <button
                className="hamburger-btn"
                onClick={() => {
                  const menu = document.getElementById('mobile-menu')
                  if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block'
                }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '6px', display: 'none', flexDirection: 'column',
                  gap: '5px', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <span style={{ display: 'block', width: '22px', height: '2px', background: 'white', borderRadius: '2px' }} />
                <span style={{ display: 'block', width: '22px', height: '2px', background: 'white', borderRadius: '2px' }} />
                <span style={{ display: 'block', width: '22px', height: '2px', background: 'white', borderRadius: '2px' }} />
              </button>
            </div>
          </nav>
        )}

        {!isPublicPage && (
          <div id="mobile-menu" style={{
            display: 'none', position: 'fixed', top: '56px', left: 0, right: 0,
            background: '#0f4c81', zIndex: 49, padding: '8px 0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            {[
              { href: '/dashboard', label: 'Dashboard' },
              { href: '/tasks', label: 'To-do' },
              { href: '/clients', label: 'Clients' },
              { href: '/master', label: 'Master' },
              { href: '/sessions', label: 'Schedule' },
              { href: '/payments', label: 'Payments' },
              { href: '/documents', label: 'Reports' },
              { href: '/messages', label: 'Messages' },
              { href: '/therapists', label: 'Therapists' },
            ].map(l => (
              <Link key={l.href} href={l.href}
                onClick={() => {
                  const menu = document.getElementById('mobile-menu')
                  if (menu) menu.style.display = 'none'
                }}
                style={{
                  display: 'block', padding: '13px 20px',
                  color: pathname === l.href ? '#fcc200' : 'rgba(255,255,255,0.85)',
                  textDecoration: 'none', fontSize: '14px',
                  fontWeight: pathname === l.href ? '600' : '400',
                  borderLeft: pathname === l.href ? '3px solid #fcc200' : '3px solid transparent',
                  background: pathname === l.href ? 'rgba(255,255,255,0.08)' : 'transparent',
                }}>{l.label}</Link>
            ))}
            <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '4px' }}>
              <button onClick={async () => {
                await fetch('/api/auth', { method: 'DELETE' })
                window.location.href = '/login'
              }} style={{
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                color: 'white', padding: '8px 16px', borderRadius: '6px',
                cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', width: '100%'
              }}>Log out</button>
            </div>
          </div>
        )}
        {children}
      </body>
    </html>
  )
}
