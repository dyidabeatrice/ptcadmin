'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Dashboard() {
  const [sessions, setSessions] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [sRes, cRes, pRes, mRes] = await Promise.all([
        fetch('/api/sessions'),
        fetch('/api/clients'),
        fetch('/api/payments'),
        fetch('/api/messages')
      ])
      const [sJson, cJson, pJson, mJson] = await Promise.all([
        sRes.json(), cRes.json(), pRes.json(), mRes.json()
      ])
      if (sJson.success) setSessions(sJson.data)
      if (cJson.success) setClients(cJson.data)
      if (pJson.success) setPayments(pJson.data)
      if (mJson.success) setMessages(mJson.data)
      setLoading(false)
    }
    load()
  }, [])

  const today = new Date()
  const todayDay = today.toLocaleDateString('en-US', { weekday: 'long' })
  const todayDate = today.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
  const todayStr = today.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const todaySessions = sessions.filter(s => s.day === todayDay)
  const presentToday = todaySessions.filter(s => s.status === 'Present').length
  const absentToday = todaySessions.filter(s => s.status === 'Absent').length
  const unpaidSessions = sessions.filter(s => s.payment === 'Unpaid' && s.status !== 'Cancelled')
  const todayPayments = payments.filter(p => p.date === todayDate)
  const todayTotal = todayPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const pendingMessages = messages.filter(m => !m.sent)
  const activeClients = clients.filter(c => c.status !== 'inactive')
  const therapistsToday = [...new Set(todaySessions.map(s => s.therapist))].sort()
  const absentTherapists = [...new Set(todaySessions.filter(s => s.status === 'Absent').map(s => s.therapist))]

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#0f4c81', margin: '0 0 4px' }}>Good morning</h1>
        <p style={{ margin: 0, fontSize: '14px', color: '#999' }}>{todayStr}</p>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1rem 1.25rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { href: '/sessions', label: 'Generate this week', color: '#fcc200', text: '#0f4c81' },
            { href: '/clients', label: 'Add new client', color: '#0f4c81', text: 'white' },
            { href: '/sessions', label: 'View schedule', color: '#0f4c81', text: 'white' },
            { href: '/messages', label: 'Send reminders', color: '#0f4c81', text: 'white' },
            { href: '/payments', label: 'View payments', color: '#1D9E75', text: 'white' },
          ].map(l => (
            <Link key={l.label} href={l.href} style={{
              padding: '10px 18px', borderRadius: '8px',
              background: l.color, color: l.text,
              textDecoration: 'none', fontSize: '13px', fontWeight: '500'
            }}>{l.label}</Link>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Loading...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '2rem' }}>
            {[
              { label: "Today's sessions", value: todaySessions.length, sub: `${presentToday} present · ${absentToday} absent`, color: '#0f4c81', href: '/sessions' },
              { label: "Today's collections", value: `₱${todayTotal.toLocaleString()}`, sub: `${todayPayments.length} payments`, color: '#fcc200', href: '/payments' },
              { label: 'Unpaid sessions', value: unpaidSessions.length, sub: 'needs collection', color: '#E24B4A', href: '/payments' },
              { label: 'Pending messages', value: pendingMessages.length, sub: 'to send', color: '#185FA5', href: '/messages' },
              { label: 'Active clients', value: activeClients.length, sub: 'enrolled', color: '#1D9E75', href: '/clients' },
            ].map((card, i) => (
              <Link key={i} href={card.href} style={{ textDecoration: 'none' }}>
                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1.25rem', borderTop: `4px solid ${card.color}`, cursor: 'pointer' }}>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '6px' }}>{card.label}</div>
                  <div style={{ fontSize: '26px', fontWeight: '700', color: '#0f4c81', marginBottom: '4px' }}>{card.value}</div>
                  <div style={{ fontSize: '11px', color: '#aaa' }}>{card.sub}</div>
                </div>
              </Link>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '2rem' }}>

            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: '#0f4c81', fontSize: '15px' }}>Today — {todayDay}</h3>
                <Link href="/sessions" style={{ fontSize: '12px', color: '#185FA5', textDecoration: 'none' }}>Full schedule →</Link>
              </div>
              {todaySessions.length === 0 ? (
                <p style={{ color: '#999', fontSize: '13px', margin: 0 }}>No sessions today.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto' }}>
                  {todaySessions.map((s, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 10px', borderRadius: '6px',
                      background: s.payment === 'Paid' ? '#EAF3DE' : '#f8f9fa',
                      border: `1px solid ${s.payment === 'Paid' ? '#97C459' : '#e0e0e0'}`
                    }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f4c81' }}>{s.client_name}</div>
                        <div style={{ fontSize: '11px', color: '#999' }}>{s.therapist} · {s.time_start}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <span style={{
                          fontSize: '10px', padding: '2px 7px', borderRadius: '10px',
                          background: s.status === 'Present' ? '#EAF3DE' : s.status === 'Absent' ? '#FCEBEB' : s.status === 'Cancelled' ? '#F1EFE8' : '#E6F1FB',
                          color: s.status === 'Present' ? '#27500A' : s.status === 'Absent' ? '#791F1F' : s.status === 'Cancelled' ? '#5F5E5A' : '#0C447C'
                        }}>{s.status}</span>
                        <span style={{
                          fontSize: '10px', padding: '2px 7px', borderRadius: '10px',
                          background: s.payment === 'Paid' ? '#EAF3DE' : '#FCEBEB',
                          color: s.payment === 'Paid' ? '#27500A' : '#791F1F'
                        }}>{s.payment}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 10px', color: '#0f4c81', fontSize: '15px' }}>Therapists today</h3>
                {therapistsToday.length === 0 ? (
                  <p style={{ color: '#999', fontSize: '13px', margin: 0 }}>No therapists scheduled.</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {therapistsToday.map(t => {
                      const isAbsent = absentTherapists.includes(t)
                      return (
                        <span key={t} style={{
                          fontSize: '12px', padding: '4px 10px', borderRadius: '20px',
                          background: isAbsent ? '#FCEBEB' : '#E6F1FB',
                          color: isAbsent ? '#791F1F' : '#0C447C',
                          border: `1px solid ${isAbsent ? '#F09595' : '#B5D4F4'}`,
                          textDecoration: isAbsent ? 'line-through' : 'none'
                        }}>{t}{isAbsent ? ' · absent' : ''}</span>
                      )
                    })}
                  </div>
                )}
              </div>

              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1.25rem', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, color: '#0f4c81', fontSize: '15px' }}>Pending messages</h3>
                  <Link href="/messages" style={{ fontSize: '12px', color: '#185FA5', textDecoration: 'none' }}>View all →</Link>
                </div>
                {pendingMessages.length === 0 ? (
                  <p style={{ color: '#1D9E75', fontSize: '13px', margin: 0 }}>All caught up!</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                    {pendingMessages.slice(0, 5).map((m, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', borderRadius: '6px', background: '#f8f9fa', border: '1px solid #e0e0e0' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f4c81' }}>{m.client_name}</div>
                          <div style={{ fontSize: '11px', color: '#aaa' }}>{m.type}</div>
                        </div>
                        <Link href="/messages" style={{ fontSize: '11px', color: '#185FA5', textDecoration: 'none', alignSelf: 'center' }}>Send →</Link>
                      </div>
                    ))}
                    {pendingMessages.length > 5 && (
                      <Link href="/messages" style={{ fontSize: '12px', color: '#185FA5', textDecoration: 'none', textAlign: 'center', padding: '4px' }}>
                        +{pendingMessages.length - 5} more →
                      </Link>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>

          {unpaidSessions.length > 0 && (
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: '#0f4c81', fontSize: '15px' }}>Unpaid sessions — needs follow-up</h3>
                <Link href="/payments" style={{ fontSize: '12px', color: '#185FA5', textDecoration: 'none' }}>View all →</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                {unpaidSessions.slice(0, 8).map((s, i) => (
                  <div key={i} style={{ padding: '8px 12px', borderRadius: '8px', background: '#FFF5F5', border: '1px solid #F09595' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#791F1F' }}>{s.client_name}</div>
                    <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>{s.therapist} · {s.day} {s.time_start}</div>
                  </div>
                ))}
                {unpaidSessions.length > 8 && (
                  <Link href="/payments" style={{ padding: '8px 12px', borderRadius: '8px', background: '#f8f9fa', border: '1px solid #e0e0e0', fontSize: '12px', color: '#185FA5', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    +{unpaidSessions.length - 8} more →
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}