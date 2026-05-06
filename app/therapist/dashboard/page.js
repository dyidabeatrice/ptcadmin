'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

export default function TherapistDashboard() {
  const [therapistName, setTherapistName] = useState('')
  const [sessions, setSessions] = useState([])
  const [reports, setReports] = useState([])
  const [weeks, setWeeks] = useState([])
  const [selectedWeek, setSelectedWeek] = useState(null)
  const [selectedDay, setSelectedDay] = useState(() => {
    const day = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'long' })
    return DAYS.includes(day) ? day : 'Monday'
  })
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const name = sessionStorage.getItem('therapist_name')
    if (!name) { router.push('/therapist/login'); return }
    setTherapistName(name)
    initializePage(name)
  }, [])

  async function initializePage(name) {
    setLoading(true)
    try {
      const [weeksRes, rRes] = await Promise.all([
        fetch('/api/weeks'),
        fetch('/api/documents')
      ])
      const [weeksJson, rJson] = await Promise.all([weeksRes.json(), rRes.json()])

      if (rJson.success) setReports(rJson.data.filter(r => r.therapist === name))

      if (weeksJson.success && weeksJson.data.length > 0) {
        setWeeks(weeksJson.data)
        const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
        const day = today.getDay()
        const monday = new Date(today)
        monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1))
        const y = monday.getFullYear()
        const m = String(monday.getMonth() + 1).padStart(2, '0')
        const d = String(monday.getDate()).padStart(2, '0')
        const currentKey = `week_${y}_${m}_${d}`
        const current = weeksJson.data.find(w => w.key === currentKey) || weeksJson.data[weeksJson.data.length - 1]
        setSelectedWeek(current)
        await fetchSessions(current.key, name)
      }
    } catch (e) {
      console.error('init error:', e)
    }
    setLoading(false)
  }

  async function fetchSessions(weekKey, name) {
    const res = await fetch(`/api/sessions?week=${weekKey}`)
    const json = await res.json()
    if (json.success) setSessions(json.data.filter(s => s.therapist === (name || therapistName)))
  }

  async function switchWeek(week) {
    setSelectedWeek(week)
    setSessions([])
    await fetchSessions(week.key, therapistName)
  }

  function logout() {
    sessionStorage.removeItem('therapist_name')
    router.push('/therapist/login')
  }

  const daySessions = sessions
    .filter(s => s.day === selectedDay)
    .sort((a, b) => {
      const toMin = t => {
        if (!t) return 0
        const [time, period] = t.split(' ')
        let [h, m] = time.split(':').map(Number)
        if (period === 'PM' && h !== 12) h += 12
        if (period === 'AM' && h === 12) h = 0
        return h * 60 + m
      }
      return toMin(a.time_start) - toMin(b.time_start)
    })

  const pendingReports = reports.filter(r => r.status !== 'Completed')
  const today = new Date()

  function daysUntil(deadline) {
    if (!deadline) return null
    const d = new Date(deadline)
    const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: 'sans-serif' }}>

      <nav style={{
        background: '#0f4c81', padding: '0 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '56px', borderBottom: '3px solid #fcc200'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ background: '#fcc200', color: '#0f4c81', padding: '2px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: '800' }}>PTC</span>
          <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>{therapistName}</span>
        </div>
        <button onClick={logout} style={{
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          color: 'white', padding: '6px 14px', borderRadius: '6px',
          cursor: 'pointer', fontSize: '12px'
        }}>Sign out</button>
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Loading your schedule...</div>
        ) : (
          <>
            {pendingReports.length > 0 && (
              <div style={{ background: '#FAEEDA', border: '1px solid #EF9F27', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ fontWeight: '600', color: '#633806', marginBottom: '8px', fontSize: '14px' }}>
                  Report requests — {pendingReports.length} pending
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pendingReports.map((r, i) => {
                    const days = daysUntil(r.deadline)
                    const urgent = days !== null && days <= 3
                    return (
                    <div key={i} style={{
                      background: 'white', borderRadius: '8px', padding: '10px 14px',
                      border: `1px solid ${urgent ? '#F09595' : r.file_url ? '#97C459' : '#EF9F27'}`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', fontSize: '13px', color: '#0f4c81' }}>{r.client_name}</div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                          {r.doc_type} · Requested {r.request_date}
                        </div>
                        {r.file_url && (
                          <div style={{ fontSize: '11px', color: '#27500A', marginTop: '4px' }}>
                            ✓ Uploaded {r.uploaded_at}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                        <div style={{
                          fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '10px',
                          background: r.file_url ? '#EAF3DE' : urgent ? '#FCEBEB' : '#EAF3DE',
                          color: r.file_url ? '#27500A' : urgent ? '#791F1F' : '#27500A'
                        }}>
                          {r.file_url ? '✓ Uploaded' : days === null ? 'No deadline' : days < 0 ? 'Overdue' : days === 0 ? 'Due today' : `${days} day${days !== 1 ? 's' : ''} left`}
                        </div>
                        <div style={{ fontSize: '11px', color: '#999' }}>Due {r.deadline}</div>
                        {!r.file_url && r.status === 'Ready for Release' && (
                          <label style={{
                            padding: '5px 12px', borderRadius: '6px', border: 'none',
                            background: '#0f4c81', color: 'white', cursor: 'pointer',
                            fontSize: '11px', fontWeight: '500'
                          }}>
                            {uploading === r.id ? 'Uploading...' : 'Upload PDF'}
                            <input type="file" accept=".pdf" style={{ display: 'none' }}
                              disabled={uploading === r.id}
                              onChange={async e => {
                                const file = e.target.files[0]
                                if (!file) return
                                if (file.type !== 'application/pdf') return alert('Please upload a PDF file only')
                                setUploading(r.id)
                                const formData = new FormData()
                                formData.append('file', file)
                                formData.append('report_id', r.id)
                                formData.append('report_index', r.index)
                                const res = await fetch('/api/documents/upload', {
                                  method: 'POST',
                                  body: formData
                                })
                                const json = await res.json()
                                if (json.success) {
                                  alert('Report uploaded successfully!')
                                  const rRes = await fetch('/api/documents')
                                  const rJson = await rRes.json()
                                  if (rJson.success) setReports(rJson.data.filter(rep => rep.therapist === therapistName))
                                } else {
                                  alert('Upload failed: ' + json.error)
                                }
                                setUploading(null)
                              }} />
                          </label>
                        )}
                      </div>
                    </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
                <h2 style={{ margin: 0, color: '#0f4c81', fontSize: '16px' }}>My schedule</h2>
                {weeks.length > 0 && (
                  <select
                    value={selectedWeek?.key || ''}
                    onChange={e => {
                      const w = weeks.find(x => x.key === e.target.value)
                      if (w) switchWeek(w)
                    }}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', cursor: 'pointer' }}
                  >
                    {weeks.map(w => (
                      <option key={w.key} value={w.key}>{w.label}</option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                {DAYS.map(day => {
                  const count = sessions.filter(s => s.day === day).length
                  return (
                    <button key={day} onClick={() => setSelectedDay(day)} style={{
                      padding: '6px 14px', borderRadius: '20px', border: 'none',
                      cursor: 'pointer', fontSize: '12px', fontWeight: '500',
                      background: selectedDay === day ? '#0f4c81' : '#f0f0f0',
                      color: selectedDay === day ? 'white' : '#666'
                    }}>
                      {day} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
                    </button>
                  )
                })}
              </div>

              {daySessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#999', fontSize: '13px' }}>
                  No sessions scheduled for {selectedDay}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {daySessions.map((s, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', borderRadius: '8px',
                      background: s.status === 'Absent' ? '#F4CCCC' : s.status === 'Cancelled' ? '#f8f8f8' : s.status === 'Pencil' ? '#FFFBE6' : s.status === 'Present' ? '#D9EAD3' : '#E6F1FB',
                      border: `1px solid ${s.status === 'Absent' ? '#E06666' : s.status === 'Cancelled' ? '#e0e0e0' : s.status === 'Pencil' ? '#FFD666' : s.status === 'Present' ? '#6AA84F' : '#B5D4F4'}`,
                      opacity: s.status === 'Cancelled' ? 0.6 : 1
                    }}>
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '13px', color: '#0f4c81' }}>{s.client_name}</div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                          {s.time_start} – {s.time_end} · {s.session_type || 'Regular'}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '11px', padding: '3px 10px', borderRadius: '10px', fontWeight: '500',
                        background: s.status === 'Present' ? '#EAF3DE' : s.status === 'Absent' ? '#FCEBEB' : s.status === 'Cancelled' ? '#F1EFE8' : '#E6F1FB',
                        color: s.status === 'Present' ? '#27500A' : s.status === 'Absent' ? '#791F1F' : s.status === 'Cancelled' ? '#5F5E5A' : '#0C447C'
                      }}>{s.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}