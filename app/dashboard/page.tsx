'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Dashboard() {
  const [clients, setClients] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [todaySessions, setTodaySessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [currentTime, setCurrentTime] = useState('')

  const now = new Date();
  const offset = 8 * 60; // GMT+8 in minutes
  const gmt8Time = new Date(now.getTime() + (offset - now.getTimezoneOffset()) * 60000);

  useEffect(() => {
    async function load() {
      const [cRes, pRes, mRes, wRes] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/payments'),
        fetch('/api/messages'),
        fetch('/api/weeks')
      ])
      const [cJson, pJson, mJson, wJson] = await Promise.all([
        cRes.json(), pRes.json(), mRes.json(), wRes.json()
      ])
      if (cJson.success) setClients(cJson.data)
      if (pJson.success) setPayments(pJson.data)
      if (mJson.success) setMessages(mJson.data)

      if (wJson.success && wJson.data.length > 0) {
        const today = gmt8Time
        const day = today.getDay()
        const monday = new Date(today)
        monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1))
        const y = monday.getFullYear()
        const m = String(monday.getMonth() + 1).padStart(2, '0')
        const d = String(monday.getDate()).padStart(2, '0')
        const currentKey = `week_${y}_${m}_${d}`
        const currentWeek = wJson.data.find((w: any) => w.key === currentKey)
        if (currentWeek) {
          const sRes = await fetch(`/api/sessions?week=${currentKey}`)
          const sJson = await sRes.json()
          if (sJson.success) {
            const todayDay = today.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'long' })
            setTodaySessions(sJson.data.filter((s: any) => s.day === todayDay))
          }
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeString = now.toLocaleString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: true });
      setCurrentTime(timeString);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [])

  const today = gmt8Time
  const todayDay = today.toLocaleDateString('en-US', { weekday: 'long' })
  const todayDate = today.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
  const todayStr = today.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const presentToday = todaySessions.filter(s => s.status === 'Present').length
  const absentToday = todaySessions.filter(s => s.status === 'Absent').length
  const unpaidToday = todaySessions.filter(s => s.payment === 'Unpaid' && s.status !== 'Cancelled')
  const todayPayments = payments.filter(p => p.date === todayDate && p.payment_type !== 'refund')
  const todayTotal = todayPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const pendingMessages = messages.filter((m: any) => !m.sent)
  const activeClients = clients.filter(c => c.status !== 'inactive')
  const therapistsToday = [...new Set(todaySessions.map(s => s.therapist))].sort()
  const absentTherapists = [...new Set(todaySessions.filter(s => s.status === 'Absent').map(s => s.therapist))]
  const clientsWithCredit = clients.filter(c => c.credit_balance > 0)
  const clientsWithOutstanding = clients.filter(c => c.outstanding_balance > 0)

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#0f4c81', margin: '0 0 4px' }}>{todayStr}</h1>
        <p style={{ margin: 0, fontSize: '14px', color: '#999' }}>{currentTime} (GMT+8)</p>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1rem 1.25rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { href: '/sessions', label: 'View schedule', color: '#fcc200', text: '#0f4c81' },
            { href: '/clients', label: 'Add new client', color: '#0f4c81', text: 'white' },
            { href: '/messages', label: 'Send reminders', color: '#0f4c81', text: 'white' },
            { href: '/payments', label: 'View payments', color: '#1D9E75', text: 'white' },
            { href: '/master', label: 'Master schedule', color: '#0f4c81', text: 'white' },
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '2rem' }}>
            {[
              { label: "Today's sessions", value: todaySessions.length, sub: `${presentToday} present · ${absentToday} absent`, color: '#0f4c81', href: '/sessions' },
              { label: "Today's collections", value: `₱${todayTotal.toLocaleString()}`, sub: `${todayPayments.length} payments`, color: '#fcc200', href: '/payments' },
              { label: 'Unpaid today', value: unpaidToday.length, sub: 'needs collection', color: '#E24B4A', href: '/payments' },
              { label: 'Pending messages', value: pendingMessages.length, sub: 'to send', color: '#185FA5', href: '/messages' },
              { label: 'Outstanding', value: clientsWithOutstanding.length, sub: 'clients with balance due', color: '#E24B4A', href: '/payments' },
            ].map((card, i) => (
              <Link key={i} href={card.href} style={{ textDecoration: 'none' }}>
                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1.25rem', borderTop: `4px solid ${card.color}`, cursor: 'pointer' }}>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '6px' }}>{card.label}</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f4c81', marginBottom: '4px' }}>{card.value}</div>
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
                <p style={{ color: '#999', fontSize: '13px', margin: 0 }}>No sessions today — go to Schedule to generate this week!</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto' }}>
                  {todaySessions.map((s, i) => {
                    const paid = s.payment === 'Paid'
                    const status = s.status
                    let bg = '#f8f9fa'
                    let border = '#e0e0e0'
                    if (paid && status === 'Present') { bg = '#EAF3DE'; border = '#97C459' }
                    else if (!paid && (status === 'Present' || status === 'Cancelled')) { bg = '#FAEEDA'; border = '#EF9F27' }
                    else if (status === 'Absent') { bg = '#FCEBEB'; border = '#F09595' }
                    return (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 10px', borderRadius: '6px', background: bg, border: `1px solid ${border}`
                      }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: '#0f4c81' }}>{s.client_name}</div>
                          <div style={{ fontSize: '11px', color: '#999' }}>{s.therapist} · {s.time_start}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '10px', background: 'rgba(255,255,255,0.7)', color: '#444' }}>{status}</span>
                          <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '10px', background: paid ? '#EAF3DE' : '#FCEBEB', color: paid ? '#27500A' : '#791F1F' }}>{s.payment}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 10px', color: '#0f4c81', fontSize: '15px' }}>Therapists today</h3>
                {therapistsToday.length === 0 ? (
                  <p style={{ color: '#999', fontSize: '13px', margin: 0 }}>No sessions generated yet for today.</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(therapistsToday as string[]).map(t => {
                      const isAbsent = (absentTherapists as string[]).includes(t)
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
                    {pendingMessages.slice(0, 5).map((m: any, i: number) => (
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

          {clientsWithOutstanding.length > 0 && (
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: '#0f4c81', fontSize: '15px' }}>Outstanding balances — needs follow-up</h3>
                <Link href="/payments" style={{ fontSize: '12px', color: '#185FA5', textDecoration: 'none' }}>View all →</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                {clientsWithOutstanding.slice(0, 8).map((c, i) => (
                  <div key={i} style={{ padding: '8px 12px', borderRadius: '8px', background: '#FFF5F5', border: '1px solid #F09595' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#791F1F' }}>{c.name}</div>
                    <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>₱{Number(c.outstanding_balance).toLocaleString()} outstanding</div>
                  </div>
                ))}
                {clientsWithOutstanding.length > 8 && (
                  <Link href="/payments" style={{ padding: '8px 12px', borderRadius: '8px', background: '#f8f9fa', border: '1px solid #e0e0e0', fontSize: '12px', color: '#185FA5', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    +{clientsWithOutstanding.length - 8} more →
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