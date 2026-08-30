'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ParentLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/parent/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    const json = await res.json()
    setLoading(false)

    if (json.success) {
      router.push('/parent/dashboard')
    } else {
      setError(json.error || 'Something went wrong. Please try again.')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '18px', padding: '2.5rem 2rem', width: '400px', maxWidth: '100%', boxShadow: '0 8px 32px rgba(15,76,129,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img src="/logo.png" alt="Potentials Therapy Center" style={{ height: '60px', objectFit: 'contain', marginBottom: '1rem' }} />
          <h2 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: '800', color: '#0f4c81', marginBottom: '4px', fontSize: '20px' }}>Welcome back</h2>
          <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>Log in to view your child's schedule.</p>
        </div>

        {error && (
          <div style={{ background: '#FCEBEB', color: '#791F1F', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '1rem' }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '11px', borderRadius: '8px', border: 'none',
            background: '#fcc200', color: '#0f4c81', cursor: 'pointer',
            fontFamily: "'Nunito', sans-serif", fontWeight: '800', fontSize: '14px',
            opacity: loading ? 0.7 : 1
          }}>{loading ? 'Logging in...' : 'Log in'}</button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '13px', color: '#999', marginTop: '1.25rem' }}>
          Don't have an account? <Link href="/parent/register" style={{ color: '#0f4c81', fontWeight: '600' }}>Register</Link>
        </p>
      </div>
    </div>
  )
}