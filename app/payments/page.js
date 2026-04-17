'use client'
import { useState, useEffect } from 'react'

const MOP_OPTIONS = ['Cash', 'BDO', 'Union Bank']
const VERIFIERS = ['DUANE', 'KAMYLLE']

function OutstandingTab({ clients, onSettle }) {
  const [unpaidSessions, setUnpaidSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [payModal, setPayModal] = useState(null)
  const [payForm, setPayForm] = useState({ mop: 'Cash', amount: 0, use_credit: false, split: false, split_credit: 0, split_cash: 0 })
  const [clientCredit, setClientCredit] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchOutstanding() }, [])

  async function fetchOutstanding() {
    setLoading(true)
    const res = await fetch('/api/payments?action=outstanding')
    const json = await res.json()
    if (json.success) setUnpaidSessions(json.data)
    setLoading(false)
  }

  async function openSettle(session) {
    setPayModal(session)
    const initialAmount = Number(session.amount) || 0
    setPayForm({ mop: 'Cash', amount: initialAmount, use_credit: false, split: false, split_credit: 0, split_cash: initialAmount })
    const res = await fetch(`/api/credits?client=${encodeURIComponent(session.client_name)}`)
    const json = await res.json()
    if (json.success) setClientCredit(json.credit_balance || 0)
  }

  async function settlePayment() {
    setSaving(true)
    const isPartial = !payForm.use_credit && !payForm.split && payModal.amount > 0 && Number(payForm.amount) < Number(payModal.amount)

    if (isPartial) {
      const today = new Date().toLocaleDateString('en-PH', {
        timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric'
      })
      await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_credit',
          client_name: payModal.client_name,
          amount: Number(payForm.amount) || Number(payModal.amount),
          mop: payForm.mop,
          date: today,
          note: `Partial payment for ${payModal.date}`
        })
      })
    } else {
      if (payModal.is_document) {
        // Document payment
        const today = new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric' })
        await fetch('/api/documents', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'pay', index: payModal.index, client_name: payModal.client_name, amount: payModal.amount, mop: payForm.use_credit ? 'Credit' : payForm.split ? 'Split' : payForm.mop })
        })
        await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'log',
            client_name: payModal.client_name,
            therapist: payModal.therapist,
            session_id: `DOC-${payModal.id}`,
            amount: payModal.amount,
            mop: payForm.use_credit ? 'Credit' : payForm.split ? 'Split' : payForm.mop,
            session_type: payModal.session_type,
            date: today,
            payment_type: 'document',
            reference: payForm.reference || ''
          })
        })
      } else {
        // Session payment
        await fetch('/api/sessions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'pay',
            week_key: payModal.week_key,
            rowIndex: payModal.index,
            session_id: payModal.id,
            client_name: payModal.client_name,
            therapist: payModal.therapist,
            date: payModal.date,
            session_type: payModal.session_type || 'Regular',
            mop: payForm.use_credit ? 'Credit' : payForm.split ? 'Split' : payForm.mop,
            amount: Number(payForm.amount) || Number(payModal.amount),
            use_credit: payForm.use_credit,
            split: payForm.split,
            split_credit: payForm.split_credit,
            split_cash: payForm.split_cash,
            credit_balance: clientCredit,
            reference: payForm.reference || ''
          })
        })
      }
    }

    setPayModal(null)
    fetchOutstanding()
    onSettle()
    setSaving(false)
  }

  const grouped = unpaidSessions.reduce((acc, s) => {
    if (!acc[s.client_name]) acc[s.client_name] = []
    acc[s.client_name].push(s)
    return acc
  }, {})

  const isPartial = !payForm.use_credit && !payForm.split && payForm.amount < (payModal?.amount || 0)

  return (
    <div>
      {payModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '420px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 1rem', color: '#0f4c81' }}>Settle payment</h3>
            <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '10px 12px', marginBottom: '1rem' }}>
              <div style={{ fontWeight: '500', color: '#0f4c81' }}>{payModal.client_name}</div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{payModal.therapist} · {payModal.date} · {payModal.time_start}</div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>Status: {payModal.status} · Balance due: ₱{Number(payModal.amount || 0).toLocaleString()}</div>
              {clientCredit > 0 && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: '#27500A', background: '#EAF3DE', padding: '4px 8px', borderRadius: '6px', display: 'inline-block' }}>
                  💳 Credit available: ₱{clientCredit.toLocaleString()}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Amount (₱)</label>
              <input type="number" value={payForm.amount}
                onChange={e => { const val = Number(e.target.value); setPayForm({ ...payForm, amount: val, split_cash: val }) }}
                onFocus={e => { if (payForm.amount === 0) setPayForm({ ...payForm, amount: '', split_cash: '' }) }}
                onBlur={e => { if (payForm.amount === '') setPayForm({ ...payForm, amount: 0, split_cash: 0 }) }}
                placeholder="Enter amount to settle"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '16px', fontWeight: '500', boxSizing: 'border-box' }} />
              {payForm.amount > 0 && isPartial && (
                <div style={{ marginTop: '6px', padding: '8px 10px', borderRadius: '6px', background: '#FAEEDA', border: '1px solid #EF9F27', fontSize: '12px', color: '#633806' }}>
                  ⚠️ Partial — ₱{((payModal?.amount || 0) - payForm.amount).toLocaleString()} remaining. Will be recorded as advance credit.
                </div>
              )}
              {payForm.amount > 0 && !isPartial && !payForm.use_credit && !payForm.split && (
                <div style={{ marginTop: '6px', padding: '8px 10px', borderRadius: '6px', background: '#EAF3DE', border: '1px solid #97C459', fontSize: '12px', color: '#27500A' }}>
                  ✓ Full payment — session will be marked as paid.
                </div>
              )}
            </div>

            {clientCredit > 0 && (
              <div style={{ marginBottom: '12px', padding: '10px 12px', background: '#EAF3DE', borderRadius: '8px', border: '1px solid #97C459' }}>
                <div style={{ fontSize: '12px', fontWeight: '500', color: '#27500A', marginBottom: '8px' }}>Use available credit:</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    ...(clientCredit >= payModal.amount ? [{ key: 'full', label: 'Use full credit', active: payForm.use_credit && !payForm.split }] : []),
                    { key: 'split', label: 'Split payment', active: payForm.split },
                    { key: 'normal', label: 'Pay normally', active: !payForm.use_credit && !payForm.split },
                  ].map(opt => (
                    <button key={opt.key} onClick={() => {
                      if (opt.key === 'full') setPayForm({ ...payForm, use_credit: true, split: false, amount: payModal.amount })
                      else if (opt.key === 'split') setPayForm({ ...payForm, split: true, use_credit: false, amount: payModal.amount, split_credit: Math.min(clientCredit, payModal.amount), split_cash: Math.max(0, payModal.amount - clientCredit) })
                      else setPayForm({ ...payForm, use_credit: false, split: false })
                    }} style={{
                      padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', border: 'none',
                      background: opt.active ? '#27500A' : 'white',
                      color: opt.active ? 'white' : '#27500A', fontWeight: '500'
                    }}>{opt.label}</button>
                  ))}
                </div>
                {payForm.split && (
                  <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Credit amount</label>
                      <input type="number" value={payForm.split_credit}
                        onChange={e => setPayForm({ ...payForm, split_credit: Number(e.target.value), split_cash: Math.max(0, payModal.amount - Number(e.target.value)) })}
                        style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #97C459', fontSize: '13px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Cash amount</label>
                      <input type="number" value={payForm.split_cash}
                        onChange={e => setPayForm({ ...payForm, split_cash: Number(e.target.value), split_credit: Math.max(0, payModal.amount - Number(e.target.value)) })}
                        style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {!payForm.use_credit && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>Mode of payment</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {MOP_OPTIONS.map(mop => (
                    <button key={mop} onClick={() => setPayForm({ ...payForm, mop, reference: '' })} style={{
                      padding: '7px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px',
                      border: payForm.mop === mop ? '2px solid #0f4c81' : '1px solid #ddd',
                      background: payForm.mop === mop ? '#E6F1FB' : 'white',
                      color: payForm.mop === mop ? '#0f4c81' : '#666',
                      fontWeight: payForm.mop === mop ? '500' : '400'
                    }}>{mop}</button>
                  ))}
                </div>
                {(payForm.mop === 'BDO' || payForm.mop === 'Union Bank') && !payForm.use_credit && (
                  <div style={{ marginTop: '8px' }}>
                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Reference number <span style={{ color: '#E24B4A' }}>*</span></label>
                    <input value={payForm.reference || ''} onChange={e => setPayForm({ ...payForm, reference: e.target.value })}
                      placeholder="Enter reference number..."
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: !payForm.reference ? '2px solid #EF9F27' : '1px solid #97C459', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                )}
              </div>
            )}

            <div style={{ background: '#EAF3DE', borderRadius: '8px', padding: '10px 14px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#27500A', fontWeight: '500' }}>Total due</span>
              <span style={{ color: '#27500A', fontWeight: '700', fontSize: '18px' }}>₱{Number(payModal.amount || 0).toLocaleString()}</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setPayModal(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={settlePayment} disabled={saving || !payForm.amount || ((payForm.mop === 'BDO' || payForm.mop === 'Union Bank') && !payForm.use_credit && !payForm.reference)} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#1D9E75', color: 'white', cursor: 'pointer', fontWeight: '500', opacity: (saving || !payForm.amount || ((payForm.mop === 'BDO' || payForm.mop === 'Union Bank') && !payForm.use_credit && !payForm.reference) || (payForm.session_type === 'Custom Amount' && !payForm.custom_notes)) ? 0.5 : 1 }}>
                {saving ? 'Saving...' : `Confirm ₱${Number(payForm.amount || 0).toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Loading outstanding sessions...</div>
      ) : unpaidSessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#1D9E75', background: '#EAF3DE', borderRadius: '12px' }}>
          All caught up — no outstanding balances!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {(() => {
            // Group by date
            const byDate = {}
            unpaidSessions.forEach(s => {
              const key = s.date || 'No date'
              if (!byDate[key]) byDate[key] = []
              byDate[key].push(s)
            })

            // Sort dates
            const parseDate = (dateStr) => {
              if (!dateStr) return new Date(0)
              const months = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 }
              const parts = dateStr.replace(',', '').split(' ')
              if (parts.length !== 3) return new Date(0)
              return new Date(parseInt(parts[2]), months[parts[0]], parseInt(parts[1]))
            }

            return Object.entries(byDate)
              .sort(([dateA], [dateB]) => parseDate(dateA) - parseDate(dateB))
              .map(([date, dateSessions]) => (
                <div key={date}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f4c81', marginBottom: '8px', padding: '4px 0', borderBottom: '2px solid #E6F1FB' }}>
                    {date}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {dateSessions.sort((a, b) => a.client_name.localeCompare(b.client_name)).map((s, i) => {
                      const client = clients.find(c => c.name === s.client_name)
                      return (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', background: 'white', border: '1px solid #F09595' }}>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '500', color: '#791F1F' }}>
                              {s.client_name}
                              {client?.credit_balance > 0 && (
                                <span style={{ marginLeft: '8px', fontSize: '11px', padding: '2px 6px', borderRadius: '8px', background: '#EAF3DE', color: '#27500A' }}>
                                  💳 ₱{Number(client.credit_balance).toLocaleString()} credit
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: '#999', marginTop: '3px' }}>
                              {s.time_start}–{s.time_end} · {s.therapist} · {s.status} · {s.session_type || 'Regular'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: '13px', fontWeight: '500', color: '#E24B4A' }}>₱{Number(s.amount || 0).toLocaleString()}</span>
                            <button onClick={() => openSettle(s)} style={{
                              padding: '5px 12px', borderRadius: '6px', border: 'none',
                              background: '#0f4c81', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '500'
                            }}>Settle</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
          })()}
        </div>
      )}
    </div>
  )
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState([])
  const [clients, setClients] = useState([])
  const [weeks, setWeeks] = useState([])
  const [selectedWeek, setSelectedWeek] = useState(null)
  const [weekSessions, setWeekSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterMop, setFilterMop] = useState('All')
  const [filterType, setFilterType] = useState('All')
  const [activeTab, setActiveTab] = useState('transactions')
  const [advanceModal, setAdvanceModal] = useState(false)
  const [advanceForm, setAdvanceForm] = useState({ client_name: '', amount: '', mop: 'Cash', reference: '' })
  const [ieReportModal, setIeReportModal] = useState(false)
  const [ieReportForm, setIeReportForm] = useState({ client_name: '', therapist: '' })  
  const [refundModal, setRefundModal] = useState(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedDay, setSelectedDay] = useState(() => {
    try {
      const nowPH = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
      return nowPH.toLocaleDateString('en-US', { weekday: 'long' })
    } catch {
      return 'All'
    }
  })
  const [pendingPayments, setPendingPayments] = useState([])
  const [processModal, setProcessModal] = useState(null)
  const [processForm, setProcessForm] = useState({ client_name: '', mop: 'BDO', amount: '', reference: '' })
  const [processSaving, setProcessSaving] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const [exportMonth, setExportMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [pRes, cRes, wRes] = await Promise.all([
      fetch('/api/payments'),
      fetch('/api/clients'),
      fetch('/api/weeks')
    ])
    const [pJson, cJson, wJson] = await Promise.all([pRes.json(), cRes.json(), wRes.json()])
    if (pJson.success) setPayments(pJson.data)
    if (cJson.success) setClients(cJson.data)
    if (wJson.success && wJson.data.length > 0) {
      setWeeks(wJson.data)
      const today = new Date()
      const monday = getMondayOf(today)
      const currentKey = getWeekKey(monday)
      const current = wJson.data.find(w => w.key === currentKey) || wJson.data[wJson.data.length - 1]
      setSelectedWeek(current)
      await fetchWeekSessions(current.key)
    }
    await fetchPendingPayments()
    setLoading(false)
  }

    function getMondayOf(date) {
    const d = new Date(date)
    const day = d.getDay()
    // If Sunday, go forward to next Monday instead of back to last Monday
    if (day === 0) {
      d.setDate(d.getDate() + 1)
    } else {
      d.setDate(d.getDate() - (day - 1))
    }
    return d
  }

  function getWeekKey(monday) {
    const y = monday.getFullYear()
    const m = String(monday.getMonth() + 1).padStart(2, '0')
    const d = String(monday.getDate()).padStart(2, '0')
    return `week_${y}_${m}_${d}`
  }

  async function fetchWeekSessions(weekKey) {
    const res = await fetch(`/api/sessions?week=${weekKey}`)
    const json = await res.json()
    if (json.success) setWeekSessions(json.data)
  }

  async function fetchPendingPayments() {
    const res = await fetch('/api/payments?action=pending')
    const json = await res.json()
    if (json.success) setPendingPayments(json.data)
  }

  async function openProcessModal(payment) {
    setProcessModal(payment)
    setProcessForm({ client_name: payment.client_name || '', mop: 'BDO', amount: '', reference: '' })
    setSelectedSession(null)
    if (payment.image_url) {
      setOcrLoading(true)
      try {
        const Tesseract = (await import('tesseract.js')).default
        const { data: { text } } = await Tesseract.recognize(payment.image_url, 'eng', { logger: () => {} })
        const amountMatch =
          text.match(/Transfer\s*[Aa]mount[\s\S]{0,20}?PHP\s*([\d,]+\.?\d*)/i) ||
          text.match(/Transfer\s*[Aa]mount[\s\n\r]+([\d,]+\.?\d*)/i) ||
          text.match(/Amount[\s\n\r]+PHP\s*([\d,]+\.?\d*)/i) ||
          text.match(/[-−]\s*[$₱£P]\s*([\d,]+\.?\d*)/) ||
          text.match(/[$₱£P]\s*([\d,]+\.?\d*)/) ||
          text.match(/PHP\s*([\d,]+\.?\d*)/i)
        const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null
        const refPatterns = [
          /Reference\s*ID\s+([A-Z0-9]+(?:\s+[A-Z0-9]+)*)/i,
          /Reference\s*No\.?\s+([A-Z0-9\-]+)/i,
          /Ref:\s*([A-Z0-9\-]+)/i,
          /Transaction\s*Ref\.?\s*[Nn]o\.?\s*[\n\r]+\s*([A-Z0-9\-]+)/i,
          /Reference\s*[Nn]umber\s*[\n\r]+\s*([A-Z0-9\-]+)/i,
          /Ref\s*No\.?\s+([0-9]{10,})/i,
          /IPS\s*Reference\s*[Nn]o\.?\s+[*]+([0-9]+)/i,
          /InstaPay\s*Reference\s*[Nn]umber\s*[\n\r]+\s*([0-9]+)/i,
          /InstaPay\s*Ref\.?\s*[Nn]o\.?\s+([0-9]+)/i,
          /Confirmation\s*[Nn]o\.?\s+([0-9]+)/i,
          /Transaction\s*Ref\.?\s*[Nn]o\.?\s+([0-9]+)/i,
          /(IPX-[A-Z0-9\-]+)/i,
          /(ENT[0-9]+)/i,
          /(PC-[A-Z0-9\-]+)/i,
          /(UB[0-9]{4,})/i,
        ]
        let reference = null
        for (const pattern of refPatterns) {
          const match = text.match(pattern)
          if (match) { reference = match[1].trim().replace(/\s+/g, ' '); break }
        }
        let mop = 'BDO'
        if (text.match(/0122\s*2\s*0+\s*2\s*8786|BDO\s*Unibank|012220028786/i)) mop = 'BDO'
        else if (text.match(/00231000\s*9113|0023\s*1000\s*9113|UnionBank|Union Bank/i)) mop = 'Union Bank'
        setProcessForm(prev => ({ ...prev, amount: amount || '', reference: reference || '', mop }))
      } catch (err) { console.error('OCR error:', err) }
      setOcrLoading(false)
    }
  }

  async function confirmProcess() {
    if (!processForm.client_name) return alert('Please select a client')
    if (!processForm.amount) return alert('Please enter an amount')
    setProcessSaving(true)

    const today = new Date().toLocaleDateString('en-US', {
      timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric'
    })
    await fetch('/api/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_credit',
        client_name: processForm.client_name,
        amount: Number(processForm.amount),
        mop: processForm.mop,
        date: today,
        reference: processForm.reference || ''
      })
    })

    await fetch('/api/payments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'process_pending', id: processModal.id })
    })

    setProcessModal(null)
    fetchAll()
    setProcessSaving(false)
  }

  async function switchWeek(week) {
    setSelectedWeek(week)
    setWeekSessions([])
    await fetchWeekSessions(week.key)
  }

  async function recordAdvance() {
    if (!advanceForm.client_name) return alert('Please select a client')
    if (!advanceForm.amount || Number(advanceForm.amount) <= 0) return alert('Please enter an amount')
    setSaving(true)
    const today = new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric' })
    await fetch('/api/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_credit',
        client_name: advanceForm.client_name,
        amount: Number(advanceForm.amount),
        mop: advanceForm.mop,
        date: today,
        reference: advanceForm.reference || ''
      })
    })
    setAdvanceModal(false)
    setAdvanceForm({ client_name: '', amount: '', mop: 'Cash', reference: '' })
    fetchAll()
    setSaving(false)
  }

  async function processRefund() {
    if (!refundAmount || Number(refundAmount) <= 0) return alert('Please enter a refund amount')
    const client = clients.find(c => c.name === refundModal.name)
    if (Number(refundAmount) > (client?.credit_balance || 0)) return alert('Refund amount exceeds credit balance')
    setSaving(true)
    await fetch('/api/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'refund', client_name: refundModal.name, amount: Number(refundAmount) })
    })
    setRefundModal(null)
    setRefundAmount('')
    fetchAll()
    setSaving(false)
  }

  function exportToExcel() {
    const [year, month] = exportMonth.split('-').map(Number)
    const monthName = new Date(year, month - 1).toLocaleString('en-PH', { month: 'long' })

    const monthPayments = payments.filter(p => {
      if (!p.date) return false
      const d = new Date(p.date)
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })

    if (monthPayments.length === 0) return alert(`No payments found for ${monthName} ${year}`)

    const rows = [
      ['Date', 'Client Name', 'Session Type', 'Amount (₱)', 'Mode of Payment', 'Type'],
      ...monthPayments.map(p => [
        p.date, p.client_name, p.session_type || 'Regular',
        Number(p.amount || 0), p.mop, p.payment_type === 'advance' ? 'Advance' : p.payment_type === 'refund' ? 'Refund' : 'Session'
      ])
    ]

    const totalRow = ['TOTAL', '', '', monthPayments.filter(p => p.payment_type !== 'refund').reduce((sum, p) => sum + Number(p.amount || 0), 0), '', '']
    rows.push([])
    rows.push(totalRow)

    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `PTC_Payments_${monthName}_${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

   function parsePaymentDate(dateStr) {
    if (!dateStr) return null
    const months = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 }
    const parts = dateStr.replace(',', '').split(' ')
    if (parts.length !== 3) return null
    const month = months[parts[0]]
    const day = parseInt(parts[1])
    const year = parseInt(parts[2])
    if (month === undefined || isNaN(day) || isNaN(year)) return null
    return new Date(year, month, day)
  }

  const nowPH = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))

  const todayPayments = payments.filter(p => {
    if (!p.date || ['refund', 'attendance', 'cancellation', 'credit_transfer'].includes(p.payment_type)) return false
    if (p.mop === 'Credit') return false  // ← add this
    const pDate = parsePaymentDate(p.date)
    if (!pDate) return false
    return pDate.getFullYear() === nowPH.getFullYear() &&
      pDate.getMonth() === nowPH.getMonth() &&
      pDate.getDate() === nowPH.getDate()
  })

  const todayRefunds = payments.filter(p => {
    if (!p.date || p.payment_type !== 'refund') return false
    const pDate = parsePaymentDate(p.date)
    if (!pDate) return false
    return pDate.getFullYear() === nowPH.getFullYear() &&
      pDate.getMonth() === nowPH.getMonth() &&
      pDate.getDate() === nowPH.getDate()
  })

  const todayTotal = todayPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    - todayRefunds.reduce((sum, p) => sum + Math.abs(Number(p.amount || 0)), 0)

  const weekPayments = payments.filter(p => {
    if (!selectedWeek) return false
    if (!p.date) return false
    if (['attendance', 'cancellation'].includes(p.payment_type)) return false
    if (p.mop === 'Credit') return false 
    const parts = selectedWeek.key.replace('week_', '').split('_')
    const monday = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`)
    monday.setDate(monday.getDate() - 1)
    const sunday = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`)
    sunday.setDate(sunday.getDate() + 6)
    const pDate = parsePaymentDate(p.date)
    if (!pDate) return false
    return pDate >= monday && pDate <= sunday
  })

  const dayPayments = selectedDay === 'All'
    ? weekPayments
    : weekPayments.filter(p => {
        const pDate = parsePaymentDate(p.date)
        if (!pDate) return false
        return pDate.toLocaleDateString('en-US', { weekday: 'long' }) === selectedDay
      })

  const dayTotal = dayPayments
  .filter(p => p.payment_type !== 'refund' && p.payment_type !== 'outstanding')
  .reduce((sum, p) => sum + Number(p.amount || 0), 0)
  - dayPayments
    .filter(p => p.payment_type === 'refund')
    .reduce((sum, p) => sum + Math.abs(Number(p.amount || 0)), 0)

  const dayRefunds = dayPayments.filter(p => p.payment_type === 'refund')
    .reduce((sum, p) => sum + Math.abs(Number(p.amount || 0)), 0)

  const dayMopTotals = MOP_OPTIONS.reduce((acc, mop) => {
    acc[mop] = dayPayments.filter(p => p.mop === mop && p.payment_type !== 'refund').reduce((sum, p) => sum + Number(p.amount || 0), 0)
    return acc
  }, {})

  const weekTotal = weekPayments
  .filter(p => p.payment_type !== 'refund' && p.payment_type !== 'outstanding')
  .reduce((sum, p) => sum + Number(p.amount || 0), 0)
  - weekPayments
    .filter(p => p.payment_type === 'refund')
    .reduce((sum, p) => sum + Math.abs(Number(p.amount || 0)), 0)

  const creditClients = clients.filter(c => c.credit_balance > 0)
  const totalCredits = creditClients.reduce((sum, c) => sum + Number(c.credit_balance || 0), 0)
  const unpaidSessions = weekSessions.filter(s => s.payment === 'Unpaid' && s.status !== 'Cancelled' && s.status !== 'Pencil')
  const outstandingClients = clients.filter(c => Number(c.outstanding_balance) >= 1)

  const mopTotals = MOP_OPTIONS.reduce((acc, mop) => {
    acc[mop] = weekPayments.filter(p => p.mop === mop && p.payment_type !== 'refund').reduce((sum, p) => sum + Number(p.amount || 0), 0)
    return acc
  }, {})

  const filtered = dayPayments.filter(p => {
    const matchSearch = !search || p.client_name?.toLowerCase().includes(search.toLowerCase())
    const matchMop = filterMop === 'All' || p.mop === filterMop
    const matchType = filterType === 'All' ||
      (filterType === 'Advance' && p.payment_type === 'advance') ||
      (filterType === 'Refund' && p.payment_type === 'refund') ||
      (filterType === 'Session' && p.payment_type === 'session') ||
      (filterType === 'Document' && p.payment_type === 'document')
    return matchSearch && matchMop && matchType && 
    !['attendance', 'cancellation'].includes(p.payment_type)
  }).sort((a, b) => Number(b.id) - Number(a.id))

  const tabs = [
    { key: 'transactions', label: 'Transactions' },
    { key: 'credits', label: 'Credits' },
    { key: 'outstanding', label: `Outstanding (${outstandingClients.length})` },
    { key: 'pending', label: `Pending Payments${pendingPayments.filter(p => p.status === 'pending').length > 0 ? ` (${pendingPayments.filter(p => p.status === 'pending').length})` : ''}` },
  ]

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ color: '#0f4c81', margin: '0 0 4px' }}>Payments</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>{selectedWeek?.label}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={selectedWeek?.key || ''} onChange={e => {
            const w = weeks.find(x => x.key === e.target.value)
            if (w) switchWeek(w)
          }} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', cursor: 'pointer' }}>
            {weeks.map(w => <option key={w.key} value={w.key}>{w.label}</option>)}
          </select>
          <button onClick={() => setAdvanceModal(true)} style={{
            padding: '9px 16px', borderRadius: '8px', border: '1px solid #1D9E75',
            cursor: 'pointer', fontSize: '13px', background: '#EAF3DE', color: '#27500A', fontWeight: '500'
          }}>+ Advance / Partial Payment</button>
          <button onClick={() => setIeReportModal(true)} style={{
            background: 'white', border: '1px solid #0f4c81', color: '#0f4c81',
            padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500'
          }}>+ Submitted IE Report by Therapist</button>

        </div>
      </div>

      {/* Export section */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', color: '#666', fontWeight: '500' }}>Export payments:</span>
        <input type="month" value={exportMonth} onChange={e => setExportMonth(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }} />
        <button onClick={async () => {
          const res = await fetch(`/api/export?month=${exportMonth}`)
          if (!res.ok) { alert('Export failed'); return }
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          const [year, month] = exportMonth.split('-')
          const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('en-PH', { month: 'long' })
          a.href = url
          a.download = `PTC_Payments_${monthName}_${year}.xlsx`
          a.click()
          URL.revokeObjectURL(url)
        }} style={{
          padding: '8px 16px', borderRadius: '8px', border: '1px solid #0f4c81',
          cursor: 'pointer', fontSize: '13px', background: '#E6F1FB', color: '#0f4c81', fontWeight: '500'
        }}>⬇ Export Excel</button>
      </div>

      {/* Advance payment modal */}
      {advanceModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '400px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 0.5rem', color: '#0f4c81' }}>Record advance / partial payment</h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '13px', color: '#999' }}>Stored as credit — not tied to a specific session.</p>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Client</label>
              <select value={advanceForm.client_name} onChange={e => setAdvanceForm({ ...advanceForm, client_name: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}>
                <option value="">Select client...</option>
                {clients.filter(c => c.status !== 'inactive').sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Amount (₱)</label>
              <input type="number" value={advanceForm.amount} onChange={e => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                placeholder="Enter amount..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '16px', fontWeight: '500', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>Mode of payment</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {MOP_OPTIONS.map(mop => (
                  <button key={mop} onClick={() => setAdvanceForm({ ...advanceForm, mop })} style={{
                    padding: '7px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px',
                    border: advanceForm.mop === mop ? '2px solid #0f4c81' : '1px solid #ddd',
                    background: advanceForm.mop === mop ? '#E6F1FB' : 'white',
                    color: advanceForm.mop === mop ? '#0f4c81' : '#666',
                    fontWeight: advanceForm.mop === mop ? '500' : '400'
                  }}>{mop}</button>
                ))}
              </div>
                {(advanceForm.mop === 'BDO' || advanceForm.mop === 'Union Bank') && (
                  <div style={{ marginTop: '8px' }}>
                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Reference number <span style={{ color: '#E24B4A' }}>*</span></label>
                    <input value={advanceForm.reference || ''} onChange={e => setAdvanceForm({ ...advanceForm, reference: e.target.value })}
                      placeholder="Enter reference number..."
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: !advanceForm.reference ? '2px solid #EF9F27' : '1px solid #97C459', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                )}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={recordAdvance} disabled={saving || !advanceForm.amount || ((advanceForm.mop === 'BDO' || advanceForm.mop === 'Union Bank') && !advanceForm.reference)} style={{
                padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#1D9E75', color: 'white', cursor: 'pointer', fontWeight: '500',
                opacity: (saving || !advanceForm.amount || ((advanceForm.mop === 'BDO' || advanceForm.mop === 'Union Bank') && !advanceForm.reference)) ? 0.5 : 1
              }}>
                {saving ? 'Saving...' : `Record ₱${Number(advanceForm.amount || 0).toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IE Report modal */}
      {ieReportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '400px', maxWidth: '90vw' }}>
        <h3 style={{ margin: '0 0 1rem', color: '#0f4c81' }}>Record IE Report</h3>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '1rem' }}>Records therapist's IE report submission. No payment from parent — therapist receives remaining IE fee.</p>
        <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Client</label>
        <input value={ieReportForm.client_name} onChange={e => setIeReportForm({ ...ieReportForm, client_name: e.target.value })}
        list="ie-client-list" placeholder="Type or select client..."
        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />
        <datalist id="ie-client-list">
        {clients.map(c => <option key={c.id} value={c.name} />)}
        </datalist>
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Therapist</label>
        <input value={ieReportForm.therapist} onChange={e => setIeReportForm({ ...ieReportForm, therapist: e.target.value })}
        list="ie-therapist-list" placeholder="Type or select therapist..."
        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />
        <datalist id="ie-therapist-list">
        {[...new Set(clients.flatMap(c => (c.schedule || '').split(';').map(s => s.split('|')[0]).filter(Boolean)))].sort().map(t => <option key={t} value={t} />)}
        </datalist>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button onClick={() => { setIeReportModal(false); setIeReportForm({ client_name: '', therapist: '' }) }}
        style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}>Cancel</button>
        <button onClick={async () => {
        if (!ieReportForm.client_name || !ieReportForm.therapist) return alert('Please fill in all fields')
        const today = new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric' })
        await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        action: 'log',
        client_name: ieReportForm.client_name,
        therapist: ieReportForm.therapist,
        session_id: `IE-REPORT-${Date.now()}`,
        amount: 0,
        mop: 'N/A',
        session_type: 'IE REPORT',
        date: today,
        payment_type: 'ie_report',
        reference: ''
        })
        })
        setIeReportModal(false)
        setIeReportForm({ client_name: '', therapist: '' })
        fetchAll()
        }} disabled={!ieReportForm.client_name || !ieReportForm.therapist}
        style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0f4c81', color: 'white', cursor: 'pointer', fontWeight: '500' }}>
        Record IE Report
        </button>
        </div>
        </div>
        </div>
        )}

      {/* Refund modal */}
      {refundModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '380px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 0.5rem', color: '#0f4c81' }}>Process refund</h3>
            <p style={{ margin: '0 0 0.5rem', fontSize: '14px', color: '#333' }}>{refundModal.name}</p>
            <p style={{ margin: '0 0 0.75rem', fontSize: '13px', color: '#999' }}>
              Available credit: ₱{Number(refundModal.credit_balance || 0).toLocaleString()}
            </p>
            <div style={{ marginBottom: '1rem', padding: '10px 12px', background: '#FAEEDA', border: '1px solid #EF9F27', borderRadius: '8px', fontSize: '12px', color: '#633806' }}>
              ⚠️ This should only be used to refund <strong>advance/credit payments</strong> not tied to a specific session. If a client paid for a session and wants an immediate refund, use the <strong>✕ button on the Schedule page</strong> to reverse and delete the session instead.
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Refund amount (₱)</label>
              <input type="number" value={refundAmount} onChange={e => setRefundAmount(e.target.value)}
                placeholder="Enter amount to refund..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '16px', fontWeight: '500', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setRefundModal(null); setRefundAmount('') }} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={processRefund} disabled={saving} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#E24B4A', color: 'white', cursor: 'pointer', fontWeight: '500' }}>
                {saving ? 'Processing...' : `Refund ₱${Number(refundAmount || 0).toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Loading...</div>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '1.5rem' }}>
            {[
              { label: selectedDay === 'All' ? 'This week collections' : `${selectedDay} collections`, value: `₱${dayTotal.toLocaleString()}`, sub: `${dayPayments.filter(p => p.payment_type !== 'refund').length} payments`, color: '#fcc200' },
              { label: 'This week collected', value: `₱${weekTotal.toLocaleString()}`, sub: `${weekPayments.filter(p => p.payment_type !== 'refund').length} payments`, color: '#1D9E75' },
              { label: 'Credits held', value: `₱${totalCredits.toLocaleString()}`, sub: `${creditClients.length} clients`, color: '#0f4c81' },
              { label: 'Unpaid this week', value: unpaidSessions.length, sub: 'sessions', color: '#E24B4A' },
              { label: 'Outstanding', value: outstandingClients.length, sub: 'clients with balance', color: '#EF9F27' },
            ].map((card, i) => (
              <div key={i} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1.25rem', borderTop: `4px solid ${card.color}` }}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '6px' }}>{card.label}</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f4c81' }}>{card.value}</div>
                <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', padding: '4px', background: '#f0f0f0', borderRadius: '10px', width: 'fit-content' }}>
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: '500', transition: 'all 0.15s',
                background: activeTab === tab.key ? 'white' : 'transparent',
                color: activeTab === tab.key ? '#0f4c81' : '#666',
                boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}>{tab.label}</button>
            ))}
          </div>

          {/* Transactions tab */}
          {activeTab === 'transactions' && (
            <div>
              {/* Day filter */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {['All', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                  <button key={day} onClick={() => setSelectedDay(day)} style={{
                    padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px',
                    background: selectedDay === day ? '#0f4c81' : '#f0f0f0',
                    color: selectedDay === day ? 'white' : '#666', fontWeight: selectedDay === day ? '500' : '400'
                  }}>{day}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <input placeholder="Search client..." value={search} onChange={e => setSearch(e.target.value)}
                  style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', width: '180px' }} />
                {['All', 'Session', 'Document','Advance', 'Refund'].map(f => (
                  <button key={f} onClick={() => setFilterType(f)} style={{
                    padding: '7px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px',
                    background: filterType === f ? '#0f4c81' : '#f0f0f0',
                    color: filterType === f ? 'white' : '#666'
                  }}>{f}</button>
                ))}
                {['All', ...MOP_OPTIONS].map(m => (
                  <button key={m} onClick={() => setFilterMop(m)} style={{
                    padding: '7px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px',
                    background: filterMop === m ? '#185FA5' : '#f0f0f0',
                    color: filterMop === m ? 'white' : '#666'
                  }}>{m}</button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {Object.entries(dayMopTotals).map(([mop, total]) => total > 0 && (
                  <div key={mop} style={{ padding: '6px 14px', borderRadius: '8px', background: '#E6F1FB', border: '1px solid #B5D4F4' }}>
                    <span style={{ fontSize: '12px', color: '#0C447C', fontWeight: '500' }}>{mop}: </span>
                    <span style={{ fontSize: '12px', color: '#0C447C' }}>₱{total.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      {['Client', 'Therapist', 'Session type', 'Amount', 'MOP', 'Date', 'Type', 'Verified by'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#666', fontWeight: '500', borderBottom: '1px solid #e0e0e0', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No payments found</td></tr>
                    ) : filtered.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f0f0f0', background: p.payment_type === 'refund' ? '#FFF5F5' : p.payment_type === 'advance' ? '#FAFFF8' : 'white' }}>
                        <td style={{ padding: '10px 16px', fontWeight: '500', color: '#0f4c81' }}>{p.client_name}</td>
                        <td style={{ padding: '10px 16px', color: '#666' }}>{p.therapist || '—'}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <select
                            value={p.session_type || ''}
                            onChange={async e => {
                              await fetch('/api/payments', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'update_session_type', id: p.id, session_type: e.target.value })
                              })
                              fetchAll()
                            }}
                            style={{ fontSize: '11px', padding: '3px 6px', borderRadius: '6px', border: '1px solid #B5D4F4', cursor: 'pointer', background: '#E6F1FB', color: '#0C447C' }}>
                            <option value="">— select —</option>
                            {['OT SESSION','OT-IE','OT-FE','SPECIALIZED OT TX','ST SESSION','ST-IE','ST-FE','SPECIALIZED ST TX','PT SESSION','PT-IE','PT FE','SPED SESSION','SPED IE','SPED FE','PLAYSCHOOL','PR','PR-RUSHED','IE REPORT','Cancellation Fee'].map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '10px 16px', fontWeight: '500', color: p.payment_type === 'refund' ? '#E24B4A' : '#1D9E75' }}>
                          {p.payment_type === 'refund' ? '-' : ''}₱{Math.abs(Number(p.amount || 0)).toLocaleString()}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#E6F1FB', color: '#0C447C' }}>{p.mop}</span>
                        </td>
                        <td style={{ padding: '10px 16px', color: '#999', fontSize: '12px', whiteSpace: 'nowrap' }}>{p.date}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                            background: p.payment_type === 'refund' ? '#FCEBEB' : p.payment_type === 'advance' ? '#EAF3DE' : '#f0f0f0',
                            color: p.payment_type === 'refund' ? '#791F1F' : p.payment_type === 'advance' ? '#27500A' : '#666'
                          }}>{p.payment_type === 'advance' ? 'Advance' : p.payment_type === 'refund' ? 'Refund' : p.payment_type === 'document' ? 'Document' : 'Session'}</span>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <select
                            value={p.verified_by || ''}
                            onChange={async e => {
                              await fetch('/api/payments', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'verify', id: p.id, verified_by: e.target.value })
                              })
                              fetchAll()
                            }}
                            style={{ fontSize: '11px', padding: '3px 6px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: p.verified_by ? '#EAF3DE' : 'white', color: p.verified_by ? '#27500A' : '#999' }}>
                            <option value="">— unverified</option>
                            {VERIFIERS.map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Credits tab */}
          {activeTab === 'credits' && (
            <div>
              {creditClients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#999', background: '#f8f9fa', borderRadius: '12px' }}>
                  No clients with credit balance
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                  {creditClients.sort((a, b) => b.credit_balance - a.credit_balance).map((c, i) => (
                    <div key={i} style={{ background: 'white', borderRadius: '12px', border: '1px solid #97C459', padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ fontWeight: '500', color: '#0f4c81', fontSize: '14px' }}>{c.name}</div>
                        <div style={{ fontWeight: '700', color: '#1D9E75', fontSize: '18px' }}>₱{Number(c.credit_balance).toLocaleString()}</div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#999', marginBottom: '10px' }}>Available credit</div>
                      <button onClick={() => setRefundModal(c)} style={{
                        width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #E24B4A',
                        background: '#fff5f5', color: '#E24B4A', cursor: 'pointer', fontSize: '12px', fontWeight: '500'
                      }}>Process refund</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Outstanding tab */}
          {activeTab === 'outstanding' && (
            <OutstandingTab clients={clients} onSettle={fetchAll} />
          )}

          {/* Process payment modal */}
          {processModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '560px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
                <h3 style={{ margin: '0 0 1rem', color: '#0f4c81' }}>Process payment screenshot</h3>
                {processModal.image_url && (
                  <div style={{ marginBottom: '1rem' }}>
                    <img src={processModal.image_url} alt="Payment screenshot"
                      style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e0e0e0' }} />
                  </div>
                )}
                {ocrLoading && (
                  <div style={{ marginBottom: '1rem', padding: '10px 14px', background: '#E6F1FB', borderRadius: '8px', fontSize: '13px', color: '#0C447C' }}>
                    ⏳ Reading payment details from screenshot...
                  </div>
                )}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Client</label>
                  <select value={processForm.client_name} onChange={e => setProcessForm({ ...processForm, client_name: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}>
                    <option value="">Select client...</option>
                    {clients.sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Amount (₱)</label>
                  <input type="number" value={processForm.amount} onChange={e => setProcessForm({ ...processForm, amount: e.target.value })}
                    placeholder="Enter amount..."
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '16px', fontWeight: '500', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>Mode of payment</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {MOP_OPTIONS.map(mop => (
                      <button key={mop} onClick={() => setProcessForm({ ...processForm, mop })} style={{
                        padding: '7px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px',
                        border: processForm.mop === mop ? '2px solid #0f4c81' : '1px solid #ddd',
                        background: processForm.mop === mop ? '#E6F1FB' : 'white',
                        color: processForm.mop === mop ? '#0f4c81' : '#666',
                        fontWeight: processForm.mop === mop ? '500' : '400'
                      }}>{mop}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Reference number</label>
                  <input value={processForm.reference} onChange={e => setProcessForm({ ...processForm, reference: e.target.value })}
                    placeholder="Enter reference number..."
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setProcessModal(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}>Cancel</button>
                  <button onClick={confirmProcess} 
                    disabled={processSaving || !processForm.client_name || !processForm.amount}
                    style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#1D9E75', color: 'white', cursor: 'pointer', fontWeight: '500',
                    opacity: processSaving || !processForm.client_name || !processForm.amount ? 0.5 : 1 }}>
                    {processSaving ? 'Processing...' : `Record ₱${Number(processForm.amount || 0).toLocaleString()} as credit`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pending Payments tab */}
          {activeTab === 'pending' && (
            <div>
              {pendingPayments.filter(p => p.status === 'pending').length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#999', background: '#f8f9fa', borderRadius: '12px' }}>
                  No pending payment screenshots — they'll appear here when clients send them via Messenger.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pendingPayments.filter(p => p.status === 'pending').map((p, i) => (
                    <div key={i} style={{ background: 'white', borderRadius: '12px', border: '1px solid #EF9F27', overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAEEDA' }}>
                        <div>
                          <span style={{ fontWeight: '600', color: '#633806', fontSize: '14px' }}>
                            {p.client_name || '❓ Unknown client'}
                          </span>
                          <span style={{ marginLeft: '8px', fontSize: '11px', color: '#633806', opacity: 0.7 }}>received {p.received_at}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={async () => {
                            if (!confirm('Dismiss this screenshot?')) return
                            await fetch('/api/payments', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'process_pending', id: p.id })
                            })
                            fetchPendingPayments()
                          }} style={{
                            padding: '6px 14px', borderRadius: '6px', border: '1px solid #ddd',
                            background: 'white', color: '#666', cursor: 'pointer', fontSize: '12px'
                          }}>Dismiss</button>
                          <button onClick={() => openProcessModal(p)} style={{
                            padding: '6px 16px', borderRadius: '6px', border: 'none',
                            background: '#0f4c81', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '500'
                          }}>Process</button>
                        </div>
                      {p.image_url && (
                        <div style={{ padding: '12px 16px' }}>
                          <img src={p.image_url} alt="Payment screenshot"
                            style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #e0e0e0', cursor: 'pointer' }}
                            onClick={() => window.open(p.image_url, '_blank')} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}