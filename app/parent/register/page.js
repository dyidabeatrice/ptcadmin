'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function ParentRegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [children, setChildren] = useState([''])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function updateChild(i, value) {
    setChildren(prev => prev.map((c, idx) => idx === i ? value : c))
  }

  function addChild() {
    setChildren(prev => [...prev, ''])
  }

  function removeChild(i) {
    setChildren(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    const cleanChildren = children.map(c => c.trim()).filter(Boolean)
    if (cleanChildren.length === 0) {
      setError('Please enter at least one child\'s name')
      return
    }

    setSaving(true)
    const res = await fetch('/api/parent/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, children: cleanChildren })
    })
    const json = await res.json()
    setSaving(false)

    if (json.success) {
      setSuccess(true)
    } else {
      setError(json.error || 'Something went wrong. Please try again.')
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '1rem' }}>
        <div style={{ background: 'white', borderRadius: '18px', padding: '2.5rem 2rem', width: '420px', maxWidth: '100%', textAlign: 'center', boxShadow: '0 8px 32px rgba(15,76,129,0.1)' }}>
          <div style={{ fontSize: '40px', marginBottom: '14px' }}>✅</div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: '800', color: '#0f4c81', marginBottom: '10px' }}>Account created!</h2>
          <p style={{ fontSize: '14px', color: '#7a7f87', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            Thank you for registering. Our clinic will review and link your account to your child's records shortly — you'll be able to see their schedule once that's done.
          </p>
          <Link href="/parent/login" style={{
            display: 'inline-block', padding: '10px 28px', borderRadius: '8px',
            background: '#0f4c81', color: 'white', textDecoration: 'none',
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: '700', fontSize: '13px'
          }}>Go to Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '18px', padding: '2.5rem 2rem', width: '440px', maxWidth: '100%', boxShadow: '0 8px 32px rgba(15,76,129,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img src="/logo.png" alt="Potentials Therapy Center" style={{ height: '60px', objectFit: 'contain', marginBottom: '1rem' }} />
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: '800', color: '#0f4c81', marginBottom: '4px', fontSize: '20px' }}>Create your account</h2>
          <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>Register to view your child's therapy schedule and history.</p>
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

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Confirm password</label>
            <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>Your child(ren)'s name(s)</label>
            {children.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input value={c} onChange={e => updateChild(i, e.target.value)}
                  placeholder="e.g. Santos, Maria"
                  style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />
                {children.length > 1 && (
                  <button type="button" onClick={() => removeChild(i)} style={{
                    padding: '0 12px', borderRadius: '8px', border: '1px solid #fcc', background: '#fff5f5', color: '#c00', cursor: 'pointer'
                  }}>✕</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addChild} style={{
              fontSize: '12px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #0f4c81',
              background: 'white', color: '#0f4c81', cursor: 'pointer'
            }}>+ Add another child</button>
          </div>

          <button type="submit" disabled={saving} style={{
            width: '100%', padding: '11px', borderRadius: '8px', border: 'none',
            background: '#fcc200', color: '#0f4c81', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: '800', fontSize: '14px',
            opacity: saving ? 0.7 : 1
          }}>{saving ? 'Creating account...' : 'Create account'}</button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '13px', color: '#999', marginTop: '1.25rem' }}>
          Already have an account? <Link href="/parent/login" style={{ color: '#0f4c81', fontWeight: '600' }}>Log in</Link>
        </p>
      </div>
    </div>
  )
}