'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TherapistLogin() {
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin() {
    if (!name.trim()) return setError('Please enter your name')
    if (!pin) return setError('Please enter your PIN')
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/therapist/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), pin })
      })
      const json = await res.json()
      if (json.success) {
        // The server sends back the real name, even when she signed in with a login alias.
        sessionStorage.setItem('therapist_name', json.name)
        router.push('/therapist/dashboard')
        return
      }
      setError(json.error || 'Incorrect name or PIN')
      setPin('')
    } catch {
      setError('Could not connect. Please check your internet and try again.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '380px', padding: '1rem' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
            <img src="/logobig.png" alt="PTC" style={{ height: '45px', width: 'auto' }} />
            <span style={{ fontSize: '16px', fontWeight: '600', color: '#0f4c81' }}>Therapist Portal</span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>Sign in to view your schedule</p>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '2rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>Enter your name</label>
            <input
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              placeholder="Type your name..."
              autoCapitalize="none"
              autoCorrect="off"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>PIN</label>
            <input
              type="password"
              value={pin}
              onChange={e => { setPin(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px', letterSpacing: '0.08em', textAlign: 'left', boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <div style={{ background: '#FCEBEB', border: '1px solid #F09595', borderRadius: '6px', padding: '10px 12px', marginBottom: '1rem', fontSize: '13px', color: '#791F1F' }}>
              {error}
            </div>
          )}

          <button onClick={handleLogin} disabled={loading} style={{
            width: '100%', padding: '11px', borderRadius: '8px', border: 'none',
            background: '#0f4c81', color: 'white', fontSize: '14px',
            fontWeight: '600', cursor: 'pointer'
          }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#bbb', marginTop: '1.5rem' }}>
          <a href="/" style={{ color: '#0f4c81', textDecoration: 'none' }}>← Back to website</a>
        </p>
      </div>
    </div>
  )
}