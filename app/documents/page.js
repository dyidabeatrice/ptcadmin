'use client'
import { useState, useEffect } from 'react'

const DOC_TYPES = [
  { value: 'Initial Evaluation', label: 'Initial Evaluation', info: 'Reprint only — no fee', amount: 0, custom: false },
  { value: 'Progress Report - Regular', label: 'Progress Report (Regular)', info: 'Minimum 2 weeks processing', amount: 0, custom: true },
  { value: 'Progress Report - Rushed', label: 'Progress Report (Rushed)', info: '1–2 weeks processing', amount: 0, custom: true },
  { value: 'Endorsement Notes', label: 'Endorsement Notes', info: 'Custom amount', amount: 0, custom: true },
  { value: 'Home Program', label: 'Home Program', info: 'Custom amount', amount: 0, custom: true },
]

function getStatusColor(status) {
  if (status === 'Outstanding') return { bg: '#FAEEDA', border: '#EF9F27', color: '#633806' }
  if (status === 'Ready for Release') return { bg: '#EAF3DE', border: '#97C459', color: '#27500A' }
  if (status === 'Completed') return { bg: '#E6F1FB', border: '#B5D4F4', color: '#0C447C' }
  return { bg: '#f8f9fa', border: '#e0e0e0', color: '#666' }
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const deadline = new Date(dateStr)
  const today = new Date()
  today.setHours(0,0,0,0)
  deadline.setHours(0,0,0,0)
  return Math.ceil((deadline - today) / (1000 * 60 * 60 * 24))
}

