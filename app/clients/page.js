'use client'
import { useState, useEffect } from 'react'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

const EMPTY_FORM = {
  name: '', birthdate: '', fb_account: '',
  phone: '', address: '', notes: '',
  therapists: [{ day: '', therapist: '', time_start: '', time_end: '' }]
}

function parseTime(str) {
  if (!str) return [8, 0]
  const [time, period] = str.split(' ')
  let [h, m] = time.split(':').map(Number)
  if (period === 'PM' && h !== 12) h += 12
  if (period === 'AM' && h === 12) h = 0
  return [h, m]
}

function formatTime(h, m) {
  const period = h >= 12 ? 'PM' : 'AM'
  const dh = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${dh}:${m.toString().padStart(2, '0')} ${period}`
}

function scheduleString(therapists) {
  return therapists
    .filter(t => t.therapist && t.day && t.time_start && t.time_end)
    .map(t => `${t.therapist}|${t.day}|${t.time_start}|${t.time_end}`)
    .join(';')
}

function parseSchedule(str) {
  if (!str) return [{ day: '', therapist: '', time_start: '', time_end: '' }]
  return str.split(';').map(s => {
    const [therapist, day, time_start, time_end] = s.split('|')
    return { therapist: therapist || '', day: day || '', time_start: time_start || '', time_end: time_end || '' }
  })
}

function similarity(a, b) {
  a = a.toLowerCase().trim()
  b = b.toLowerCase().trim()
  if (a === b) return 1
  const longer = a.length > b.length ? a : b
  const shorter = a.length > b.length ? b : a
  if (longer.length === 0) return 1
  const costs = []
  for (let i = 0; i <= shorter.length; i++) costs[i] = i
  for (let i = 1; i <= longer.length; i++) {
    let prev = i
    for (let j = 1; j <= shorter.length; j++) {
      const val = longer[i-1] === shorter[j-1] ? costs[j-1] : Math.min(costs[j-1], costs[j], prev) + 1
      costs[j-1] = prev
      prev = val
    }
    costs[shorter.length] = prev
  }
  return (longer.length - costs[shorter.length]) / longer.length
}

function TherapistRows({ therapists, setTherapists, therapistData }) {
  function getTherapistsForDay(day) {
    if (!day) return []
    return [...new Set(therapistData.filter(t => t.day === day && !t.is_intern).map(t => t.name))].sort()
  }

  function getTimeSlotsForTherapist(day, name) {
    const entry = therapistData.find(t => t.day === day && t.name === name)
    if (!entry) return []
    const slots = []
    const [sh, sm] = parseTime(entry.time_start)
    const [eh, em] = parseTime(entry.time_end)
    let h = sh, m = sm
    while (h * 60 + m <= eh * 60 + em) {
      slots.push(formatTime(h, m))
      m += 15
      if (m >= 60) { h++; m = 0 }
    }
    return slots
  }

  return (
    <div>
      {therapists.map((row, i) => {
        const dayTherapists = getTherapistsForDay(row.day)
        const timeSlots = getTimeSlotsForTherapist(row.day, row.therapist)
        return (
          <div key={i} style={{ background: '#f8f9fa', borderRadius: '8px', padding: '12px', marginBottom: '8px', border: '1px solid #e0e0e0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Day</label>
                <select value={row.day}
                  onChange={e => {
                    const updated = therapists.map((t, j) => j === i ? { day: e.target.value, therapist: '', time_start: '', time_end: '' } : t)
                    setTherapists(updated)
                  }}
                  style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }}>
                  <option value="">Select day...</option>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Therapist</label>
                <select value={row.therapist} disabled={!row.day}
                  onChange={e => {
                    const updated = therapists.map((t, j) => j === i ? { ...t, therapist: e.target.value, time_start: '', time_end: '' } : t)
                    setTherapists(updated)
                  }}
                  style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', opacity: !row.day ? 0.5 : 1 }}>
                  <option value="">Select therapist...</option>
                  {dayTherapists.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Start time</label>
                <select value={row.time_start} disabled={!row.therapist}
                  onChange={e => {
                    const updated = therapists.map((t, j) => j === i ? { ...t, time_start: e.target.value, time_end: '' } : t)
                    setTherapists(updated)
                  }}
                  style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', opacity: !row.therapist ? 0.5 : 1 }}>
                  <option value="">Start...</option>
                  {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>End time</label>
                <select value={row.time_end} disabled={!row.time_start}
                  onChange={e => {
                    const updated = therapists.map((t, j) => j === i ? { ...t, time_end: e.target.value } : t)
                    setTherapists(updated)
                  }}
                  style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', opacity: !row.time_start ? 0.5 : 1 }}>
                  <option value="">End...</option>
                  {[60, 90, 120].map(mins => {
                    if (!row.time_start) return null
                    const [h, m] = parseTime(row.time_start)
                    const totalMins = h * 60 + m + mins
                    const endTime = formatTime(Math.floor(totalMins / 60), totalMins % 60)
                    const label = mins === 60 ? '1 hr' : mins === 90 ? '1.5 hrs' : '2 hrs'
                    return <option key={mins} value={endTime}>{label} ({endTime})</option>
                  })}
                </select>
              </div>
              {therapists.length > 1 && (
                <button onClick={() => setTherapists(therapists.filter((_, j) => j !== i))}
                  style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #fcc', background: '#fff5f5', color: '#c00', cursor: 'pointer' }}>✕</button>
              )}
            </div>
          </div>
        )
      })}
      <button onClick={() => setTherapists([...therapists, { day: '', therapist: '', time_start: '', time_end: '' }])}
        style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', border: '1px solid #0f4c81', color: '#0f4c81', background: 'white', cursor: 'pointer', width: '100%' }}>
        + Add another therapist / day
      </button>
    </div>
  )
}

function ClientForm({ data, setData, onSave, onClose, title, saving, therapistData, clients }) {
  const [duplicateWarning, setDuplicateWarning] = useState(null)

  useEffect(() => {
    if (!data.name || data.name.length < 3) { setDuplicateWarning(null); return }
    const name = data.name.trim().toLowerCase()
    const exact = clients.find(c => c.name.toLowerCase() === name && c.index !== data.index)
    const similar = clients
      .filter(c => c.name.toLowerCase() !== name && c.index !== data.index)
      .filter(c => similarity(c.name, data.name) >= 0.7)
      .sort((a, b) => similarity(b.name, data.name) - similarity(a.name, data.name))
      .slice(0, 3)
    if (exact || similar.length > 0) setDuplicateWarning({ exact, similar })
    else setDuplicateWarning(null)
  }, [data.name])

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '540px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 1.5rem', color: '#0f4c81' }}>{title}</h3>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Full name</label>
          <input value={data.name} onChange={e => setData({ ...data, name: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: duplicateWarning?.exact ? '2px solid #E24B4A' : '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />

          {duplicateWarning?.exact && (
            <div style={{ marginTop: '6px', padding: '10px 12px', borderRadius: '8px', background: '#FCEBEB', border: '1px solid #F09595' }}>
              <div style={{ fontSize: '12px', fontWeight: '500', color: '#791F1F', marginBottom: '4px' }}>⚠️ Client already exists: {duplicateWarning.exact.name}</div>
              <div style={{ fontSize: '11px', color: '#A32D2D' }}>Please edit the existing client instead of creating a new one.</div>
            </div>
          )}

          {!duplicateWarning?.exact && duplicateWarning?.similar?.length > 0 && (
            <div style={{ marginTop: '6px', padding: '10px 12px', borderRadius: '8px', background: '#FAEEDA', border: '1px solid #EF9F27' }}>
              <div style={{ fontSize: '12px', fontWeight: '500', color: '#633806', marginBottom: '6px' }}>⚠️ Similar names found — is this the same client?</div>
              {duplicateWarning.similar.map((c, i) => (
                <div key={i} style={{ fontSize: '11px', color: '#633806', marginBottom: '2px' }}>· {c.name} ({Math.round(similarity(c.name, data.name) * 100)}% similar)</div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1rem' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Birthdate</label>
            <input type="date" value={data.birthdate} onChange={e => setData({ ...data, birthdate: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Phone</label>
            <input value={data.phone} onChange={e => setData({ ...data, phone: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Facebook account</label>
            <input value={data.fb_account} onChange={e => setData({ ...data, fb_account: e.target.value })}
              placeholder="e.g. facebook.com/parentname"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Address</label>
            <input value={data.address} onChange={e => setData({ ...data, address: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Notes</label>
            <input value={data.notes} onChange={e => setData({ ...data, notes: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Therapist schedule
            <span style={{ fontWeight: '400', marginLeft: '6px', color: '#aaa' }}>— updates master schedule automatically</span>
          </label>
          <TherapistRows
            therapists={data.therapists}
            setTherapists={updated => setData({ ...data, therapists: updated })}
            therapistData={therapistData}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}>Cancel</button>
          <button onClick={onSave} disabled={saving || !!duplicateWarning?.exact} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0f4c81', color: 'white', cursor: 'pointer', fontWeight: '500', opacity: duplicateWarning?.exact ? 0.5 : 1 }}>
            {saving ? 'Saving...' : 'Save client'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ClientsPage() {
  const [clients, setClients] = useState([])
  const [therapistData, setTherapistData] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editClient, setEditClient] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    fetchClients()
    fetchTherapists()
  }, [])

  async function fetchClients() {
    setLoading(true)
    const res = await fetch('/api/clients')
    const json = await res.json()
    if (json.success) setClients(json.data)
    setLoading(false)
  }

  async function fetchTherapists() {
    const res = await fetch('/api/therapists')
    const json = await res.json()
    if (json.success) setTherapistData(json.data)
  }

  async function handleAdd() {
    if (!form.name.trim()) return alert('Please enter a client name')
    setSaving(true)
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, schedule: scheduleString(form.therapists) })
    })
    const json = await res.json()
    if (json.success) { setShowForm(false); setForm(EMPTY_FORM); fetchClients() }
    else alert('Error: ' + json.error)
    setSaving(false)
  }

  async function handleEdit() {
    setSaving(true)
    const res = await fetch('/api/clients', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editClient, schedule: scheduleString(editClient.therapists) })
    })
    const json = await res.json()
    if (json.success) { setEditClient(null); fetchClients() }
    else alert('Error: ' + json.error)
    setSaving(false)
  }

async function handleDelete(client) {
    const res = await fetch('/api/clients', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index: client.index })
    })
    const json = await res.json()
    if (json.success) { setDeleteConfirm(null); fetchClients() }
    else alert('Error: ' + json.error)
  }

  async function toggleStatus(client) {
    const newStatus = client.status === 'inactive' ? 'active' : 'inactive'
    if (newStatus === 'inactive' && !confirm(`Mark ${client.name} as inactive? Their master schedule slots will be removed.`)) return
    await fetch('/api/clients', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...client, therapists: parseSchedule(client.schedule), status: newStatus })
    })
    fetchClients()
  }

  const filtered = clients
    .filter(c => {
      const matchStatus = showInactive ? c.status === 'inactive' : c.status !== 'inactive'
      const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.fb_account?.toLowerCase().includes(search.toLowerCase())
      return matchStatus && matchSearch
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ color: '#0f4c81', margin: '0 0 4px' }}>Clients</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>
            {clients.filter(c => c.status !== 'inactive').length} active · {clients.filter(c => c.status === 'inactive').length} inactive
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input placeholder="Search name or FB account..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', width: '210px' }} />
          <button onClick={() => setShowInactive(!showInactive)} style={{
            padding: '8px 14px', borderRadius: '8px', border: '1px solid #ddd',
            cursor: 'pointer', fontSize: '13px',
            background: showInactive ? '#FCEBEB' : 'white',
            color: showInactive ? '#791F1F' : '#666'
          }}>{showInactive ? 'Show active' : 'Show inactive'}</button>
          <button onClick={() => { setForm(EMPTY_FORM); setShowForm(true) }} style={{
            background: '#0f4c81', color: 'white', border: 'none',
            padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500'
          }}>+ Add client</button>
        </div>
      </div>

      {showForm && <ClientForm data={form} setData={setForm} onSave={handleAdd} onClose={() => setShowForm(false)} title="New client" saving={saving} therapistData={therapistData} clients={clients} />}
      {editClient && <ClientForm data={editClient} setData={setEditClient} onSave={handleEdit} onClose={() => setEditClient(null)} title="Edit client" saving={saving} therapistData={therapistData} clients={clients} />}

      {deleteConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '400px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 0.5rem', color: '#E24B4A' }}>Delete client</h3>
            <p style={{ margin: '0 0 0.5rem', fontSize: '14px', color: '#333' }}>
              Are you sure you want to permanently delete <strong>{deleteConfirm.name}</strong>?
            </p>
            <p style={{ margin: '0 0 1.5rem', fontSize: '12px', color: '#999' }}>
              This will remove them from the clients list and master schedule. This cannot be undone. Use this only to remove duplicates.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#E24B4A', color: 'white', cursor: 'pointer', fontWeight: '500' }}>
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              {['Name', 'FB Account', 'Phone', 'Schedule', 'Balance', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#666', fontWeight: '500', borderBottom: '1px solid #e0e0e0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                {showInactive ? 'No inactive clients' : 'No clients yet'}
              </td></tr>
            ) : filtered.map((c, i) => {
              const schedules = parseSchedule(c.schedule)
              const isInactive = c.status === 'inactive'
              return (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0', opacity: isInactive ? 0.55 : 1 }}>
                  <td style={{ padding: '12px 16px', fontWeight: '500', color: '#0f4c81' }}>
                    {c.name}
                    {c.outstanding_balance > 0 && (
                      <span style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 6px', borderRadius: '8px', background: '#FCEBEB', color: '#791F1F', fontWeight: '500' }}>
                        ⚠️ Unpaid
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#185FA5', fontSize: '12px' }}>{c.fb_account || '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#666' }}>{c.phone || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {schedules.filter(s => s.therapist).map((s, si) => (
                        <span key={si} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#E6F1FB', color: '#0C447C', display: 'inline-block', width: 'fit-content', whiteSpace: 'nowrap' }}>
                          {s.therapist} · {s.day} {s.time_start}–{s.time_end}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {c.credit_balance > 0 && (
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '8px', background: '#EAF3DE', color: '#27500A', whiteSpace: 'nowrap' }}>
                          💳 ₱{c.credit_balance.toLocaleString()} credit
                        </span>
                      )}
                      {c.outstanding_balance > 0 && (
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '8px', background: '#FCEBEB', color: '#791F1F', whiteSpace: 'nowrap' }}>
                          ⚠️ ₱{c.outstanding_balance.toLocaleString()} due
                        </span>
                      )}
                      {c.credit_balance === 0 && c.outstanding_balance === 0 && (
                        <span style={{ fontSize: '11px', color: '#aaa' }}>—</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {!isInactive && (
                        <button onClick={() => setEditClient({ ...c, therapists: parseSchedule(c.schedule) })}
                          style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '5px', border: '1px solid #ddd', cursor: 'pointer', background: 'white', color: '#444' }}>Edit</button>
                      )}
                      <button onClick={() => toggleStatus(c)}
                        style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '5px', cursor: 'pointer',
                          border: isInactive ? '1px solid #97C459' : '1px solid #fcc',
                          background: isInactive ? '#EAF3DE' : '#fff5f5',
                          color: isInactive ? '#27500A' : '#c00'
                        }}>{isInactive ? 'Reactivate' : 'Deactivate'}</button>
                      <button onClick={() => setDeleteConfirm(c)}
                        style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '5px', cursor: 'pointer', border: '1px solid #E24B4A', background: '#fff5f5', color: '#E24B4A' }}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}