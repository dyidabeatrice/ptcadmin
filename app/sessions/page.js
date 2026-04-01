'use client'
import { useState, useEffect } from 'react'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

const ALL_TIME_SLOTS = []
function buildSlots() {
  let h = 8, m = 0
  while (h < 19) {
    const period = h >= 12 ? 'PM' : 'AM'
    const dh = h > 12 ? h - 12 : h === 0 ? 12 : h
    ALL_TIME_SLOTS.push(`${dh}:${m.toString().padStart(2,'0')} ${period}`)
    m += 15
    if (m >= 60) { h++; m = 0 }
  }
}
buildSlots()

const RATES = {
  OT: { Regular: 1200, Evaluation: 2800 },
  ST: { Regular: 1300, Evaluation: 2800 },
  PT: { Regular: 900, Evaluation: 2800 },
  SPED: { Regular: 900, Evaluation: 1800 },
}

const MOP_OPTIONS = ['Cash', 'BDO', 'Union Bank']

function getSpecialty(name) {
  const n = name?.toUpperCase() || ''
  if (n.includes('(ST)') || n.includes('ST INTERN')) return 'ST'
  if (n.includes('(PT)')) return 'PT'
  if (n.includes('(SPED)')) return 'SPED'
  return 'OT'
}

function getRate(therapist, sessionType) {
  const s = getSpecialty(therapist)
  return RATES[s]?.[sessionType] || RATES[s]?.Regular || 1200
}

const STATUS_COLORS = {
  Scheduled: { bg: '#E6F1FB', color: '#0C447C' },
  Present:   { bg: '#EAF3DE', color: '#27500A' },
  Absent:    { bg: '#FCEBEB', color: '#791F1F' },
  Cancelled: { bg: '#F1EFE8', color: '#5F5E5A' },
}

