import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PTCAdmin",
  description: "PTC Clinic Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#f8f9fa', minHeight: '100vh' }}>
        <nav style={{
          background: '#0f4c81', color: 'white',
          padding: '0 2rem', display: 'flex',
          alignItems: 'center',
          height: '56px', position: 'sticky',
          top: 0, zIndex: 50,
          borderBottom: '3px solid #fcc200'
        }}>
          <Link href="/" style={{
            color: 'white', textDecoration: 'none',
            fontWeight: '700', fontSize: '16px',
            marginRight: '2rem', letterSpacing: '0.5px',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span style={{
              background: '#fcc200', color: '#0f4c81',
              padding: '2px 8px', borderRadius: '4px',
              fontSize: '13px', fontWeight: '800'
            }}>PTC</span>
            Admin
          </Link>

          {[
            { href: '/', label: 'Dashboard' },
            { href: '/clients', label: 'Clients' },
            { href: '/sessions', label: 'Schedule' },
            { href: '/master', label: 'Master' },
            { href: '/therapists', label: 'Therapists' },
            { href: '/payments', label: 'Payments' },
            { href: '/messages', label: 'Messages' },
          ].map(link => (
            <Link key={link.href} href={link.href} style={{
              color: 'rgba(255,255,255,0.8)',
              textDecoration: 'none',
              fontSize: '14px',
              padding: '0 16px',
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              borderBottom: '3px solid transparent',
              marginBottom: '-3px',
            }}>
              {link.label}
            </Link>
          ))}
        </nav>

        <main>
          {children}
        </main>
      </body>
    </html>
  );
}