export default function DocumentsPage() {
  const [reports, setReports] = useState([])
  const [clients, setClients] = useState([])
  const [therapists, setTherapists] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [payModal, setPayModal] = useState(null)
  const [payForm, setPayForm] = useState({ amount: 0, mop: 'Cash', use_credit: false, split: false, split_credit: 0, split_cash: 0, reference: '' })
  const [clientCredit, setClientCredit] = useState(0)
  const [filterStatus, setFilterStatus] = useState('All')

  const [form, setForm] = useState({
    client_name: '', therapist: '', therapist_email: '',
    email: '', deadline: '', doc_type: '', amount: 0,
    notes: '', sub_type: ''
  })
  const [showSummary, setShowSummary] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [rRes, cRes, tRes] = await Promise.all([
      fetch('/api/documents'),
      fetch('/api/clients'),
      fetch('/api/therapists')
    ])
    const [rJson, cJson, tJson] = await Promise.all([rRes.json(), cRes.json(), tRes.json()])
    if (rJson.success) setReports(rJson.data)
    if (cJson.success) setClients(cJson.data.filter(c => c.status !== 'inactive'))
    if (tJson.success) setTherapists(tJson.data)
    setLoading(false)
  }

  function getClientTherapists(clientName) {
    const client = clients.find(c => c.name === clientName)
    if (!client || !client.schedule) return []
    return [...new Set(client.schedule.split(';').map(s => s.split('|')[0]).filter(Boolean))]
  }

  function getTherapistEmail(therapistName) {
    const t = therapists.find(x => x.name === therapistName)
    console.log('Looking for:', therapistName, 'Found:', t, 'Email:', t?.email)
    return t?.email || ''
  }

  function handleClientChange(clientName) {
    const clientTherapists = getClientTherapists(clientName)
    const firstTherapist = clientTherapists[0] || ''
    setForm({
      ...form,
      client_name: clientName,
      therapist: firstTherapist,
      therapist_email: getTherapistEmail(firstTherapist)
    })
  }

  function handleDocTypeChange(docType) {
    const dt = DOC_TYPES.find(d => d.value === docType)
    setForm({ ...form, doc_type: docType, amount: dt?.amount || 0 })
  }

  function validateForm() {
    if (!form.client_name) return 'Please select a client'
    if (!form.therapist) return 'Please select a therapist'
    if (!form.doc_type) return 'Please select a document type'
    if (!form.deadline) return 'Please set a deadline date'
    return null
  }

  async function submitRequest() {
    setSaving(true)
    await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', ...form })
    })
    setShowForm(false)
    setShowSummary(false)
    setForm({ client_name: '', therapist: '', therapist_email: '', email: '', deadline: '', doc_type: '', amount: 0, notes: '', sub_type: '' })
    fetchAll()
    setSaving(false)
  }

  async function updateStatus(report, status) {
    await fetch('/api/documents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status', index: report.index, status })
    })
    fetchAll()
  }

    async function settlePayment() {
    const mop = payForm.use_credit ? 'Credit' : payForm.split ? 'Split' : payForm.mop
    const today = new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric' })

    await fetch('/api/documents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pay', index: payModal.index, client_name: payModal.client_name, amount: payForm.amount || payModal.amount, mop })
    })

    await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'log',
        client_name: payModal.client_name,
        therapist: payModal.therapist,
        session_id: `DOC-${payModal.id}`,
        amount: payForm.amount || payModal.amount,
        mop,
        session_type: payModal.doc_type,
        date: today,
        payment_type: 'document'
      })
    })

    if (payForm.use_credit || payForm.split) {
      const creditAmount = payForm.split ? payForm.split_credit : payForm.amount || payModal.amount
      await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply_credit', client_name: payModal.client_name, amount: creditAmount, credit_balance: clientCredit })
      })
    }

    setPayModal(null)
    setPayForm({ amount: 0, mop: 'Cash', use_credit: false, split: false, split_credit: 0, split_cash: 0, reference: '' })
    fetchAll()
  }

  async function deleteReport(report) {
    if (!confirm(`Delete document request for ${report.client_name}?`)) return
    await fetch('/api/documents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index: report.index })
    })
    fetchAll()
  }

  const selectedDocType = DOC_TYPES.find(d => d.value === form.doc_type)
  const clientTherapists = getClientTherapists(form.client_name)

  const filtered = reports
    .filter(r => filterStatus === 'All' || r.status === filterStatus)
    .sort((a, b) => {
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return new Date(a.deadline) - new Date(b.deadline)
    })

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ color: '#0f4c81', margin: '0 0 4px' }}>Documents</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>Track document requests and deadlines</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{
          background: '#0f4c81', color: 'white', border: 'none',
          padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500'
        }}>+ New request</button>
      </div>

      {/* Pay modal */}
            {payModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '420px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 1rem', color: '#0f4c81' }}>Record payment</h3>
            <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '10px 12px', marginBottom: '1rem' }}>
              <div style={{ fontWeight: '500', color: '#0f4c81' }}>{payModal.client_name}</div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{payModal.doc_type}</div>
              {clientCredit > 0 && <div style={{ marginTop: '6px', fontSize: '12px', color: '#27500A', background: '#EAF3DE', padding: '4px 8px', borderRadius: '6px', display: 'inline-block' }}>💳 Credit: ₱{clientCredit.toLocaleString()}</div>}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Amount (₱)</label>
              <input type="number" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: Number(e.target.value), split_cash: Number(e.target.value) })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '16px', fontWeight: '500', boxSizing: 'border-box' }} />
            </div>
            {clientCredit > 0 && (
              <div style={{ marginBottom: '12px', padding: '10px 12px', background: '#EAF3DE', borderRadius: '8px', border: '1px solid #97C459' }}>
                <div style={{ fontSize: '12px', fontWeight: '500', color: '#27500A', marginBottom: '8px' }}>Client has ₱{clientCredit.toLocaleString()} credit</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    ...(clientCredit >= payForm.amount ? [{ key: 'full', label: 'Use full credit', active: payForm.use_credit && !payForm.split }] : []),
                    { key: 'split', label: 'Split payment', active: payForm.split },
                    { key: 'normal', label: 'Pay normally', active: !payForm.use_credit && !payForm.split },
                  ].map(opt => (
                    <button key={opt.key} onClick={() => {
                      if (opt.key === 'full') setPayForm({ ...payForm, use_credit: true, split: false, mop: 'Credit' })
                      else if (opt.key === 'split') setPayForm({ ...payForm, split: true, use_credit: false, split_credit: Math.min(clientCredit, payForm.amount), split_cash: Math.max(0, payForm.amount - clientCredit) })
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
                        onChange={e => setPayForm({ ...payForm, split_credit: Number(e.target.value), split_cash: Math.max(0, payForm.amount - Number(e.target.value)) })}
                        style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #97C459', fontSize: '13px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Cash amount</label>
                      <input type="number" value={payForm.split_cash}
                        onChange={e => setPayForm({ ...payForm, split_cash: Number(e.target.value), split_credit: Math.max(0, payForm.amount - Number(e.target.value)) })}
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
                  {['Cash', 'BDO', 'Union Bank'].map(mop => (
                    <button key={mop} onClick={() => setPayForm({ ...payForm, mop, reference: '' })} style={{
                      padding: '7px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px',
                      border: payForm.mop === mop ? '2px solid #0f4c81' : '1px solid #ddd',
                      background: payForm.mop === mop ? '#E6F1FB' : 'white',
                      color: payForm.mop === mop ? '#0f4c81' : '#666',
                      fontWeight: payForm.mop === mop ? '500' : '400'
                    }}>{mop}</button>
                  ))}
                </div>
                {(payForm.mop === 'BDO' || payForm.mop === 'Union Bank') && (
                  <div style={{ marginTop: '8px' }}>
                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Reference number <span style={{ color: '#E24B4A' }}>*</span></label>
                    <input value={payForm.reference || ''} onChange={e => setPayForm({ ...payForm, reference: e.target.value })}
                      placeholder="Enter reference number..."
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: !payForm.reference ? '2px solid #EF9F27' : '1px solid #97C459', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setPayModal(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={settlePayment} disabled={saving || !payForm.amount || ((payForm.mop === 'BDO' || payForm.mop === 'Union Bank') && !payForm.use_credit && !payForm.reference)} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#1D9E75', color: 'white', cursor: 'pointer', fontWeight: '500' }}>
                Confirm ₱{Number(payForm.amount || 0).toLocaleString()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New request form */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '520px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>

            {!showSummary ? (
              <>
                <h3 style={{ margin: '0 0 1.5rem', color: '#0f4c81' }}>New document request</h3>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Client <span style={{ color: '#E24B4A' }}>*</span></label>
                  <input value={form.client_name} onChange={e => handleClientChange(e.target.value)}
                    list="doc-client-list" placeholder="Type or select client..."
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: !form.client_name ? '1px solid #ddd' : '1px solid #97C459', fontSize: '14px', boxSizing: 'border-box' }} />
                  <datalist id="doc-client-list">
                    {clients.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Therapist <span style={{ color: '#E24B4A' }}>*</span></label>
                  <select value={form.therapist}
                    onChange={e => setForm({ ...form, therapist: e.target.value, therapist_email: getTherapistEmail(e.target.value) })}
                    disabled={!form.client_name}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', opacity: !form.client_name ? 0.5 : 1 }}>
                    <option value="">Select therapist...</option>
                    {clientTherapists.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Parent email (optional)</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="parent@email.com"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Document type <span style={{ color: '#E24B4A' }}>*</span></label>
                  <select value={form.doc_type} onChange={e => handleDocTypeChange(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}>
                    <option value="">Select type...</option>
                    {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                  {selectedDocType && (
                    <div style={{ marginTop: '6px', fontSize: '12px', padding: '6px 10px', borderRadius: '6px', background: '#E6F1FB', color: '#0C447C' }}>
                      ℹ️ {selectedDocType.info}
                      {selectedDocType.amount > 0 && ` — ₱${selectedDocType.amount.toLocaleString()}`}
                    </div>
                  )}
                </div>

                {selectedDocType?.custom && (
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Amount (₱)</label>
                    <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })}
                      placeholder="Enter amount..."
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fcc200', fontSize: '16px', fontWeight: '500', boxSizing: 'border-box' }} />
                  </div>
                )}

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>
                    Date needed
                  </label>
                  <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: !form.deadline ? '2px solid #EF9F27' : '1px solid #97C459', fontSize: '14px', boxSizing: 'border-box' }} />
                  {!form.deadline && (
                    <div style={{ marginTop: '6px', fontSize: '12px', color: '#633806' }}>⚠️ Please set a deadline date</div>
                  )}
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Notes (optional)</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="Any additional instructions..."
                    rows={3}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }} />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}>Cancel</button>
                  <button onClick={() => {
                    const err = validateForm()
                    if (err) return alert(err)
                    setShowSummary(true)
                  }} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0f4c81', color: 'white', cursor: 'pointer', fontWeight: '500' }}>
                    Review request →
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ margin: '0 0 1.5rem', color: '#0f4c81' }}>Confirm request</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem' }}>
                  {[
                    { label: 'Client', value: form.client_name },
                    { label: 'Therapist', value: form.therapist },
                    { label: 'Document type', value: form.doc_type },
                    { label: 'Date needed', value: form.deadline },
                    { label: 'Amount', value: form.amount > 0 ? `₱${Number(form.amount).toLocaleString()}` : 'No fee' },
                    { label: 'Parent email', value: form.email || '—' },
                    { label: 'Notes', value: form.notes || '—' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '6px', background: i % 2 === 0 ? '#f8f9fa' : 'white', border: '1px solid #e0e0e0' }}>
                      <span style={{ fontSize: '13px', color: '#666' }}>{item.label}</span>
                      <span style={{ fontSize: '13px', fontWeight: '500', color: '#0f4c81' }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                {form.doc_type !== 'Initial Evaluation' && (
                  <div style={{ marginBottom: '1.5rem', padding: '10px 12px', background: '#E6F1FB', borderRadius: '8px', fontSize: '13px', color: '#0C447C' }}>
                    📧 An email will be sent to {form.therapist} at {getTherapistEmail(form.therapist) || 'no email on file'}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowSummary(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}>← Edit</button>
                  <button onClick={submitRequest} disabled={saving} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#1D9E75', color: 'white', cursor: 'pointer', fontWeight: '500' }}>
                    {saving ? 'Submitting...' : 'Submit request'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['All', 'Outstanding', 'Ready for Release', 'Completed'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: '7px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500',
            background: filterStatus === s ? '#0f4c81' : '#f0f0f0',
            color: filterStatus === s ? 'white' : '#666'
          }}>{s}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999', background: '#f8f9fa', borderRadius: '12px' }}>
          No document requests yet
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['Client', 'Document type', 'Therapist', 'Email', 'Requested', 'Deadline', 'Amount', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#666', fontWeight: '500', borderBottom: '1px solid #e0e0e0', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const sc = getStatusColor(r.status)
                const days = daysUntil(r.deadline)
                const isUrgent = days !== null && days <= 2 && r.status === 'Outstanding'
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0', background: isUrgent ? '#FFF5F5' : 'white' }}>
                    <td style={{ padding: '10px 16px', fontWeight: '500', color: '#0f4c81' }}>
                      {r.client_name}
                      {isUrgent && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#E24B4A' }}>⚠️ Urgent</span>}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#333' }}>{r.doc_type}</td>
                    <td style={{ padding: '10px 16px', color: '#666' }}>{r.therapist}</td>
                    <td style={{ padding: '10px 16px', color: '#666', fontSize: '12px' }}>{r.email || '—'}</td>
                    <td style={{ padding: '10px 16px', color: '#999', fontSize: '12px' }}>{r.request_date}</td>
                    <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ color: isUrgent ? '#E24B4A' : '#333', fontWeight: isUrgent ? '500' : '400' }}>{r.deadline}</span>
                      {days !== null && r.status === 'Outstanding' && (
                        <div style={{ fontSize: '11px', color: days <= 2 ? '#E24B4A' : days <= 7 ? '#EF9F27' : '#999' }}>
                          {days === 0 ? 'Due today!' : days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', fontWeight: '500', color: r.amount > 0 ? '#1D9E75' : '#999' }}>
                      {r.amount > 0 ? `₱${Number(r.amount).toLocaleString()}` : 'No fee'}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <button onClick={async () => {
                        if (r.status === 'Outstanding') {
                        if (r.amount > 0) {
                          setPayModal(r)
                          setPayForm({ amount: r.amount, mop: 'Cash', use_credit: false, split: false, split_credit: 0, split_cash: r.amount })
                          const cRes = await fetch(`/api/credits?client=${encodeURIComponent(r.client_name)}`)
                          const cJson = await cRes.json()
                          if (cJson.success) setClientCredit(cJson.credit_balance || 0)
                        }
                          else updateStatus(r, 'Ready for Release')
                        } else if (r.status === 'Ready for Release') {
                          updateStatus(r, 'Completed')
                        } else if (r.status === 'Completed') {
                          updateStatus(r, 'Ready for Release')
                        }
                      }} style={{
                        padding: '4px 12px', borderRadius: '12px', border: `1px solid ${sc.border}`,
                        background: sc.bg, color: sc.color, cursor: 'pointer', fontSize: '11px', fontWeight: '500', whiteSpace: 'nowrap'
                      }}>
                        {r.status === 'Ready for Release' ? '✅ Ready for Release' : r.status}
                      </button>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <button onClick={() => deleteReport(r)} style={{
                        padding: '4px 8px', borderRadius: '6px', border: '1px solid #fcc',
                        background: '#fff5f5', color: '#c00', cursor: 'pointer', fontSize: '11px'
                      }}>Delete</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
