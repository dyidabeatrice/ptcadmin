'use client'
import { useState, useEffect } from 'react'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const SPECIALTIES = ['OT','ST','PT','SPED']
const TIME_SLOTS = []
function generateSlots() {
  let h = 8, m = 0
  while (h < 19) {
    const period = h >= 12 ? 'PM' : 'AM'
    const dh = h > 12 ? h - 12 : h === 0 ? 12 : h
    TIME_SLOTS.push(`${dh}:${m.toString().padStart(2,'0')} ${period}`)
    m += 15
    if (m >= 60) { h++; m = 0 }
  }
}
generateSlots()

const SPECIALTY_COLORS = {
  OT: { bg: '#E6F1FB', color: '#0C447C', border: '#B5D4F4' },
  ST: { bg: '#EAF3DE', color: '#27500A', border: '#C0DD97' },
  PT: { bg: '#FAEEDA', color: '#633806', border: '#FAC775' },
  SPED: { bg: '#EEEDFE', color: '#3C3489', border: '#CECBF6' },
}

const EMPTY_FORM = {
  name: '', specialty: 'OT', is_intern: false,
  days: [{ day: 'Monday', time_start: '8:00 AM', time_end: '6:00 PM' }]
}

export default function TherapistsPage() {
  const [therapists, setTherapists] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState('Monday')
  const [showForm, setShowForm] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState('grid')

  useEffect(() => { fetchTherapists() }, [])

  async function fetchTherapists() {
    setLoading(true)
    const res = await fetch('/api/therapists')
    const json = await res.json()
    if (json.success) setTherapists(json.data)
    setLoading(false)
  }

  async function addTherapist() {
    if (!form.name) return alert('Please enter a name')
    if (!form.days.length) return alert('Please add at least one working day')
    setSaving(true)
    await fetch('/api/therapists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    setShowForm(false)
    setForm(EMPTY_FORM)
    fetchTherapists()
    setSaving(false)
  }

  async function saveEdit() {
    setSaving(true)
    await fetch('/api/therapists', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowIndex: editRow.index, ...editRow })
    })
    setEditRow(null)
    fetchTherapists()
    setSaving(false)
  }

  async function deleteRow(rowIndex, name) {
    if (!confirm(`Remove ${name} from this day?`)) return
    const res = await fetch('/api/therapists', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowIndex })
    })
    const json = await res.json()
    if (json.success) fetchTherapists()
    else alert('Delete failed: ' + json.error)
  }

  const dayTherapists = therapists
    .filter(t => t.day === selectedDay)
    .sort((a, b) => {
      if (a.is_intern !== b.is_intern) return a.is_intern ? 1 : -1
      return a.name.localeCompare(b.name)
    })

  const grouped = therapists.reduce((acc, t) => {
    if (!acc[t.name]) acc[t.name] = { name: t.name, specialty: t.specialty, is_intern: t.is_intern, days: [] }
    acc[t.name].days.push({ index: t.index, day: t.day, time_start: t.time_start, time_end: t.time_end })
    return acc
  }, {})

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ color: '#0f4c81', margin: '0 0 4px' }}>Therapists</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>{Object.keys(grouped).length} therapists · {therapists.length} schedule entries</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setView(view === 'grid' ? 'list' : 'grid')} style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer', fontSize: '13px', background: 'white', color: '#666' }}>
            {view === 'grid' ? 'List view' : 'Grid view'}
          </button>
          <button onClick={() => { setForm(EMPTY_FORM); setShowForm(true) }} style={{ background: '#0f4c81', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
            + Add Therapist
          </button>
        </div>
      </div>

      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '500px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 1.25rem', color: '#0f4c81' }}>Add New Therapist</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. JOHN"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Specialty</label>
                <select value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}>
                  {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
                <input type="checkbox" id="is_intern" checked={form.is_intern}
                  onChange={e => setForm({ ...form, is_intern: e.target.checked,
                    days: form.days.map(d => ({ ...d, time_start: e.target.checked ? '8:45 AM' : d.time_start, time_end: e.target.checked ? '4:45 PM' : d.time_end }))
                  })} />
                <label htmlFor="is_intern" style={{ fontSize: '14px', color: '#444', cursor: 'pointer' }}>Intern</label>
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', color: '#666' }}>Working days</label>
                <button onClick={() => setForm({ ...form, days: [...form.days, { day: 'Monday', time_start: form.is_intern ? '8:45 AM' : '8:00 AM', time_end: form.is_intern ? '4:45 PM' : '6:00 PM' }] })}
                  style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '4px', border: '1px solid #0f4c81', color: '#0f4c81', background: 'white', cursor: 'pointer' }}>+ Add day</button>
              </div>
              {form.days.map((d, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <select value={d.day} onChange={e => { const days = [...form.days]; days[i].day = e.target.value; setForm({ ...form, days }) }}
                    style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '12px' }}>
                    {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
                  </select>
                  <select value={d.time_start} onChange={e => { const days = [...form.days]; days[i].time_start = e.target.value; setForm({ ...form, days }) }}
                    disabled={form.is_intern}
                    style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '12px', opacity: form.is_intern ? 0.6 : 1 }}>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={d.time_end} onChange={e => { const days = [...form.days]; days[i].time_end = e.target.value; setForm({ ...form, days }) }}
                    disabled={form.is_intern}
                    style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '12px', opacity: form.is_intern ? 0.6 : 1 }}>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button onClick={() => setForm({ ...form, days: form.days.filter((_, j) => j !== i) })}
                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #fcc', cursor: 'pointer', background: '#fff5f5', color: '#c00', fontSize: '12px' }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={addTherapist} disabled={saving} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0f4c81', color: 'white', cursor: 'pointer', fontWeight: '500' }}>
                {saving ? 'Saving...' : 'Add Therapist'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editRow && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '440px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 1.25rem', color: '#0f4c81' }}>Edit Schedule Entry</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Name</label>
              <input value={editRow.name} onChange={e => setEditRow({ ...editRow, name: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Specialty</label>
                <select value={editRow.specialty} onChange={e => setEditRow({ ...editRow, specialty: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}>
                  {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Day</label>
                <select value={editRow.day} onChange={e => setEditRow({ ...editRow, day: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.5rem' }}>
              {['time_start', 'time_end'].map(key => (
                <div key={key}>
                  <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>{key === 'time_start' ? 'Start time' : 'End time'}</label>
                  <select value={editRow[key]} onChange={e => setEditRow({ ...editRow, [key]: e.target.value })}
                    disabled={editRow.is_intern}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', opacity: editRow.is_intern ? 0.6 : 1 }}>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditRow(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={saveEdit} disabled={saving} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0f4c81', color: 'white', cursor: 'pointer', fontWeight: '500' }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'list' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {Object.values(grouped).sort((a, b) => {
            if (a.is_intern !== b.is_intern) return a.is_intern ? 1 : -1
            return a.name.localeCompare(b.name)
          }).map(t => {
            const sc = SPECIALTY_COLORS[t.specialty] || SPECIALTY_COLORS.OT
            return (
              <div key={t.name} style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '12px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontWeight: '500', fontSize: '14px', color: '#0f4c81', marginBottom: '4px' }}>{t.name}</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{t.specialty}</span>
                      {t.is_intern && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#F1EFE8', color: '#5F5E5A', border: '1px solid #D3D1C7' }}>Intern</span>}
                    </div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '8px' }}>
                  {t.days.sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day)).map((d, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: i < t.days.length - 1 ? '1px solid #f8f8f8' : 'none' }}>
                      <span style={{ fontSize: '12px', color: '#666', minWidth: '80px' }}>{d.day}</span>
                      <span style={{ fontSize: '11px', color: '#999' }}>{d.time_start} – {d.time_end}</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => setEditRow({ index: d.index, name: t.name, specialty: t.specialty, is_intern: t.is_intern, day: d.day, time_start: d.time_start, time_end: d.time_end })}
                          style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '3px', border: '1px solid #ddd', cursor: 'pointer', background: 'white', color: '#444' }}>Edit</button>
                        <button onClick={() => deleteRow(d.index, t.name)}
                          style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '3px', border: '1px solid #fcc', cursor: 'pointer', background: '#fff5f5', color: '#c00' }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {DAYS.map(day => {
              const count = therapists.filter(t => t.day === day).length
              return (
                <button key={day} onClick={() => setSelectedDay(day)} style={{
                  padding: '7px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
                  background: selectedDay === day ? '#0f4c81' : '#f0f0f0',
                  color: selectedDay === day ? 'white' : '#666'
                }}>
                  {day} <span style={{ fontSize: '11px', opacity: 0.7 }}>({count})</span>
                </button>
              )
            })}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Loading...</div>
          ) : dayTherapists.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#999', background: '#f8f9fa', borderRadius: '12px' }}>No therapists for {selectedDay}</div>
          ) : (
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    {['Name', 'Specialty', 'Type', 'Start', 'End', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#666', fontWeight: '500', borderBottom: '1px solid #e0e0e0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dayTherapists.map((t, i) => {
                    const sc = SPECIALTY_COLORS[t.specialty] || SPECIALTY_COLORS.OT
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f0f0f0', background: t.is_intern ? '#fafafa' : 'white' }}>
                        <td style={{ padding: '10px 16px', fontWeight: '500', color: '#0f4c81' }}>{t.name}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{t.specialty}</span>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: t.is_intern ? '#F1EFE8' : '#E6F1FB', color: t.is_intern ? '#5F5E5A' : '#0C447C' }}>
                            {t.is_intern ? 'Intern' : 'Regular'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', color: '#666' }}>{t.time_start}</td>
                        <td style={{ padding: '10px 16px', color: '#666' }}>{t.time_end}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => setEditRow({ ...t })}
                              style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer', background: 'white', color: '#444' }}>Edit</button>
                            <button onClick={() => deleteRow(t.index, t.name)}
                              style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '4px', border: '1px solid #fcc', cursor: 'pointer', background: '#fff5f5', color: '#c00' }}>Remove</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}