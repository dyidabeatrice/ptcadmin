'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin() {
    if (!password) return
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
    const json = await res.json()
    if (json.success) {
      router.push('/dashboard')
    } else {
      setError('Incorrect password. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f4c81 0%, #1a6db5 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', fontFamily: 'sans-serif'
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', padding: '2.5rem',
        width: '100%', maxWidth: '400px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo.png" alt="Potentials Therapy Center" style={{ height: '60px', objectFit: 'contain', marginBottom: '1rem' }} />
          <h2 style={{ color: '#0f4c81', margin: '0 0 4px', fontSize: '20px', fontWeight: '600' }}>Staff Access</h2>
          <p style={{ color: '#999', margin: 0, fontSize: '13px' }}>PTCAdmin — Clinic Management</p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px', fontWeight: '500' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Enter staff password..."
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '8px',
              border: error ? '2px solid #E24B4A' : '1px solid #ddd',
              fontSize: '15px', boxSizing: 'border-box', outline: 'none'
            }}
          />
          {error && <div style={{ color: '#E24B4A', fontSize: '12px', marginTop: '6px' }}>{error}</div>}
        </div>

        <button
          onClick={handleLogin}
          disabled={loading || !password}
          style={{
            width: '100%', padding: '13px', borderRadius: '8px',
            border: 'none', background: '#0f4c81', color: '#fff',
            fontSize: '15px', fontWeight: '600', cursor: 'pointer',
            opacity: loading || !password ? 0.6 : 1
          }}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <a href="/" style={{ fontSize: '12px', color: '#999', textDecoration: 'none' }}>← Back to website</a>
        </div>
      </div>
    </div>
  )
}
