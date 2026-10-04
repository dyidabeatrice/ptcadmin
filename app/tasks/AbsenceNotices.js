'use client'
import { useState, useEffect } from 'react'
import { fetchJSON } from '../lib/fetchJSON'

// A therapist absence longer than this many days (or open-ended) goes under "On leave".
const LONG_LEAVE_DAYS = 7
// Safety cap so one mistyped end date can't create dozens of repeated week lines.
const MAX_WEEKS_PER_NOTICE = 12

const isoOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const parse = iso => new Date(iso + 'T00:00:00')
const todayISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
function shiftISO(iso, days) { const d = parse(iso); d.setDate(d.getDate() + days); return isoOf(d) }
function mondayOf(iso) {
  const d = parse(iso)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return isoOf(d)
}
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000)
const fmtShort = iso => parse(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const fmtDay = iso => parse(iso).toLocaleDateString('en-US', { weekday: 'short' })

function fmtRange(start, end) {
  if (!end || end === start) return `${fmtShort(start)} (${fmtDay(start)})`
  const s = parse(start), e = parse(end)
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
  const dates = sameMonth ? `${fmtShort(start)}–${e.getDate()}` : `${fmtShort(start)} – ${fmtShort(end)}`
  return `${dates} (${fmtDay(start)}–${fmtDay(end)})`
}

function weekLabel(mondayIso) {
  const sat = shiftISO(mondayIso, 5)
  const m = parse(mondayIso), s = parse(sat)
  const endPart = m.getMonth() === s.getMonth() ? s.getDate() : fmtShort(sat)
  return `Week ${fmtShort(mondayIso)}–${endPart}`
}

const EMPTY_FORM = { type: 'client', name: '', date: '', end_date: '', note: '', open_ended: false }

export default function AbsenceNotices({ clients = [] }) {
  const [notices, setNotices] = useState([])
  const [therapistNames, setTherapistNames] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    setLoadError(false)
    const [nJson, tJson] = await Promise.all([fetchJSON('/api/absence-notices'), fetchJSON('/api/therapists')])
    if (nJson.success) setNotices(nJson.data)
    else setLoadError(true)
    if (tJson.success) setTherapistNames([...new Set(tJson.data.map(t => t.name).filter(Boolean))].sort())
    setLoading(false)
  }

  async function loadNotices() {
    const json = await fetchJSON('/api/absence-notices')
    if (json.success) setNotices(json.data)
  }

  async function save() {
    setSaving(true)
    const res = await fetch('/api/absence-notices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const json = await res.json()
    setSaving(false)
    if (!json.success) { alert(json.error || 'Could not save. Please try again.'); return }
    setModal(false)
    loadNotices()
  }

  async function remove(id) {
    if (!confirm('Remove this notice?')) return
    await fetch('/api/absence-notices', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    loadNotices()
  }

  async function markReturned(n) {
    if (!confirm(`Mark ${n.name} as returned?`)) return
    await fetch('/api/absence-notices', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'returned', id: n.id })
    })
    loadNotices()
  }

  const today = todayISO()
  const tomorrow = shiftISO(today, 1)
  const thisWeek = mondayOf(today)

  // Normalise: `last` is the final day of the absence (null = open-ended).
  const all = notices.map(n => ({
    ...n,
    last: n.open_ended ? null : (n.end_date || n.date)
  }))
  const spanDays = n => (n.last ? daysBetween(n.date, n.last) + 1 : Infinity)
  const isLeave = n => n.type === 'therapist' && (n.open_ended || spanDays(n) > LONG_LEAVE_DAYS)

  // ON LEAVE: therapists only
  const leaves = all
    .filter(n => isLeave(n) && (n.open_ended || n.last >= today))
    .sort((a, b) => a.date.localeCompare(b.date))

  function leaveDates(n) {
    if (n.open_ended) return n.date <= today ? `Since ${fmtShort(n.date)}` : `From ${fmtShort(n.date)}`
    return `${fmtShort(n.date)} – ${fmtShort(n.last)}`
  }
  function leaveTag(n) {
    if (n.date > today) return `Starts ${fmtShort(n.date)}`
    if (n.open_ended) return 'Open-ended'
    return `Day ${daysBetween(n.date, today) + 1} of ${spanDays(n)}`
  }

  // UPCOMING & INDIVIDUAL ABSENCES: grouped by week. An absence that spans
  // several weeks is listed under each week it touches ("continued").
  const byWeek = {}
  all.filter(n => !isLeave(n)).forEach(n => {
    const last = n.last || n.date
    const first = mondayOf(n.date)
    const lastWeek = mondayOf(last)
    let wk = first
    let i = 0
    while (wk <= lastWeek && i < MAX_WEEKS_PER_NOTICE) {
      if (shiftISO(wk, 5) >= today) {
        if (!byWeek[wk]) byWeek[wk] = []
        byWeek[wk].push({ n, last, continued: i > 0 })
      }
      wk = shiftISO(wk, 7)
      i++
    }
  })
  const weekKeys = Object.keys(byWeek).sort()

  const matchesFilter = type => filter === 'all' || filter === type
  const showLeaves = filter !== 'client'

  const clientNames = clients.map(c => c.name).sort((a, b) => a.localeCompare(b))
  const nameOptions = form.type === 'client' ? clientNames : therapistNames
  const validName = nameOptions.includes(form.name)
  const badRange = form.end_date && form.end_date < form.date

  const sectionTitle = { fontSize: '11px', fontWeight: '700', color: '#4C0C7C', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }

  const visibleWeeks = weekKeys
    .map(wk => ({ wk, items: byWeek[wk].filter(x => matchesFilter(x.n.type)).sort((a, b) => a.n.date.localeCompare(b.n.date) || a.n.name.localeCompare(b.n.name)) }))
    .filter(w => w.items.length > 0)

  const nothing = (!showLeaves || leaves.length === 0) && visibleWeeks.length === 0

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[['all', 'All'], ['client', 'Clients'], ['therapist', 'Therapists']].map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)} style={{
              padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500',
              background: filter === key ? '#0f4c81' : '#f0f0f0', color: filter === key ? 'white' : '#666'
            }}>{label}</button>
          ))}
        </div>
        <button onClick={() => { setForm(EMPTY_FORM); setModal(true) }} style={{
          padding: '8px 16px', borderRadius: '8px', background: '#1D9E75', color: 'white', border: 'none', fontSize: '13px', fontWeight: '500', cursor: 'pointer'
        }}>+ Add notice</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Loading...</div>
      ) : loadError ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#791F1F', background: '#FCEBEB', borderRadius: '12px' }}>
          Couldn't load notices. <button onClick={loadAll} style={{ background: 'none', border: 'none', color: '#0f4c81', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit' }}>Tap to retry</button>
        </div>
      ) : nothing ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999', background: '#f8f9fa', borderRadius: '12px' }}>No upcoming absence notices.</div>
      ) : (
        <>
          {showLeaves && leaves.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={sectionTitle}>On leave</div>
              {leaves.map(n => (
                <div key={n.id} title={`Logged ${n.logged_at}`} style={{ background: '#F7F4FB', border: '1px solid #D9CFF0', borderRadius: '10px', padding: '10px 14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: '13px' }}>
                    <div>
                      <span style={{ fontWeight: '600', color: '#0f4c81' }}>{n.name}</span>
                      <span style={{ color: '#555', marginLeft: '8px', fontSize: '12px' }}>{leaveDates(n)}</span>
                      <span style={{ fontSize: '10px', padding: '1px 8px', borderRadius: '10px', background: '#EDE6F9', color: '#4C0C7C', fontWeight: '700', marginLeft: '8px' }}>{leaveTag(n)}</span>
                    </div>
                    {n.note && <div style={{ fontSize: '11px', color: '#777', marginTop: '2px' }}>{n.note}</div>}
                  </div>
                  <button onClick={() => markReturned(n)} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', border: '1px solid #97C459', background: '#EAF3DE', color: '#27500A', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: '500' }}>Mark returned</button>
                  <button onClick={() => remove(n.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', color: '#ccc' }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {visibleWeeks.length > 0 && (
            <>
              <div style={{ ...sectionTitle, color: '#0f4c81' }}>Upcoming &amp; individual absences</div>
              {visibleWeeks.map(({ wk, items }) => (
                <div key={wk} style={{ marginBottom: '1.1rem' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f4c81', paddingBottom: '5px', borderBottom: '2px solid #E6F1FB', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {weekLabel(wk)}
                    {wk === thisWeek && <span style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '10px', background: '#fcc200', color: '#7C5800', fontWeight: '700' }}>THIS WEEK</span>}
                  </div>
                  {items.map(({ n, last, continued }) => {
                    const isClient = n.type === 'client'
                    const past = last < today
                    const covers = day => n.date <= day && last >= day
                    const tag = past ? null : covers(today) ? 'Today' : covers(tomorrow) ? 'Tomorrow' : null
                    return (
                      <div key={`${n.id}-${wk}`} title={`Logged ${n.logged_at}`} style={{ display: 'flex', alignItems: 'baseline', gap: '8px', padding: '6px 4px', fontSize: '12px', borderBottom: '1px solid #f1f1f1', opacity: past ? 0.45 : 1 }}>
                        <span style={{
                          flex: '0 0 62px', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '2px 0', borderRadius: '8px', textAlign: 'center',
                          background: isClient ? '#E6F1FB' : '#F3E6FB', color: isClient ? '#0C447C' : '#4C0C7C'
                        }}>{isClient ? 'Client' : 'Therapist'}</span>
                        <span style={{ fontWeight: '600', color: '#0f4c81' }}>{n.name}</span>
                        <span style={{ color: '#555', whiteSpace: 'nowrap' }}>{fmtRange(n.date, last)}</span>
                        {tag && <span style={{ fontSize: '9px', padding: '1px 7px', borderRadius: '10px', background: '#FAEEDA', color: '#633806', fontWeight: '700' }}>{tag}</span>}
                        <span style={{ color: '#888', flex: 1, minWidth: 0 }}>{n.note}</span>
                        {continued && <span style={{ fontSize: '9px', color: '#aaa', fontStyle: 'italic' }}>continued</span>}
                        <button onClick={() => remove(n.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', color: '#ccc', marginLeft: 'auto' }}>✕</button>
                      </div>
                    )
                  })}
                </div>
              ))}
              <div style={{ fontSize: '11px', color: '#bbb', marginTop: '1rem', textAlign: 'center' }}>Hover a line to see when it was logged. A week drops off this list after its Saturday has passed.</div>
            </>
          )}
        </>
      )}

      {modal && (
        <div onClick={() => !saving && setModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', width: '400px', maxWidth: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 1rem', color: '#0f4c81', fontSize: '15px' }}>Add absence notice</h3>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              {['client', 'therapist'].map(t => (
                <button key={t} onClick={() => setForm({ ...form, type: t, name: '', open_ended: false })} style={{
                  padding: '7px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px',
                  border: form.type === t ? '2px solid #0f4c81' : '1px solid #ddd',
                  background: form.type === t ? '#E6F1FB' : 'white',
                  color: form.type === t ? '#0f4c81' : '#666', fontWeight: form.type === t ? '500' : '400'
                }}>{t === 'client' ? 'Client' : 'Therapist'}</button>
              ))}
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>{form.type === 'client' ? 'Client' : 'Therapist'}</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                list="absence-name-list" placeholder="Type or pick from the list..."
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: form.name && !validName ? '1px solid #EF9F27' : '1px solid #ddd', fontSize: '13px', boxSizing: 'border-box' }} />
              <datalist id="absence-name-list">
                {nameOptions.map(n => <option key={n} value={n} />)}
              </datalist>
              {form.name && !validName && <div style={{ fontSize: '11px', color: '#B26A00', marginTop: '3px' }}>Pick a name from the list so spelling matches.</div>}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Absent on</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Until (optional)</label>
                <input type="date" value={form.end_date} disabled={form.open_ended} onChange={e => setForm({ ...form, end_date: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: badRange ? '1px solid #E24B4A' : '1px solid #ddd', fontSize: '13px', boxSizing: 'border-box', background: form.open_ended ? '#f5f5f5' : 'white' }} />
                {form.type === 'therapist' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#666', marginTop: '6px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.open_ended} onChange={e => setForm({ ...form, open_ended: e.target.checked, end_date: e.target.checked ? '' : form.end_date })} />
                    Open-ended (until further notice)
                  </label>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Note</label>
              <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
                placeholder="e.g. fever, out of town, half-day"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', boxSizing: 'border-box' }} />
              <div style={{ fontSize: '11px', color: '#999', marginTop: '3px' }}>The time you log this is saved automatically.</div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={() => setModal(false)} disabled={saving} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={save} disabled={saving || !validName || !form.date || badRange} style={{
                padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#0f4c81', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
                opacity: (saving || !validName || !form.date || badRange) ? 0.5 : 1
              }}>{saving ? 'Saving...' : 'Save notice'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}