'use client'
import { useState, useEffect, useRef } from 'react'

const TYPE_STYLE = {
  Quotation: { bg: '#E6F1FB', color: '#0C447C' },
  Receipt: { bg: '#EAF3DE', color: '#27500A' },
  Certificate: { bg: '#F3E6FB', color: '#4C0C7C' }
}
const STATUS_STYLE = {
  requested: { bg: '#FCEBEB', color: '#791F1F', border: '#F3C2C2' },
  preparing: { bg: '#FAEEDA', color: '#633806', border: '#EBD98A' },
  released: { bg: '#1D9E75', color: 'white', border: '#1D9E75' }
}
const JSON_HEADERS = { 'Content-Type': 'application/json' }

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

export default function RequestsPage() {
  const [items, setItems] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState('all')
  const [newClient, setNewClient] = useState('')
  const [newType, setNewType] = useState('Quotation')
  const [adding, setAdding] = useState(false)
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
        ;['fb_name', 'birthday', 'address', 'diagnosis'].forEach(f => { saved.current[`${i.id}:${f}`] = i[f] })
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
      <p style={{ margin: '0 0 1.25rem', fontSize: '13px', color: '#999' }}>Quotations, receipts and certificates parents have asked for. Newest on top.</p>

      <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '12px', padding: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
        <input value={newClient} onChange={e => setNewClient(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
          list="request-clients" placeholder="Client name…"
          style={{ flex: 1, minWidth: '200px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }} />
        <datalist id="request-clients">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist>
        <select value={newType} onChange={e => setNewType(e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
          <option>Quotation</option><option>Receipt</option><option>Certificate</option>
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
                <th style={th}>Asked</th>
                <th style={th}>Client</th>
                <th style={{ ...th, minWidth: '150px' }}>Parent's FB name</th>
                <th style={th}>Type</th>
                <th style={th}>Birthday</th>
                <th style={th}>Age</th>
                <th style={{ ...th, minWidth: '240px' }}>Address</th>
                <th style={{ ...th, minWidth: '180px' }}>Diagnosis</th>
                <th style={th}>Status</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', color: '#bbb', fontStyle: 'italic', padding: '22px' }}>Nothing here</td></tr>
              ) : shown.map(i => {
                const done = i.status === 'released'
                const td = { padding: '6px 10px', borderBottom: `1px solid ${done ? '#cfe5bf' : '#f3f3f3'}`, background: done ? '#E4F2DA' : 'transparent', verticalAlign: 'middle' }
                const ts = TYPE_STYLE[i.type] || { bg: '#f0f0f0', color: '#555' }
                const ss = STATUS_STYLE[i.status]
                const cellStyle = { ...cell, background: done ? 'rgba(255,255,255,0.55)' : 'white', color: done ? '#3a5a22' : '#333' }
                return (
                  <tr key={i.id}>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{i.requested_date}</td>
                    <td style={{ ...td, fontWeight: 600, color: done ? '#3a5a22' : '#0f4c81', whiteSpace: 'nowrap' }}>{i.client_name}</td>
                    <td style={td}>
                      <input style={cellStyle} value={i.fb_name} placeholder="FB name"
                        onChange={e => edit(i.id, 'fb_name', e.target.value)} onBlur={e => save(i.id, 'fb_name', e.target.value.trim())} />
                    </td>
                    <td style={td}><span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 9px', borderRadius: '10px', background: ts.bg, color: ts.color, whiteSpace: 'nowrap' }}>{i.type}</span></td>
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
                    <td style={td}>
                      <select value={i.status} onChange={e => setStatus(i.id, e.target.value)}
                        style={{ borderRadius: '12px', padding: '4px 8px', fontSize: '11px', fontWeight: 700, border: `1px solid ${ss.border}`, background: ss.bg, color: ss.color, cursor: 'pointer' }}>
                        <option value="requested">Requested</option>
                        <option value="preparing">Preparing</option>
                        <option value="released">Released</option>
                      </select>
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
      <p style={{ fontSize: '11px', color: '#999', padding: '10px 4px' }}>FB name, birthday and address fill in from the client record when you add a request. Every box can be edited, and any of them can stay blank. Changes save when you click away.</p>
    </div>
  )
}