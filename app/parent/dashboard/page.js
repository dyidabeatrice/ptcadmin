'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { statusLabel, sessionTypeLabel } from '../../lib/labels'

function getGreeting() {
  const hour = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })).getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function initials(name) {
  const parts = name.split(',')[1]?.trim() || name
  return parts.charAt(0).toUpperCase()
}

const AVATAR_COLORS = ['#0f4c81', '#1D9E75', '#97C459', '#E69138', '#7360F2']

export default function ParentDashboard() {
  const [status, setStatus] = useState(null)
  const [children, setChildren] = useState([])
  const [activeChild, setActiveChild] = useState(0)
  const [loading, setLoading] = useState(true)
  const [addChildModal, setAddChildModal] = useState(false)
  const [newChildNames, setNewChildNames] = useState([''])
  const [addChildSaving, setAddChildSaving] = useState(false)
  const [addChildSuccess, setAddChildSuccess] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  useEffect(() => { fetchDashboard() }, [])

  async function fetchDashboard() {
    setLoading(true)
    const res = await fetch('/api/parent/dashboard')
    if (res.status === 401) { router.push('/parent/login'); return }
    const json = await res.json()
    if (json.success) {
      setStatus(json.status)
      setChildren(json.children)
    }
    setLoading(false)
  }

  async function logout() {
    await fetch('/api/parent/auth', { method: 'DELETE' })
    router.push('/parent/login')
  }

  async function deleteAccount() {
    setDeleting(true)
    await fetch('/api/parent/delete-account', { method: 'POST' })
    router.push('/parent/login')
  }

  function updateNewChild(i, value) {
    setNewChildNames(prev => prev.map((c, idx) => idx === i ? value : c))
  }

  function addNewChildField() {
    setNewChildNames(prev => [...prev, ''])
  }

  function removeNewChildField(i) {
    setNewChildNames(prev => prev.filter((_, idx) => idx !== i))
  }

  async function submitAddChild() {
    const cleanNames = newChildNames.map(c => c.trim()).filter(Boolean)
    if (cleanNames.length === 0) return
    setAddChildSaving(true)
    await fetch('/api/parent/request-add-child', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ children: cleanNames })
    })
    setAddChildSaving(false)
    setAddChildSuccess(true)
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontFamily: 'sans-serif' }}>Loading...</div>
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f0e8', fontFamily: 'sans-serif' }}>
      <nav style={{ background: '#f0f0f0', padding: '16px 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '3px solid #fcc200' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logobig.png" alt="PTC" style={{ height: '32px', width: 'auto' }} />
        </div>
        <button onClick={logout} style={{ background: '#0f4c81', border: '1px solid #fcc200', color: 'white', padding: '7px 16px', borderRadius: '7px', fontSize: '12px', cursor: 'pointer' }}>Sign out</button>
      </nav>

      {status !== 'active' ? (
        <div style={{ maxWidth: '480px', margin: '4rem auto', padding: '2.5rem 2rem', background: 'white', borderRadius: '18px', textAlign: 'center', boxShadow: '0 8px 32px rgba(15,76,129,0.1)' }}>
          <div style={{ fontSize: '40px', marginBottom: '14px' }}>⏳</div>
          <h2 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: '800', color: '#0f4c81', marginBottom: '10px' }}>Waiting for approval</h2>
          <p style={{ fontSize: '14px', color: '#7a7f87', lineHeight: '1.6' }}>
            Our clinic is reviewing your registration and linking it to your child's records. Check back soon — you'll see their schedule here once it's approved.
          </p>
        </div>
      ) : (
        <>
          <div style={{ maxWidth: '760px', margin: '0 auto', padding: '2.5rem 2rem 0' }}>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: '24px', fontWeight: '800', color: '#0f4c81', marginBottom: '1.75rem' }}>
              {getGreeting()} 👋
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {children.map((child, i) => (
                <div key={child.name} onClick={() => setActiveChild(i)} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 18px 8px 10px', borderRadius: '40px',
                  background: 'white', border: `2px solid ${activeChild === i ? '#fcc200' : 'transparent'}`, cursor: 'pointer'
                }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: AVATAR_COLORS[i % AVATAR_COLORS.length], color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito', sans-serif", fontWeight: '800', fontSize: '14px' }}>
                    {initials(child.name)}
                  </div>
                  <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: '700', fontSize: '13px', color: '#0f4c81' }}>{child.name.split(',')[1]?.trim() || child.name}</span>
                </div>
              ))}
              <button onClick={() => { setAddChildModal(true); setNewChildNames(['']); setAddChildSuccess(false) }} style={{
                padding: '8px 16px', borderRadius: '40px', border: '2px dashed #ccc', background: 'transparent',
                color: '#999', cursor: 'pointer', fontSize: '12px', fontFamily: "'Nunito', sans-serif", fontWeight: '700'
              }}>+ Add a child</button>
            </div>
          </div>

          {addChildModal && (
            <div onClick={() => setAddChildModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,25,40,0.55)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '18px', padding: '2rem', width: '420px', maxWidth: '100%' }}>
                {addChildSuccess ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '36px', marginBottom: '10px' }}>✅</div>
                    <h3 style={{ fontFamily: "'Nunito', sans-serif", color: '#0f4c81', marginBottom: '8px' }}>Request sent!</h3>
                    <p style={{ fontSize: '13px', color: '#7a7f87', lineHeight: '1.6', marginBottom: '1.25rem' }}>Our clinic will review and link the new child to your account shortly.</p>
                    <button onClick={() => setAddChildModal(false)} style={{ padding: '9px 22px', borderRadius: '8px', border: 'none', background: '#0f4c81', color: 'white', fontFamily: "'Nunito', sans-serif", fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>Close</button>
                  </div>
                ) : (
                  <>
                    <h3 style={{ fontFamily: "'Nunito', sans-serif", color: '#0f4c81', marginBottom: '4px' }}>Add a child</h3>
                    <p style={{ fontSize: '12px', color: '#999', marginBottom: '1.25rem' }}>Newly enrolled another child? Let us know their name and we'll link them to your account.</p>
                    {newChildNames.map((name, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input value={name} onChange={e => updateNewChild(i, e.target.value)}
                          placeholder="e.g. Santos, Maria"
                          style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />
                        {newChildNames.length > 1 && (
                          <button onClick={() => removeNewChildField(i)} style={{ padding: '0 12px', borderRadius: '8px', border: '1px solid #fcc', background: '#fff5f5', color: '#c00', cursor: 'pointer' }}>✕</button>
                        )}
                      </div>
                    ))}
                    <button onClick={addNewChildField} style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #0f4c81', background: 'white', color: '#0f4c81', cursor: 'pointer', marginBottom: '1.25rem' }}>+ Add another</button>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button onClick={() => setAddChildModal(false)} style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                      <button onClick={submitAddChild} disabled={addChildSaving} style={{ padding: '9px 22px', borderRadius: '8px', border: 'none', background: '#fcc200', color: '#0f4c81', fontFamily: "'Nunito', sans-serif", fontWeight: '800', fontSize: '13px', cursor: 'pointer', opacity: addChildSaving ? 0.7 : 1 }}>
                        {addChildSaving ? 'Sending...' : 'Send request'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {children.length === 0 ? (
            <div style={{ maxWidth: '480px', margin: '2rem auto', padding: '2rem', background: 'white', border: '1px dashed #ddd', borderRadius: '14px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
              No children linked to this account yet.
            </div>
          ) : (() => {
            const child = children[activeChild]
            return (
              <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 2rem 3rem' }}>

                {(child.credit_balance > 0 || child.outstanding_balance > 0) && (
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
                    {child.credit_balance > 0 && (
                      <div style={{ flex: 1, minWidth: '200px', background: 'linear-gradient(135deg, #0f4c81, #14608f)', borderRadius: '16px', padding: '1.1rem 1.4rem', color: 'white', boxShadow: '0 6px 20px rgba(15,76,129,0.25)' }}>
                        <div style={{ fontSize: '12px', opacity: 0.85, marginBottom: '3px' }}>Available credit</div>
                        <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: '800', fontSize: '20px' }}>₱{child.credit_balance.toLocaleString()}</div>
                      </div>
                    )}
                    {child.outstanding_balance > 0 && (
                      <div style={{ flex: 1, minWidth: '200px', background: '#FCEBEB', border: '1px solid #F09595', borderRadius: '16px', padding: '1.1rem 1.4rem', color: '#791F1F' }}>
                        <div style={{ fontSize: '12px', opacity: 0.85, marginBottom: '3px' }}>Outstanding balance</div>
                        <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: '800', fontSize: '20px' }}>₱{child.outstanding_balance.toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: '13px', fontWeight: '800', color: '#0f4c81', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>📅 Upcoming sessions</div>
                  {child.upcoming.length === 0 ? (
                    <div style={{ background: 'white', border: '1px dashed #ddd', borderRadius: '14px', padding: '1.5rem', textAlign: 'center', color: '#999', fontSize: '13px' }}>No upcoming sessions scheduled.</div>
                  ) : child.upcoming.map(s => (
                    <SessionCard key={s.id} session={s} upcoming />
                  ))}
                </div>

                <div>
                  <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: '13px', fontWeight: '800', color: '#0f4c81', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>🕓 Past sessions</div>
                  {child.past.length === 0 ? (
                    <div style={{ background: 'white', border: '1px dashed #ddd', borderRadius: '14px', padding: '1.5rem', textAlign: 'center', color: '#999', fontSize: '13px' }}>No sessions in the last 30 days.</div>
                  ) : (
                    <>
                      {child.past.map(s => <SessionCard key={s.id} session={s} />)}
                      <div style={{ textAlign: 'center', padding: '1rem', fontSize: '12px', color: '#999', fontStyle: 'italic' }}>Showing the last 30 days</div>
                    </>
                  )}
                </div>

              </div>
            )
          })(          )}

          <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 2rem 2rem', textAlign: 'center' }}>
            <button onClick={() => { setDeleteModal(true); setDeleteConfirmText('') }} style={{
              background: 'none', border: 'none', color: '#bbb', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline'
            }}>Delete my account</button>
          </div>
        </>
      )}

      {deleteModal && (
        <div onClick={() => !deleting && setDeleteModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,25,40,0.55)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '18px', padding: '2rem', width: '400px', maxWidth: '100%' }}>
            <h3 style={{ fontFamily: "'Nunito', sans-serif", color: '#791F1F', marginBottom: '8px' }}>Delete your account?</h3>
            <p style={{ fontSize: '13px', color: '#7a7f87', lineHeight: '1.6', marginBottom: '1rem' }}>
              This removes your login access. It does not affect your child's records or sessions at the clinic — only your ability to view them here. This cannot be undone.
            </p>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>Type <strong>DELETE</strong> to confirm</label>
            <input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box', marginBottom: '1.25rem' }} />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteModal(false)} disabled={deleting} style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={deleteAccount} disabled={deleting || deleteConfirmText !== 'DELETE'} style={{
                padding: '9px 22px', borderRadius: '8px', border: 'none', background: '#E24B4A', color: 'white',
                fontWeight: '600', fontSize: '13px', cursor: 'pointer', opacity: (deleting || deleteConfirmText !== 'DELETE') ? 0.5 : 1
              }}>{deleting ? 'Deleting...' : 'Delete account'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SessionCard({ session, upcoming }) {
  const d = new Date(session.date)
  const day = isNaN(d) ? '--' : d.getDate()
  const month = isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short' })

  const statusStyles = {
    Present: { bg: '#EAF3DE', color: '#27500A' },
    Absent: { bg: '#FCEBEB', color: '#7B0000' },
    Cancelled: { bg: '#f5f5f5', color: '#666' },
    Pencil: { bg: '#FFFBE6', color: '#7C5800' },
    Scheduled: { bg: '#E6F1FB', color: '#0C447C' }
  }
  const sc = statusStyles[session.status] || statusStyles.Scheduled

  return (
    <div style={{ background: 'white', borderRadius: '16px', padding: '1.1rem 1.3rem', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', boxShadow: '0 2px 10px rgba(15,76,129,0.05)', border: '1px solid #eee', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '52px', textAlign: 'center', flexShrink: 0, background: upcoming ? '#E6F1FB' : '#f2f2f2', borderRadius: '10px', padding: '6px 0' }}>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: '800', fontSize: '17px', color: upcoming ? '#0f4c81' : '#888', lineHeight: '1' }}>{day}</div>
          <div style={{ fontSize: '10px', color: upcoming ? '#0f4c81' : '#999', textTransform: 'uppercase', fontWeight: '700', opacity: 0.75 }}>{month}</div>
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#33363d' }}>{sessionTypeLabel(session.session_type)}</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>{session.day} · {session.time_start} – {session.time_end}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
        <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 12px', borderRadius: '20px', background: sc.bg, color: sc.color }}>{statusLabel(session.status)}</span>
        {!upcoming && (
          <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 12px', borderRadius: '20px', background: session.payment === 'Paid' ? '#EAF3DE' : '#FCEBEB', color: session.payment === 'Paid' ? '#27500A' : '#7B0000' }}>
            {session.payment}
          </span>
        )}
      </div>
    </div>
  )
}