'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TherapistLogin() {
  const [names, setNames] = useState([])
  const [selectedName, setSelectedName] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/therapist/auth').then(r => r.json()).then(j => {
      if (j.success) setNames(j.names)
    })
  }, [])

  async function handleLogin() {
  if (!selectedName) return setError('Please enter your name')
  if (!pin) return setError('Please enter your PIN')
  const match = names.find(n => n.toLowerCase() === selectedName.trim().toLowerCase())
  if (!match) return setError('Name not found — please check your spelling')
  setLoading(true)
  setError('')
  const res = await fetch('/api/therapist/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: match, pin })
  })
    const json = await res.json()
    if (json.success) {
      sessionStorage.setItem('therapist_name', match)
      router.push('/therapist/dashboard')
    } else {
      setError(json.error || 'Incorrect PIN')
      setPin('')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '380px', padding: '1rem' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
            <span style={{ background: '#fcc200', color: '#0f4c81', padding: '4px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: '800' }}>PTC</span>
            <span style={{ fontSize: '16px', fontWeight: '600', color: '#0f4c81' }}>Therapist Portal</span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>Sign in to view your schedule</p>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '2rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>Select your name</label>
            <select value={selectedName} onChange={e => { setSelectedName(e.target.value); setError('') }}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', background: 'white' }}>
              <option value="">Choose name...</option>
              {names.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>PIN</label>
            <input
              type="password"
              value={pin}
              onChange={e => { setPin(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••"
              maxLength={6}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '18px', letterSpacing: '0.3em', textAlign: 'center', boxSizing: 'border-box' }}
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