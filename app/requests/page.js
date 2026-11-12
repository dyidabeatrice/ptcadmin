'use client'
import { useState, useEffect, useRef } from 'react'

const TYPE_STYLE = {
  Quotation: { bg: '#E6F1FB', color: '#0C447C' },
  Receipt: { bg: '#EAF3DE', color: '#27500A' },
  Certificate: { bg: '#F3E6FB', color: '#4C0C7C' },
  Invoice: { bg: '#FAEEDA', color: '#633806' }
}
const STATUS_STYLE = {
  requested: { bg: '#FCEBEB', color: '#791F1F', border: '#F3C2C2' },
  preparing: { bg: '#FAEEDA', color: '#633806', border: '#EBD98A' },
  released: { bg: '#1D9E75', color: 'white', border: '#1D9E75' }
}
const JSON_HEADERS = { 'Content-Type': 'application/json' }

// Services offered on the quotation, with the usual fee per session.
// Fee per session. The fee can also be changed in the form for a special rate.
const SERVICE_FEES = {
  'Occupational Therapy': 1200,
  'Speech Therapy': 1300,
  'Physical Therapy': 900,
  'Special Education Tutorial': 900,
  'Initial Evaluation': 2800,
  'Specialized Therapy Service (OT/ST)': 1700
}
const PREPARERS = ['Angel Navarro', 'Lyco Madrid']

// "Bron, Rayleigh Zachary" -> "Rayleigh Zachary Bron"
function flipName(n) {
  const s = (n || '').trim()
  const i = s.indexOf(',')
  if (i === -1) return s
  return `${s.slice(i + 1).trim()} ${s.slice(0, i).trim()}`.trim()
}

// Client records may store the birthday in different text formats; the date box needs YYYY-MM-DD.
function toISO(s) {
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (isNaN(d)) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function ageText(iso) {
  if (!iso) return ''
  const b = new Date(iso + 'T00:00:00')
  if (isNaN(b)) return ''
  const now = new Date()
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth())
  if (now.getDate() < b.getDate()) months -= 1
  if (months < 0) return ''
  const y = Math.floor(months / 12)
  const m = months % 12
  const parts = []
  if (y) parts.push(`${y} year${y === 1 ? '' : 's'}`)
  if (m || !y) parts.push(`${m} month${m === 1 ? '' : 's'}`)
  return parts.join(', ')
}

// The client's therapist(s), read from their schedule entries ("Therapist|day|time; ...")
function therapistsOf(client) {
  if (!client) return ''
  const names = (client.schedule || '').split(';').map(s => s.split('|')[0].trim()).filter(Boolean)
  return [...new Set(names)].join(', ')
}