export default function SchedulePage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedDay, setSelectedDay] = useState(() => {
    const day = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    return DAYS.includes(day) ? day : 'Monday'
  })
  const [payModal, setPayModal] = useState(null)
  const [payForm, setPayForm] = useState({ session_type: 'Regular', mop: 'Cash', amount: 0 })
  const [addModal, setAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ client_name: '', therapist: '', day: 'Monday', time_start: '9:00 AM', time_end: '10:00 AM' })
  const [saving, setSaving] = useState(false)
  const [dragSession, setDragSession] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)

  useEffect(() => { fetchSessions() }, [])

  async function fetchSessions() {
    setLoading(true)
    const res = await fetch('/api/sessions')
    const json = await res.json()
    if (json.success) setSessions(json.data)
    setLoading(false)
  }

  async function generateWeek() {
    setGenerating(true)
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate' })
    })
    const json = await res.json()
    if (json.success) {
      if (json.generated === 0) alert(json.message || 'All sessions already exist for this week')
      else { alert(`Generated ${json.generated} sessions!`); fetchSessions() }
    } else alert('Error: ' + json.error)
    setGenerating(false)
  }

  async function updateStatus(session, value) {
    await fetch('/api/sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowIndex: session.index, field: 'status', value })
    })
    fetchSessions()
  }

  async function openPayModal(session) {
    const amount = getRate(session.therapist, session.session_type)
    setPayModal(session)
    setPayForm({ session_type: session.session_type || 'Regular', mop: 'Cash', amount })
  }

  async function confirmPayment() {
    setSaving(true)
    await fetch('/api/sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'pay',
        rowIndex: payModal.index,
        session_id: payModal.id,
        client_name: payModal.client_name,
        therapist: payModal.therapist,
        date: payModal.date,
        session_type: payForm.session_type,
        status: payModal.status,
        mop: payForm.mop,
        amount: payForm.amount
      })
    })
    setPayModal(null)
    fetchSessions()
    setSaving(false)
  }

  async function reversePayment(session) {
    if (!confirm(`Reverse payment for ${session.client_name}?`)) return
    await fetch('/api/sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unpay', rowIndex: session.index, session_id: session.id })
    })
    fetchSessions()
  }

  async function deleteSession(session) {
    if (!confirm(`Delete this session for ${session.client_name}?`)) return
    await fetch('/api/sessions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowIndex: session.index })
    })
    fetchSessions()
  }

  async function addOneOff() {
    setSaving(true)
    await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', ...addForm })
    })
    setAddModal(false)
    fetchSessions()
    setSaving(false)
  }

  async function handleDrop(therapist, timeSlot) {
    if (!dragSession) return
    setDropTarget(null)
    await fetch('/api/sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'edit',
        rowIndex: dragSession.index,
        client_name: dragSession.client_name,
        therapist,
        date: dragSession.date,
        day: selectedDay,
        time_start: timeSlot,
        time_end: dragSession.time_end,
        session_type: dragSession.session_type,
        status: dragSession.status,
        payment: dragSession.payment,
        mop: dragSession.mop
      })
    })
    setDragSession(null)
    fetchSessions()
  }

  const daySessions = sessions.filter(s => s.day === selectedDay)
  const therapists = [...new Set(daySessions.map(s => s.therapist))].sort()
  const usedSlots = ALL_TIME_SLOTS.filter(t => daySessions.some(s => s.time_start === t))

  function getSessionsForCell(therapist, slot) {
    return daySessions.filter(s => s.time_start === slot && s.therapist === therapist)
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ color: '#0f4c81', margin: 0 }}>Schedule</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setAddModal(true)} style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #0f4c81', cursor: 'pointer', fontSize: '13px', background: 'white', color: '#0f4c81', fontWeight: '500' }}>
            + One-off session
          </button>
          <button onClick={generateWeek} disabled={generating} style={{ background: '#fcc200', color: '#0f4c81', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}>
            {generating ? 'Generating...' : 'Generate this week'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {DAYS.map(day => {
          const count = sessions.filter(s => s.day === day).length
          const isToday = day === today
          return (
            <button key={day} onClick={() => setSelectedDay(day)} style={{
              padding: '8px 16px', borderRadius: '20px', border: isToday ? '2px solid #fcc200' : 'none',
              cursor: 'pointer', fontSize: '13px', fontWeight: '500',
              background: selectedDay === day ? '#0f4c81' : '#f0f0f0',
              color: selectedDay === day ? 'white' : '#666'
            }}>
              {day} {count > 0 && <span style={{ fontSize: '11px', opacity: 0.7 }}>({count})</span>}
            </button>
          )
        })}
      </div>

      {payModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '400px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 1rem', color: '#0f4c81' }}>Record payment</h3>
            <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '10px 12px', marginBottom: '1rem' }}>
              <div style={{ fontWeight: '500', color: '#0f4c81' }}>{payModal.client_name}</div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{payModal.therapist} · {payModal.day} {payModal.time_start}–{payModal.time_end}</div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Session type</label>
              <select value={payForm.session_type}
                onChange={e => setPayForm({ ...payForm, session_type: e.target.value, amount: getRate(payModal.therapist, e.target.value) })}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}>
                <option value="Regular">Regular session</option>
                <option value="Evaluation">Evaluation</option>
                <option value="Re-evaluation">Re-evaluation</option>
              </select>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Amount (₱)</label>
              <input type="number" value={payForm.amount}
                onChange={e => setPayForm({ ...payForm, amount: Number(e.target.value) })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '16px', fontWeight: '500', boxSizing: 'border-box' }} />
              <div style={{ fontSize: '11px', color: '#999', marginTop: '3px' }}>Auto-filled from {getSpecialty(payModal.therapist)} rate — edit if needed</div>
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>Mode of payment</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {MOP_OPTIONS.map(mop => (
                  <button key={mop} onClick={() => setPayForm({ ...payForm, mop })} style={{
                    padding: '7px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px',
                    border: payForm.mop === mop ? '2px solid #0f4c81' : '1px solid #ddd',
                    background: payForm.mop === mop ? '#E6F1FB' : 'white',
                    color: payForm.mop === mop ? '#0f4c81' : '#666',
                    fontWeight: payForm.mop === mop ? '500' : '400'
                  }}>{mop}</button>
                ))}
              </div>
            </div>
            <div style={{ background: '#EAF3DE', borderRadius: '8px', padding: '10px 14px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#27500A', fontWeight: '500' }}>Total</span>
              <span style={{ color: '#27500A', fontWeight: '700', fontSize: '18px' }}>₱{payForm.amount.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setPayModal(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={confirmPayment} disabled={saving} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#1D9E75', color: 'white', cursor: 'pointer', fontWeight: '500' }}>
                {saving ? 'Saving...' : `Confirm ₱${payForm.amount.toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {addModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '400px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 1rem', color: '#0f4c81' }}>Add one-off session</h3>
            {[{ key: 'client_name', label: 'Client name' }, { key: 'therapist', label: 'Therapist' }].map(f => (
              <div key={f.key} style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>{f.label}</label>
                <input value={addForm[f.key]} onChange={e => setAddForm({ ...addForm, [f.key]: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Day</label>
              <select value={addForm.day} onChange={e => setAddForm({ ...addForm, day: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}>
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.5rem' }}>
              {['time_start', 'time_end'].map(key => (
                <div key={key}>
                  <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>{key === 'time_start' ? 'Start' : 'End'}</label>
                  <select value={addForm[key]} onChange={e => setAddForm({ ...addForm, [key]: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }}>
                    {ALL_TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setAddModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={addOneOff} disabled={saving} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0f4c81', color: 'white', cursor: 'pointer', fontWeight: '500' }}>
                {saving ? 'Adding...' : 'Add session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Loading...</div>
      ) : daySessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999', background: '#f8f9fa', borderRadius: '12px' }}>
          No sessions for {selectedDay} — click Generate this week!
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '12px', minWidth: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 14px', background: '#0f4c81', color: 'white', textAlign: 'left', minWidth: '85px', fontWeight: '500', borderRight: '1px solid #1a5fa0', position: 'sticky', left: 0, zIndex: 3 }}>TIME</th>
                {therapists.map(t => (
                  <th key={t} style={{ padding: '10px 12px', background: '#0f4c81', color: 'white', textAlign: 'center', minWidth: '150px', fontWeight: '500', borderRight: '1px solid #1a5fa0', whiteSpace: 'nowrap', fontSize: '12px' }}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usedSlots.map((slot, ri) => (
                <tr key={slot} style={{ background: ri % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '5px 14px', color: '#666', fontSize: '11px', borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #f0f0f0', whiteSpace: 'nowrap', fontWeight: '500', position: 'sticky', left: 0, background: ri % 2 === 0 ? 'white' : '#fafafa', zIndex: 1 }}>{slot}</td>
                  {therapists.map(therapist => {
                    const cellSessions = getSessionsForCell(therapist, slot)
                    const isTarget = dropTarget?.therapist === therapist && dropTarget?.slot === slot
                    return (
                      <td key={therapist}
                        style={{ padding: '3px 4px', borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #f0f0f0', verticalAlign: 'top', background: isTarget ? '#E6F1FB' : 'transparent' }}
                        onDragOver={e => { e.preventDefault(); setDropTarget({ therapist, slot }) }}
                        onDragLeave={() => setDropTarget(null)}
                        onDrop={() => handleDrop(therapist, slot)}
                      >
                        {cellSessions.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {cellSessions.map((s, si) => (
                              <div key={si} draggable
                                onDragStart={() => setDragSession(s)}
                                onDragEnd={() => setDragSession(null)}
                                style={{
                                  background: s.payment === 'Paid' ? '#EAF3DE' : '#fff',
                                  border: `1px solid ${s.payment === 'Paid' ? '#97C459' : '#e0e0e0'}`,
                                  borderRadius: '5px', padding: '4px 6px', cursor: 'grab',
                                  opacity: dragSession?.index === s.index ? 0.4 : 1
                                }}>
                                <div style={{ fontWeight: '500', fontSize: '11px', color: '#0f4c81', marginBottom: '3px' }}>{s.client_name}</div>
                                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                                  <select value={s.status}
                                    onChange={e => updateStatus(s, e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    style={{ fontSize: '10px', padding: '1px 3px', borderRadius: '3px', border: '1px solid #ddd', cursor: 'pointer', background: STATUS_COLORS[s.status]?.bg, color: STATUS_COLORS[s.status]?.color }}>
                                    {['Scheduled','Present','Absent','Cancelled'].map(st => <option key={st} value={st}>{st}</option>)}
                                  </select>
                                  {s.payment === 'Unpaid' ? (
                                    <button onClick={() => openPayModal(s)}
                                      style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', border: 'none', background: '#FCEBEB', color: '#791F1F', cursor: 'pointer', fontWeight: '500' }}>
                                      Unpaid
                                    </button>
                                  ) : (
                                    <button onClick={() => reversePayment(s)}
                                      style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', border: 'none', background: '#EAF3DE', color: '#27500A', cursor: 'pointer' }}>
                                      Paid ✓
                                    </button>
                                  )}
                                  <button onClick={() => deleteSession(s)}
                                    style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', border: '1px solid #fcc', background: '#fff5f5', color: '#c00', cursor: 'pointer' }}>✕</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ height: '24px', borderRadius: '4px', border: isTarget ? '2px dashed #378ADD' : '1px dashed #eee' }} />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '1rem', display: 'flex', gap: '16px', fontSize: '12px', color: '#999', flexWrap: 'wrap' }}>
        <span>Color:</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', background: '#EAF3DE', border: '1px solid #97C459', borderRadius: '2px', display: 'inline-block' }}></span> Paid</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: '2px', display: 'inline-block' }}></span> Unpaid</span>
        <span style={{ color: '#ccc' }}>· Drag to reschedule · Click Unpaid to record payment · ✕ to delete</span>
      </div>
    </div>
  )
}