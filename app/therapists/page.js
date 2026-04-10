'use client'
import { useState, useEffect } from 'react'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

const SPECIALTY_COLORS = {
  OT:   { bg: '#E6F1FB', border: '#B5D4F4', color: '#0C447C' },
  ST:   { bg: '#EAF3DE', border: '#C0DD97', color: '#27500A' },
  PT:   { bg: '#FAEEDA', border: '#FAC775', color: '#633806' },
  SPED: { bg: '#EEEDFE', border: '#CECBF6', color: '#3C3489' },
}

const LEVELS = ['', 'JUNIOR 1', 'JUNIOR 2', 'JUNIOR 3', 'SENIOR 1', 'SENIOR 2']

const EMPTY_FORM = {
  name: '', specialty: 'OT', is_intern: false,
  days: [{ day: '', time_start: '', time_end: '' }]
}

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

export default function TherapistsPage() {
  const [therapists, setTherapists] = useState([])
  const [master, setMaster] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [selectedTherapist, setSelectedTherapist] = useState(null)

  // Edit state
  const [editingTherapist, setEditingTherapist] = useState(null) // name being edited
  const [editForm, setEditForm] = useState(null) // { name, specialty, is_intern, level, days: [{rowIndex, day, time_start, time_end, _new?, _deleted?}] }
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [tRes, mRes, cRes] = await Promise.all([
      fetch('/api/therapists'),
      fetch('/api/master'),
      fetch('/api/clients')
    ])
    const [tJson, mJson, cJson] = await Promise.all([tRes.json(), mRes.json(), cRes.json()])
    if (tJson.success) setTherapists(tJson.data)
    if (mJson.success) setMaster(mJson.data)
    if (cJson.success) setClients(cJson.data)
    setLoading(false)
  }

  // ── ADD THERAPIST ──────────────────────────────────────────────────────────
  async function handleAdd() {
    if (!form.name.trim()) return alert('Please enter a name')
    const validDays = form.days.filter(d => d.day && d.time_start && d.time_end)
    if (validDays.length === 0) return alert('Please add at least one day with working hours')
    setSaving(true)
    const res = await fetch('/api/therapists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, days: validDays })
    })
    const json = await res.json()
    if (json.success) { setShowForm(false); setForm(EMPTY_FORM); fetchAll() }
    else alert('Error: ' + json.error)
    setSaving(false)
  }

  // ── DELETE THERAPIST (all rows) ────────────────────────────────────────────
  async function handleDelete(therapist) {
    const allRows = therapists.filter(t => t.name === therapist.name)
    if (!confirm(`Remove ${therapist.name}? This will delete all ${allRows.length} day row(s).`)) return
    // Delete from bottom up to preserve row indices
    const sorted = [...allRows].sort((a, b) => b.index - a.index)
    for (const row of sorted) {
      await fetch('/api/therapists', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex: row.index })
      })
    }
    fetchAll()
  }

  // ── OPEN EDIT MODAL ────────────────────────────────────────────────────────
  function openEdit(name) {
    const rows = therapists.filter(t => t.name === name).sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day))
    const first = rows[0]
    setEditForm({
      name: first.name,
      specialty: first.specialty,
      is_intern: first.is_intern,
      level: first.level || '',
      days: rows.map(r => ({
        rowIndex: r.index,
        day: r.day,
        time_start: r.time_start,
        time_end: r.time_end,
        _deleted: false,
        _new: false,
      }))
    })
    setEditingTherapist(name)
  }

  function closeEdit() {
    setEditingTherapist(null)
    setEditForm(null)
  }

  function updateEditDay(i, field, value) {
    setEditForm(prev => {
      const days = [...prev.days]
      days[i] = { ...days[i], [field]: value }
      return { ...prev, days }
    })
  }

  function addEditDay() {
    setEditForm(prev => ({
      ...prev,
      days: [...prev.days, { rowIndex: null, day: '', time_start: '', time_end: '', _new: true, _deleted: false }]
    }))
  }

  function markDeleteDay(i) {
    setEditForm(prev => {
      const days = [...prev.days]
      if (days[i]._new) {
        // Just remove it from the list entirely if it was never saved
        days.splice(i, 1)
      } else {
        days[i] = { ...days[i], _deleted: true }
      }
      return { ...prev, days }
    })
  }

  // ── SAVE EDIT ──────────────────────────────────────────────────────────────
  async function handleEditSave() {
    if (!editForm.name.trim()) return alert('Name is required')
    const activeDays = editForm.days.filter(d => !d._deleted)
    if (activeDays.length === 0) return alert('Therapist must have at least one day')

    setEditSaving(true)
    try {
      const ops = []

      // 1. Delete rows marked for deletion (descending rowIndex to preserve indices)
      const toDelete = editForm.days.filter(d => d._deleted && !d._new).sort((a, b) => b.rowIndex - a.rowIndex)
      for (const d of toDelete) {
        ops.push(fetch('/api/therapists', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rowIndex: d.rowIndex })
        }))
      }
      await Promise.all(ops)

      // 2. PATCH existing rows (name, specialty, intern, level, day, times)
      const toUpdate = editForm.days.filter(d => !d._deleted && !d._new)
      for (const d of toUpdate) {
        await fetch('/api/therapists', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rowIndex: d.rowIndex,
            name: editForm.name,
            specialty: editForm.specialty,
            is_intern: editForm.is_intern,
            level: editForm.level,
            day: d.day,
            time_start: d.time_start,
            time_end: d.time_end,
          })
        })
      }

      // 3. POST new day rows
      const toAdd = editForm.days.filter(d => d._new && !d._deleted && d.day && d.time_start && d.time_end)
      if (toAdd.length > 0) {
        await fetch('/api/therapists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editForm.name,
            specialty: editForm.specialty,
            is_intern: editForm.is_intern,
            level: editForm.level,
            days: toAdd.map(d => ({ day: d.day, time_start: d.time_start, time_end: d.time_end }))
          })
        })
      }

      closeEdit()
      fetchAll()
    } catch (e) {
      alert('Error saving: ' + e.message)
    }
    setEditSaving(false)
  }

  // ── HELPERS ────────────────────────────────────────────────────────────────
  const uniqueTherapists = therapists.reduce((acc, t) => {
    if (!acc.find(x => x.name === t.name)) acc.push(t)
    return acc
  }, []).sort((a, b) => a.name.localeCompare(b.name))

  function getTherapistDays(name) {
    return therapists.filter(t => t.name === name).sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day))
  }

  function getTherapistClients(name) {
    const slots = master.filter(s => s.therapist === name)
    const byDay = {}
    DAYS.forEach(day => {
      const daySlots = slots.filter(s => s.day === day).sort((a, b) => {
        const toMins = str => {
          if (!str) return 0
          const [time, period] = str.split(' ')
          let [h, m] = time.split(':').map(Number)
          if (period === 'PM' && h !== 12) h += 12
          if (period === 'AM' && h === 12) h = 0
          return h * 60 + m
        }
        return toMins(a.time_start) - toMins(b.time_start)
      })
      if (daySlots.length > 0) byDay[day] = daySlots
    })
    return byDay
  }

  function getClientInfo(clientName) {
    return clients.find(c => c.name === clientName)
  }

  const sc = selectedTherapist ? (SPECIALTY_COLORS[therapists.find(t => t.name === selectedTherapist)?.specialty] || SPECIALTY_COLORS.OT) : null
  const therapistClients = selectedTherapist ? getTherapistClients(selectedTherapist) : {}
  const totalClients = selectedTherapist ? [...new Set(Object.values(therapistClients).flat().map(s => s.client_name))].length : 0

  // ── EDIT MODAL ─────────────────────────────────────────────────────────────
  const EditModal = () => {
    if (!editForm) return null
    const activeDays = editForm.days.filter(d => !d._deleted)
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ background: 'white', borderRadius: '14px', padding: '2rem', width: '520px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
          <h3 style={{ margin: '0 0 1.5rem', color: '#0f4c81', fontSize: '18px' }}>Edit therapist</h3>

          {/* Name */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Name</label>
            <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          {/* Specialty + Intern + Level */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Specialty</label>
              <select value={editForm.specialty} onChange={e => setEditForm({ ...editForm, specialty: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }}>
                {['OT','ST','PT','SPED'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Level</label>
              <select value={editForm.level} onChange={e => setEditForm({ ...editForm, level: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '12px' }}>
                {LEVELS.map(l => <option key={l} value={l}>{l || '— none —'}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
              <input type="checkbox" id="edit_intern" checked={editForm.is_intern}
                onChange={e => setEditForm({ ...editForm, is_intern: e.target.checked })} />
              <label htmlFor="edit_intern" style={{ fontSize: '13px', color: '#666', cursor: 'pointer' }}>Intern</label>
            </div>
          </div>

          {/* Days */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Working Days</label>
              <button onClick={addEditDay} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', border: '1px solid #0f4c81', background: 'white', color: '#0f4c81', cursor: 'pointer' }}>+ Add day</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {editForm.days.map((d, i) => {
                if (d._deleted) return null
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px', alignItems: 'center', background: '#f8f9fa', padding: '10px', borderRadius: '8px', border: '1px solid #eee' }}>
                    <select value={d.day} onChange={e => updateEditDay(i, 'day', e.target.value)}
                      style={{ padding: '7px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }}>
                      <option value="">Day...</option>
                      {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
                    </select>
                    <select value={d.time_start} onChange={e => updateEditDay(i, 'time_start', e.target.value)}
                      style={{ padding: '7px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '12px' }}>
                      <option value="">Start...</option>
                      {ALL_TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={d.time_end} onChange={e => updateEditDay(i, 'time_end', e.target.value)}
                      style={{ padding: '7px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '12px' }}>
                      <option value="">End...</option>
                      {ALL_TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button
                      onClick={() => markDeleteDay(i)}
                      disabled={activeDays.length === 1}
                      title={activeDays.length === 1 ? 'Must have at least one day' : 'Remove this day'}
                      style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #fcc', background: activeDays.length === 1 ? '#f9f9f9' : '#fff5f5', color: activeDays.length === 1 ? '#ccc' : '#c00', cursor: activeDays.length === 1 ? 'not-allowed' : 'pointer', fontSize: '13px' }}>
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={closeEdit} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white', fontSize: '14px' }}>Cancel</button>
            <button onClick={handleEditSave} disabled={editSaving} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0f4c81', color: 'white', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>
              {editSaving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>

      {editingTherapist && <EditModal />}

      {selectedTherapist ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button onClick={() => setSelectedTherapist(null)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer', background: 'white', fontSize: '13px', color: '#666' }}>
              ← Back to therapists
            </button>
            <div>
              <h1 style={{ color: '#0f4c81', margin: '0 0 2px', fontSize: '22px' }}>{selectedTherapist}</h1>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '10px', background: sc?.bg, color: sc?.color, border: `1px solid ${sc?.border}` }}>
                  {therapists.find(t => t.name === selectedTherapist)?.specialty}
                  {therapists.find(t => t.name === selectedTherapist)?.is_intern ? ' · Intern' : ''}
                </span>
                <span style={{ fontSize: '13px', color: '#999' }}>{totalClients} client{totalClients !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {getTherapistDays(selectedTherapist).map(t => (
              <span key={t.day} style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', background: '#E6F1FB', color: '#0C447C', border: '1px solid #B5D4F4' }}>
                {t.day} · {t.time_start} – {t.time_end}
              </span>
            ))}
          </div>

          {Object.keys(therapistClients).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#999', background: '#f8f9fa', borderRadius: '12px' }}>
              No clients assigned to this therapist yet
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {DAYS.filter(d => therapistClients[d]).map(day => (
                <div key={day} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
                  <div style={{ background: '#0f4c81', color: 'white', padding: '10px 16px', fontSize: '13px', fontWeight: '500' }}>
                    {day} · {therapistClients[day].length} client{therapistClients[day].length !== 1 ? 's' : ''}
                  </div>
                  <div style={{ padding: '8px' }}>
                    {therapistClients[day].map((slot, i) => {
                      const clientInfo = getClientInfo(slot.client_name)
                      const isInactive = clientInfo?.status === 'inactive'
                      return (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '8px 10px', borderRadius: '6px', marginBottom: '4px',
                          background: isInactive ? '#f5f5f5' : sc?.bg,
                          border: `1px solid ${isInactive ? '#e0e0e0' : sc?.border}`,
                          opacity: isInactive ? 0.6 : 1
                        }}>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '500', color: isInactive ? '#999' : sc?.color }}>
                              {slot.client_name}
                              {isInactive && <span style={{ fontSize: '10px', marginLeft: '6px', color: '#aaa' }}>(inactive)</span>}
                            </div>
                            <div style={{ fontSize: '11px', color: isInactive ? '#bbb' : sc?.color, opacity: 0.8, marginTop: '2px' }}>
                              {slot.time_start} – {slot.time_end}
                            </div>
                          </div>
                          {clientInfo?.outstanding_balance > 0 && (
                            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '8px', background: '#FCEBEB', color: '#791F1F' }}>
                              ⚠️ Unpaid
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ color: '#0f4c81', margin: '0 0 4px' }}>Therapists</h1>
              <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>
                {uniqueTherapists.length} therapists · {uniqueTherapists.filter(t => therapists.find(x => x.name === t.name)?.is_intern).length} interns
              </p>
            </div>
            <button onClick={() => { setForm(EMPTY_FORM); setShowForm(true) }} style={{
              background: '#0f4c81', color: 'white', border: 'none',
              padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500'
            }}>+ Add therapist</button>
          </div>

          {/* ADD FORM MODAL */}
          {showForm && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '480px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                <h3 style={{ margin: '0 0 1.5rem', color: '#0f4c81' }}>Add therapist</h3>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Specialty</label>
                    <select value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}>
                      {['OT','ST','PT','SPED'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
                    <input type="checkbox" id="is_intern" checked={form.is_intern}
                      onChange={e => setForm({ ...form, is_intern: e.target.checked })} />
                    <label htmlFor="is_intern" style={{ fontSize: '13px', color: '#666', cursor: 'pointer' }}>Intern</label>
                  </div>
                </div>

                {/* Days in add form */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Working Days</label>
                    <button onClick={() => setForm({ ...form, days: [...form.days, { day: '', time_start: '', time_end: '' }] })}
                      style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', border: '1px solid #0f4c81', background: 'white', color: '#0f4c81', cursor: 'pointer' }}>+ Add day</button>
                  </div>
                  {form.days.map((d, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                      <select value={d.day} onChange={e => { const days = [...form.days]; days[i] = { ...days[i], day: e.target.value }; setForm({ ...form, days }) }}
                        style={{ padding: '7px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }}>
                        <option value="">Day...</option>
                        {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
                      </select>
                      <select value={d.time_start} onChange={e => { const days = [...form.days]; days[i] = { ...days[i], time_start: e.target.value }; setForm({ ...form, days }) }}
                        style={{ padding: '7px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '12px' }}>
                        <option value="">Start...</option>
                        {ALL_TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <select value={d.time_end} onChange={e => { const days = [...form.days]; days[i] = { ...days[i], time_end: e.target.value }; setForm({ ...form, days }) }}
                        style={{ padding: '7px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '12px' }}>
                        <option value="">End...</option>
                        {ALL_TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <button onClick={() => { const days = form.days.filter((_, j) => j !== i); setForm({ ...form, days: days.length ? days : [{ day: '', time_start: '', time_end: '' }] }) }}
                        disabled={form.days.length === 1}
                        style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #fcc', background: form.days.length === 1 ? '#f9f9f9' : '#fff5f5', color: form.days.length === 1 ? '#ccc' : '#c00', cursor: form.days.length === 1 ? 'not-allowed' : 'pointer' }}>✕</button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}>Cancel</button>
                  <button onClick={handleAdd} disabled={saving} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0f4c81', color: 'white', cursor: 'pointer', fontWeight: '500' }}>
                    {saving ? 'Saving...' : 'Add therapist'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Loading...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {uniqueTherapists.map((therapist, i) => {
                const days = getTherapistDays(therapist.name)
                const clientCount = [...new Set(master.filter(s => s.therapist === therapist.name).map(s => s.client_name))].length
                const colors = SPECIALTY_COLORS[therapist.specialty] || SPECIALTY_COLORS.OT
                return (
                  <div key={i} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => setSelectedTherapist(therapist.name)} style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                          fontSize: '16px', fontWeight: '600', color: '#0f4c81', textDecoration: 'underline'
                        }}>{therapist.name}</button>
                        <span style={{ fontSize: '12px', padding: '2px 10px', borderRadius: '10px', background: colors.bg, color: colors.color, border: `1px solid ${colors.border}` }}>
                          {therapist.specialty}{therapist.is_intern ? ' · Intern' : ''}
                        </span>
                        <span style={{ fontSize: '12px', color: '#999' }}>{clientCount} client{clientCount !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => openEdit(therapist.name)}
                          style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '5px', border: '1px solid #B5D4F4', background: '#E6F1FB', color: '#0C447C', cursor: 'pointer' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(therapist)}
                          style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '5px', border: '1px solid #fcc', background: '#fff5f5', color: '#c00', cursor: 'pointer' }}>
                          Remove
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                      {days.map((d, di) => (
                        <span key={di} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '10px', background: '#f0f0f0', color: '#666' }}>
                          {d.day} · {d.time_start}–{d.time_end}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}