export default function RequestsPage() {
  const [items, setItems] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState('all')
  const [newClient, setNewClient] = useState('')
  const [newType, setNewType] = useState('Quotation')
  const [adding, setAdding] = useState(false)
  const [genItem, setGenItem] = useState(null) // the request a quotation is being generated for
  const saved = useRef({}) // last value written to the sheet, so we only save real changes

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [rRes, cRes] = await Promise.all([fetch('/api/doc-requests'), fetch('/api/clients')])
      const [r, c] = await Promise.all([rRes.json(), cRes.json()])
      if (!r.success) throw new Error(r.error || 'Could not load requests')
      r.data.forEach(i => {
        ;['fb_name', 'birthday', 'address', 'diagnosis', 'notes', 'sex'].forEach(f => { saved.current[`${i.id}:${f}`] = i[f] })
      })
      setItems(r.data)
      if (c.success) setClients(c.data.filter(x => x.status !== 'inactive'))
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  async function add() {
    const name = newClient.trim()
    if (!name) return
    const match = clients.find(c => c.name === name)
    setAdding(true)
    try {
      const res = await fetch('/api/doc-requests', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          client_name: name,
          type: newType,
          fb_name: match?.fb_account || '',
          birthday: toISO(match?.birthdate),
          address: match?.address || ''
        })
      }).then(r => r.json())
      if (!res.success) alert(res.error || 'Could not add the request')
      else { setNewClient(''); await load() }
    } catch {
      alert('Could not add the request')
    }
    setAdding(false)
  }

  function edit(id, field, value) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  async function save(id, field, value) {
    if (saved.current[`${id}:${field}`] === value) return
    saved.current[`${id}:${field}`] = value
    try {
      const res = await fetch('/api/doc-requests', { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ id, field, value }) }).then(r => r.json())
      if (!res.success) { alert(res.error || 'Could not save'); load() }
    } catch {
      alert('Could not save'); load()
    }
  }

  async function setStatus(id, status) {
    edit(id, 'status', status)
    try {
      const res = await fetch('/api/doc-requests', { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ id, field: 'status', value: status }) }).then(r => r.json())
      if (!res.success) { alert(res.error || 'Could not save'); load() }
    } catch {
      alert('Could not save'); load()
    }
  }

  async function remove(item) {
    if (!confirm(`Delete ${item.client_name}'s ${item.type.toLowerCase()} request?`)) return
    try {
      const res = await fetch('/api/doc-requests', { method: 'DELETE', headers: JSON_HEADERS, body: JSON.stringify({ id: item.id }) }).then(r => r.json())
      if (!res.success) alert(res.error || 'Could not delete')
    } catch {
      alert('Could not delete')
    }
    load()
  }

  const openCount = items.filter(i => i.status !== 'released').length
  const shown = items.filter(i => view === 'all' || (view === 'open' ? i.status !== 'released' : i.status === 'released'))

  const cell = { width: '100%', border: '1px solid #ececec', background: 'white', borderRadius: '6px', padding: '6px 7px', fontSize: '12px', fontFamily: 'inherit', color: '#333', boxSizing: 'border-box' }
  const th = { padding: '9px 10px', textAlign: 'left', color: '#666', fontWeight: 500, background: '#f8f9fa', borderBottom: '1px solid #e0e0e0', whiteSpace: 'nowrap', fontSize: '12px' }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 'min(1500px, 96vw)', margin: '0 auto' }}>
      <h1 style={{ color: '#0f4c81', margin: '0 0 4px' }}>Requests</h1>
      <p style={{ margin: '0 0 1.25rem', fontSize: '13px', color: '#999' }}>Quotations, receipts, certificates and invoices parents have asked for. Newest on top.</p>

      <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '12px', padding: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
        <input value={newClient} onChange={e => setNewClient(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
          list="request-clients" placeholder="Client name…"
          style={{ flex: 1, minWidth: '200px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }} />
        <datalist id="request-clients">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist>
        <select value={newType} onChange={e => setNewType(e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
          <option>Quotation</option><option>Receipt</option><option>Certificate</option><option>Invoice</option>
        </select>
        <button onClick={add} disabled={adding || !newClient.trim()}
          style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#1D9E75', color: 'white', fontSize: '13px', fontWeight: 500, cursor: 'pointer', opacity: (adding || !newClient.trim()) ? 0.5 : 1 }}>
          {adding ? 'Adding…' : '+ Add request'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {[['all', 'All'], ['open', `Open (${openCount})`], ['released', 'Released']].map(([k, t]) => (
          <button key={k} onClick={() => setView(k)} style={{
            padding: '6px 14px', borderRadius: '16px', border: 'none', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
            background: view === k ? '#0f4c81' : '#f0f0f0', color: view === k ? 'white' : '#666'
          }}>{t}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Loading…</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#791F1F', background: '#FCEBEB', borderRadius: '12px' }}>
          Couldn't load requests: {error}. <button onClick={load} style={{ background: 'none', border: 'none', color: '#0f4c81', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit' }}>Try again</button>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '12px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={th}>Request Date</th>
                <th style={{ ...th, minWidth: '190px' }}>Client / parent's FB name</th>
                <th style={th}>Type</th>
                <th style={th}>Birthday</th>
                <th style={th}>Age</th>
                <th style={{ ...th, minWidth: '190px' }}>Address</th>
                <th style={{ ...th, minWidth: '140px' }}>Diagnosis</th>
                <th style={{ ...th, minWidth: '110px' }}>Therapist(s)</th>
                <th style={th}>Status</th>
                <th style={{ ...th, minWidth: '190px' }}>Notes</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', color: '#bbb', fontStyle: 'italic', padding: '22px' }}>Nothing here</td></tr>
              ) : shown.map(i => {
                const done = i.status === 'released'
                const td = { padding: '6px 8px', borderBottom: `1px solid ${done ? '#cfe5bf' : '#f3f3f3'}`, background: done ? '#E4F2DA' : 'transparent', verticalAlign: 'middle' }
                const ts = TYPE_STYLE[i.type] || { bg: '#f0f0f0', color: '#555' }
                const ss = STATUS_STYLE[i.status]
                const cellStyle = { ...cell, background: done ? 'rgba(255,255,255,0.55)' : 'white', color: done ? '#3a5a22' : '#333' }
                return (
                  <tr key={i.id}>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{i.requested_date}</td>
                    <td style={td}>
                      <div style={{ fontWeight: 600, color: done ? '#3a5a22' : '#0f4c81', whiteSpace: 'nowrap', marginBottom: '3px' }}>{i.client_name}</div>
                      <input style={{ ...cellStyle, fontSize: '11px', padding: '3px 6px' }} value={i.fb_name} placeholder="Parent's FB name"
                        onChange={e => edit(i.id, 'fb_name', e.target.value)} onBlur={e => save(i.id, 'fb_name', e.target.value.trim())} />
                    </td>
                    <td style={td}><span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 9px', borderRadius: '10px', background: ts.bg, color: ts.color, whiteSpace: 'nowrap' }}>{i.type}</span>
                      {i.type === 'Quotation' && (
                        <button onClick={() => setGenItem(i)} title="Create the quotation document"
                          style={{ display: 'block', marginTop: '5px', fontSize: '11px', padding: '3px 10px', borderRadius: '6px', border: '1px solid #0f4c81', background: 'white', color: '#0f4c81', cursor: 'pointer', fontWeight: 600 }}>📄 Generate</button>
                      )}
                    </td>
                    <td style={td}>
                      <input type="date" style={cellStyle} value={toISO(i.birthday)}
                        onChange={e => { edit(i.id, 'birthday', e.target.value); save(i.id, 'birthday', e.target.value) }} />
                    </td>
                    <td style={{ ...td, whiteSpace: 'nowrap', color: done ? '#3a5a22' : '#555' }}>{ageText(toISO(i.birthday))}</td>
                    <td style={td}>
                      <input style={cellStyle} value={i.address} placeholder="Address"
                        onChange={e => edit(i.id, 'address', e.target.value)} onBlur={e => save(i.id, 'address', e.target.value.trim())} />
                    </td>
                    <td style={td}>
                      <input style={cellStyle} value={i.diagnosis} placeholder="Diagnosis"
                        onChange={e => edit(i.id, 'diagnosis', e.target.value)} onBlur={e => save(i.id, 'diagnosis', e.target.value.trim())} />
                    </td>
                    <td style={{ ...td, color: done ? '#3a5a22' : '#555' }}>{therapistsOf(clients.find(c => c.name === i.client_name)) || '—'}</td>
                    <td style={td}>
                      <select value={i.status} onChange={e => setStatus(i.id, e.target.value)}
                        style={{ borderRadius: '12px', padding: '4px 8px', fontSize: '11px', fontWeight: 700, border: `1px solid ${ss.border}`, background: ss.bg, color: ss.color, cursor: 'pointer' }}>
                        <option value="requested">Requested</option>
                        <option value="preparing">Preparing</option>
                        <option value="released">Released</option>
                      </select>
                    </td>
                    <td style={td}>
                      <input style={cellStyle} value={i.notes} placeholder="Notes"
                        onChange={e => edit(i.id, 'notes', e.target.value)} onBlur={e => save(i.id, 'notes', e.target.value.trim())} />
                    </td>
                    <td style={td}>
                      <button onClick={() => remove(i)} title="Delete this request" style={{ border: 'none', background: 'none', color: '#bbb', cursor: 'pointer', fontSize: '13px' }}>✕</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {genItem && (
        <QuotationModal item={genItem} onClose={() => setGenItem(null)}
          onSex={s => { edit(genItem.id, 'sex', s); save(genItem.id, 'sex', s) }} />
      )}
      <p style={{ fontSize: '11px', color: '#999', padding: '10px 4px' }}>FB name, birthday and address fill in from the client record when you add a request. Every box can be edited, and any of them can stay blank. Changes save when you click away.</p>
    </div>
  )
}

// Pop-up that fills in the PTC quotation template and downloads it as a Word file
function QuotationModal({ item, onClose, onSex }) {
  const [name, setName] = useState(flipName(item.client_name))
  const [address, setAddress] = useState(item.address || '')
  const [diagnosis, setDiagnosis] = useState(item.diagnosis || '')
  const [sex, setSex] = useState(item.sex || '')
  const [months, setMonths] = useState(3)
  const [rows, setRows] = useState([{ service: 'Occupational Therapy', fee: SERVICE_FEES['Occupational Therapy'], spw: 1, wpm: 4 }])
  const [preparedBy, setPreparedBy] = useState(PREPARERS[0])
  const [busy, setBusy] = useState(false)

  const [age, setAge] = useState(ageText(toISO(item.birthday)) || '')
  const today = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric' })
  const peso = n => '₱' + Number(n || 0).toLocaleString('en-US')
  const m = Number(months) || 0
  const isIE = r => r.service === 'Initial Evaluation' // one session only, so it is never multiplied
  const amountOf = r => isIE(r) ? (Number(r.fee) || 0) : (Number(r.fee) || 0) * (Number(r.spw) || 0) * (Number(r.wpm) || 0) * m
  const grand = rows.reduce((s, r) => s + amountOf(r), 0)

  function setRow(i, patch) { setRows(prev => prev.map((r, k) => k === i ? { ...r, ...patch } : r)) }
  function pickService(i, service) { setRow(i, service === 'Initial Evaluation' ? { service, fee: SERVICE_FEES[service], spw: 1, wpm: 1 } : { service, fee: SERVICE_FEES[service], spw: 1, wpm: 4 }) }
  function addRow() { setRows(prev => [...prev, { service: 'Speech Therapy', fee: SERVICE_FEES['Speech Therapy'], spw: 1, wpm: 4 }]) }

  async function generate() {
    if (!name.trim()) return alert('Please enter the name')
    if (!(m >= 1)) return alert('Please enter the number of months')
    setBusy(true)
    try {
      const res = await fetch('/api/doc-requests/quotation', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ name, address, age_text: age, sex, diagnosis, services: rows, months: m, prepared_by: preparedBy })
      })
      if (!res.ok) {
        let msg = 'Could not generate the quotation'
        try { const j = await res.json(); if (j.error) msg = j.error } catch {}
        alert(msg)
        setBusy(false)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `PTC_Quotation_${name.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'Client'}.docx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      if (sex !== (item.sex || '')) onSex(sex)
      onClose()
    } catch {
      alert('Could not generate the quotation')
    }
    setBusy(false)
  }

  const input = { padding: '7px 9px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '12px', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }
  const label = { color: '#666', fontStyle: 'italic', fontSize: '12px' }
  const sec = { fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: '#999', margin: '14px 0 6px' }
  const num = { ...input, width: '64px', textAlign: 'center' }

  return (
    <div onClick={e => { if (e.target === e.currentTarget && !busy) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '1.5rem 1rem', overflowY: 'auto' }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', width: '760px', maxWidth: '100%' }}>
        <h3 style={{ margin: '0 0 2px', color: '#0f4c81', fontSize: '16px' }}>Generate quotation</h3>
        <div style={{ fontSize: '12px', color: '#999', marginBottom: '12px' }}>Creates the Word file from the PTC quotation template. Everything here can still be edited in Word afterwards.</div>

        <div style={sec}>Client details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '6px 10px', alignItems: 'center' }}>
          <span style={label}>Date</span><div style={{ ...input, background: '#f6f7f9', color: '#555', border: '1px solid #ececec' }}>{today}</div>
          <span style={label}>Name</span><input style={input} value={name} onChange={e => setName(e.target.value)} />
          <span style={label}>Address</span><input style={input} value={address} onChange={e => setAddress(e.target.value)} />
          <span style={label}>Age/Sex</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input style={{ ...input, flex: 1 }} value={age} onChange={e => setAge(e.target.value)} placeholder={item.birthday ? '' : 'No birthday on file. Type the age, e.g. 6 years, 9 months'} />
            <select style={{ ...input, width: '140px' }} value={sex} onChange={e => setSex(e.target.value)}>
              <option value="">Sex…</option><option>Male</option><option>Female</option>
            </select>
          </div>
          <span style={label}>Diagnosis</span><input style={input} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
        </div>

        <div style={sec}>Services</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              {['Service', 'Fee', 'Sessions / week', 'Weeks / month', 'Amount', ''].map((h, k) => (
                <th key={k} style={{ fontSize: '10px', textTransform: 'uppercase', padding: '6px', textAlign: k === 0 ? 'left' : k === 4 ? 'right' : 'center', color: '#666', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ padding: '5px 4px', borderBottom: '1px solid #f0f0f0' }}>
                  <select style={input} value={r.service} onChange={e => pickService(i, e.target.value)}>
                    {Object.keys(SERVICE_FEES).map(s => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td style={{ padding: '5px 4px', borderBottom: '1px solid #f0f0f0' }}><input style={num} type="number" min="0" value={r.fee} onChange={e => setRow(i, { fee: e.target.value })} /></td>
                <td style={{ padding: '5px 4px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}><input style={{ ...num, ...(isIE(r) ? { background: '#f0f0f0', color: '#999' } : {}) }} disabled={isIE(r)} type="number" min="1" value={r.spw} onChange={e => setRow(i, { spw: e.target.value })} /></td>
                <td style={{ padding: '5px 4px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}><input style={{ ...num, ...(isIE(r) ? { background: '#f0f0f0', color: '#999' } : {}) }} disabled={isIE(r)} type="number" min="1" max="5" value={r.wpm} onChange={e => setRow(i, { wpm: e.target.value })} /></td>
                <td style={{ padding: '5px 4px', borderBottom: '1px solid #f0f0f0', textAlign: 'right', fontWeight: 700, color: '#0f4c81', whiteSpace: 'nowrap' }}>{peso(amountOf(r))}</td>
                <td style={{ padding: '5px 4px', borderBottom: '1px solid #f0f0f0' }}>
                  {rows.length > 1 && <button onClick={() => setRows(prev => prev.filter((_, k) => k !== i))} style={{ border: 'none', background: 'none', color: '#bbb', cursor: 'pointer', fontSize: '14px' }}>✕</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addRow} style={{ fontSize: '12px', color: '#0f4c81', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', marginTop: '6px', padding: 0 }}>+ Add another service</button>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', marginTop: '10px' }}>
          Total no. of months
          <input style={{ ...input, width: '60px', textAlign: 'center' }} type="number" min="1" max="36" value={months} onChange={e => setMonths(e.target.value)} />
          <span style={{ color: '#999' }}>(the document says "approximately {m || '…'} month{m === 1 ? '' : 's'}")</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#E6F1FB', borderRadius: '8px', marginTop: '10px', fontSize: '13px', color: '#0C447C' }}>
          <span>Grand total for {m || '…'} month{m === 1 ? '' : 's'}</span>
          <b style={{ fontSize: '18px' }}>{peso(grand)}</b>
        </div>

        <div style={sec}>Prepared by</div>
        <select style={input} value={preparedBy} onChange={e => setPreparedBy(e.target.value)}>
          {PREPARERS.map(p => <option key={p}>{p}</option>)}
        </select>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button onClick={onClose} disabled={busy} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
          <button onClick={generate} disabled={busy} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0f4c81', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Generating…' : 'Generate Word file'}
          </button>
        </div>
        <div style={{ fontSize: '11px', color: '#999', marginTop: '10px' }}>The fee fills in when you pick a service. You can overwrite it for a special rate.</div>
      </div>
    </div>
  )
}