'use client'
import { useState, useEffect } from 'react'

const DAYS = ['All','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MOP_OPTIONS = ['Cash', 'BDO', 'Union Bank']

export default function PaymentsPage() {
  const [payments, setPayments] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterMop, setFilterMop] = useState('All')
  const [filterType, setFilterType] = useState('All')

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [pRes, sRes] = await Promise.all([
      fetch('/api/payments'),
      fetch('/api/sessions')
    ])
    const [pJson, sJson] = await Promise.all([pRes.json(), sRes.json()])
    if (pJson.success) setPayments(pJson.data)
    if (sJson.success) setSessions(sJson.data)
    setLoading(false)
  }

  const today = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
  const todayPayments = payments.filter(p => p.date === today)
  const todayTotal = todayPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const weekTotal = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const advanceTotal = payments.filter(p => p.payment_type === 'advance').reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const unpaidCount = sessions.filter(s => s.payment === 'Unpaid' && s.status !== 'Cancelled').length

  const advanceByClient = payments
    .filter(p => p.payment_type === 'advance')
    .reduce((acc, p) => {
      acc[p.client_name] = (acc[p.client_name] || 0) + Number(p.amount || 0)
      return acc
    }, {})

  const filtered = payments.filter(p => {
    const matchSearch = !search || p.client_name?.toLowerCase().includes(search.toLowerCase())
    const matchMop = filterMop === 'All' || p.mop === filterMop
    const matchType = filterType === 'All' ||
      (filterType === 'Advance' && p.payment_type === 'advance') ||
      (filterType === 'Session' && p.payment_type !== 'advance')
    return matchSearch && matchMop && matchType
  })

  const sortedFiltered = [...filtered].sort((a, b) => Number(b.id) - Number(a.id))

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#0f4c81', margin: '0 0 4px' }}>Payments</h1>
        <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>All payment records this week</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '2rem' }}>
        {[
          { label: "Today's collections", value: `₱${todayTotal.toLocaleString()}`, sub: `${todayPayments.length} payments`, color: '#fcc200' },
          { label: 'Total this week', value: `₱${weekTotal.toLocaleString()}`, sub: `${payments.length} payments`, color: '#1D9E75' },
          { label: 'Advance credits', value: `₱${advanceTotal.toLocaleString()}`, sub: `${Object.keys(advanceByClient).length} clients`, color: '#0f4c81' },
          { label: 'Unpaid sessions', value: unpaidCount, sub: 'needs collection', color: '#E24B4A' },
        ].map((card, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1.25rem', borderTop: `4px solid ${card.color}` }}>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '6px' }}>{card.label}</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f4c81' }}>{card.value}</div>
            <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {Object.keys(advanceByClient).length > 0 && (
        <div style={{ background: '#EAF3DE', border: '1px solid #97C459', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#27500A', marginBottom: '8px' }}>Client advance credits</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Object.entries(advanceByClient).map(([name, amount]) => (
              <span key={name} style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', background: 'white', border: '1px solid #97C459', color: '#27500A' }}>
                {name} — ₱{amount.toLocaleString()}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Search client..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', width: '200px' }} />

        <div style={{ display: 'flex', gap: '6px' }}>
          {['All', 'Session', 'Advance'].map(f => (
            <button key={f} onClick={() => setFilterType(f)} style={{
              padding: '7px 14px', borderRadius: '20px', border: 'none',
              cursor: 'pointer', fontSize: '12px', fontWeight: '500',
              background: filterType === f ? '#0f4c81' : '#f0f0f0',
              color: filterType === f ? 'white' : '#666'
            }}>{f}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {['All', ...MOP_OPTIONS].map(m => (
            <button key={m} onClick={() => setFilterMop(m)} style={{
              padding: '7px 14px', borderRadius: '20px', border: 'none',
              cursor: 'pointer', fontSize: '12px',
              background: filterMop === m ? '#185FA5' : '#f0f0f0',
              color: filterMop === m ? 'white' : '#666'
            }}>{m}</button>
          ))}
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              {['Client', 'Therapist', 'Session type', 'Amount', 'MOP', 'Date', 'Type'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#666', fontWeight: '500', borderBottom: '1px solid #e0e0e0', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>Loading...</td></tr>
            ) : sortedFiltered.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No payments found</td></tr>
            ) : sortedFiltered.map((p, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f0f0f0', background: p.payment_type === 'advance' ? '#FAFFF8' : 'white' }}>
                <td style={{ padding: '10px 16px', fontWeight: '500', color: '#0f4c81' }}>{p.client_name}</td>
                <td style={{ padding: '10px 16px', color: '#666' }}>{p.therapist || '—'}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                    background: p.session_type === 'Evaluation' ? '#FAEEDA' :
                                p.session_type === 'Advance' ? '#EAF3DE' :
                                p.session_type === 'Specialized' ? '#EEEDFE' : '#E6F1FB',
                    color: p.session_type === 'Evaluation' ? '#633806' :
                           p.session_type === 'Advance' ? '#27500A' :
                           p.session_type === 'Specialized' ? '#3C3489' : '#0C447C'
                  }}>{p.session_type || 'Regular'}</span>
                </td>
                <td style={{ padding: '10px 16px', fontWeight: '500', color: '#1D9E75' }}>₱{Number(p.amount || 0).toLocaleString()}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#E6F1FB', color: '#0C447C' }}>{p.mop}</span>
                </td>
                <td style={{ padding: '10px 16px', color: '#999', fontSize: '12px', whiteSpace: 'nowrap' }}>{p.date}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                    background: p.payment_type === 'advance' ? '#EAF3DE' : '#f0f0f0',
                    color: p.payment_type === 'advance' ? '#27500A' : '#666'
                  }}>{p.payment_type === 'advance' ? 'Advance' : 'Session'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {unpaidCount > 0 && (
        <div style={{ marginTop: '1.5rem', background: '#FCEBEB', border: '1px solid #F09595', borderRadius: '10px', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#791F1F', marginBottom: '4px' }}>{unpaidCount} unpaid session{unpaidCount !== 1 ? 's' : ''} this week</div>
          <div style={{ fontSize: '12px', color: '#A32D2D' }}>Go to Schedule to record payments — or use the Advance payment button for clients paying ahead.</div>
        </div>
      )}
    </div>
  )
}