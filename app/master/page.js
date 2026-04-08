'use client'
import { useState, useEffect } from 'react'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

const START_GROUPS = [
  { label: '8:00 AM group', start: '8:00 AM' },
  { label: '8:15 AM group', start: '8:15 AM' },
  { label: '8:30 AM group', start: '8:30 AM' },
  { label: '8:45 AM group', start: '8:45 AM' },
]

const SPECIALTY_COLORS = {
  OT:   { bg: '#E6F1FB', border: '#B5D4F4', color: '#0C447C' },
  ST:   { bg: '#EAF3DE', border: '#C0DD97', color: '#27500A' },
  PT:   { bg: '#FAEEDA', border: '#FAC775', color: '#633806' },
  SPED: { bg: '#EEEDFE', border: '#CECBF6', color: '#3C3489' },
}

const BLOCK_STYLES = {
  blocked: { bg: '#555', border: '#444', color: 'white' },
  admin:   { bg: '#d0d0d0', border: '#aaa', color: '#444' },
  open:    { bg: '#E1F5EE', border: '#5DCAA5', color: '#085041' },
}

const BLOCK_DURATIONS = [
  { label: '30 min', mins: 30 },
  { label: '1 hr',   mins: 60 },
  { label: '1.5 hr', mins: 90 },
  { label: '2 hr',   mins: 120 },
  { label: '2.5 hr', mins: 150 },
  { label: '3 hr',   mins: 180 },
  { label: '3.5 hr', mins: 210 },
  { label: '4 hr',   mins: 240 },
]

function parseTime(str) {
  if (!str) return 0
  const [time, period] = str.split(' ')
  let [h, m] = time.split(':').map(Number)
  if (period === 'PM' && h !== 12) h += 12
  if (period === 'AM' && h === 12) h = 0
  return h * 60 + m
}

function formatTime(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const period = h >= 12 ? 'PM' : 'AM'
  const dh = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${dh}:${m.toString().padStart(2, '0')} ${period}`
}

function generateSlots(startMins, endMins) {
  const slots = []
  for (let m = startMins; m <= endMins; m += 15) slots.push(formatTime(m))
  return slots
}

const ROW_HEIGHT = 28

export default function MasterPage() {
  const [master, setMaster] = useState([])
  const [therapistData, setTherapistData] = useState([])
  const [blocked, setBlocked] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState('Monday')
  const [search, setSearch] = useState('')
  const [blockModal, setBlockModal] = useState(null)
  const [blockDuration, setBlockDuration] = useState(60)
  const [blockType, setBlockType] = useState('blocked')
  const [blockLabel, setBlockLabel] = useState('')
  const [savingBlock, setSavingBlock] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importPreview, setImportPreview] = useState([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [mRes, tRes, bRes] = await Promise.all([
      fetch('/api/master?t=' + Date.now()),
      fetch('/api/therapists?t=' + Date.now()),
      fetch('/api/blocked?t=' + Date.now())
    ])
    const [mJson, tJson, bJson] = await Promise.all([mRes.json(), tRes.json(), bRes.json()])
    if (mJson.success) setMaster(mJson.data)
    if (tJson.success) setTherapistData(tJson.data)
    if (bJson.success) setBlocked(bJson.data)
    setLoading(false)
  }

  async function fetchImportPreview() {
    const res = await fetch('/api/import')
    const json = await res.json()
    if (json.success) setImportPreview(json.data)
  }

  async function runImport() {
    setImporting(true)
    const res = await fetch('/api/import', { method: 'POST' })
    const json = await res.json()
    if (json.success) {
      setImportResult(json)
      fetchAll()
    } else {
      alert('Import failed: ' + json.error)
    }
    setImporting(false)
  }

  async function addBlock() {
    if (!blockModal) return
    if (blockType === 'admin' && !blockLabel.trim()) return alert('Please enter a label')
    setSavingBlock(true)
    const endMins = parseTime(blockModal.time_start) + blockDuration
    const time_end = formatTime(endMins)
    await fetch('/api/blocked', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        therapist: blockModal.therapist,
        day: selectedDay,
        time_start: blockModal.time_start,
        time_end,
        type: blockType,
        label: blockLabel
      })
    })
    setBlockModal(null)
    setBlockDuration(60)
    setBlockType('blocked')
    setBlockLabel('')
    fetchAll()
    setSavingBlock(false)
  }

  async function removeBlock(rowIndex) {
    await fetch('/api/blocked', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowIndex })
    })
    fetchAll()
  }

  const dayMaster = master.filter(s => s.day === selectedDay)
  const dayBlocked = blocked.filter(b => b.day === selectedDay)

  const dayTherapists = therapistData
    .filter(t => t.day === selectedDay)
    .reduce((acc, t) => {
      if (!acc.find(x => x.name === t.name)) {
        acc.push({ name: t.name, specialty: t.specialty, is_intern: t.is_intern, time_start: t.time_start, time_end: t.time_end })
      }
      return acc
    }, [])

  function getGroupTherapists(groupStart) {
    return dayTherapists.filter(t => t.time_start === groupStart)
  }

  function getClientSlots(therapistName) {
    return dayMaster.filter(s => s.therapist === therapistName)
  }

   function getBlockedSlots(therapistName) {
    return dayBlocked.filter(b => b.therapist === therapistName && b.type !== 'absent')
  }

  function isTimeOccupied(therapistName, timeMins) {
    return getClientSlots(therapistName).some(s => {
      const sStart = parseTime(s.time_start)
      const sEnd = parseTime(s.time_end)
      return timeMins >= sStart && timeMins < sEnd
    })
  }

  function isTimeBlocked(therapistName, timeMins) {
    return getBlockedSlots(therapistName).some(b => {
      const bStart = parseTime(b.time_start)
      const bEnd = parseTime(b.time_end)
      return timeMins >= bStart && timeMins < bEnd
    })
  }

  const filteredMaster = search
    ? master.filter(s =>
        s.client_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.therapist?.toLowerCase().includes(search.toLowerCase())
      )
    : null

  function GroupGrid({ groupStart }) {
    const groupTherapists = getGroupTherapists(groupStart)
    if (groupTherapists.length === 0) return null

    const latestEnd = groupTherapists.reduce((latest, t) => {
      return parseTime(t.time_end) > parseTime(latest) ? t.time_end : latest
    }, '6:00 PM')
    const endTime = latestEnd
    const startMins = parseTime(groupStart)
    const endMins = parseTime(endTime)
    const slots = generateSlots(startMins, endMins)
    const totalRows = slots.length

    return (
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: '500', color: 'white', background: '#0f4c81', padding: '3px 10px', borderRadius: '10px' }}>{groupStart} start</span>
          <span style={{ fontSize: '12px', color: '#999' }}>{groupTherapists.length} therapist{groupTherapists.length !== 1 ? 's' : ''}</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', minWidth: 'fit-content' }}>

            <div style={{ flexShrink: 0, width: '70px' }}>
              <div style={{ height: '44px', borderBottom: '1px solid #e0e0e0', background: '#f8f9fa' }} />
              {slots.map((slot, i) => (
                <div key={slot} style={{
                  height: `${ROW_HEIGHT}px`,
                  display: 'flex', alignItems: 'center',
                  paddingLeft: '8px',
                  fontSize: i % 4 === 0 ? '10px' : '9px',
                  color: i % 4 === 0 ? '#999' : '#bbb',
                  fontWeight: i % 4 === 0 ? '500' : '400',
                  borderBottom: `1px solid ${i % 4 === 0 ? '#e0e0e0' : '#f5f5f5'}`,
                  background: i % 4 === 0 ? '#fafafa' : 'white',
                  whiteSpace: 'nowrap', boxSizing: 'border-box'
                }}>
                  {slot}
                </div>
              ))}
            </div>

            {groupTherapists.map(therapist => {
              const sc = SPECIALTY_COLORS[therapist.specialty] || SPECIALTY_COLORS.OT
              const clientSlots = getClientSlots(therapist.name)
              const blockedSlots = getBlockedSlots(therapist.name)

              return (
                <div key={therapist.name} style={{ flexShrink: 0, width: '150px', borderLeft: '1px solid #e0e0e0' }}>
                  <div style={{
                    height: '44px', background: '#0f4c81', color: 'white',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    borderBottom: '2px solid #fcc200', padding: '4px'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '500', textAlign: 'center' }}>{therapist.name}</div>
                    <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '2px' }}>{therapist.specialty}{therapist.is_intern ? ' · Intern' : ''}</div>
                  </div>

                  <div style={{ position: 'relative', height: `${totalRows * ROW_HEIGHT}px` }}>
                    {slots.map((slot, i) => {
                      const slotMins = startMins + i * 15
                      const occupied = isTimeOccupied(therapist.name, slotMins)
                      const isBlocked = isTimeBlocked(therapist.name, slotMins)
                      return (
                        <div key={slot}
                          onClick={() => {
                            if (!occupied && !isBlocked) {
                              setBlockModal({ therapist: therapist.name, time_start: slot })
                              setBlockDuration(60)
                              setBlockType('blocked')
                              setBlockLabel('')
                            }
                          }}
                          style={{
                            position: 'absolute',
                            top: `${i * ROW_HEIGHT}px`,
                            width: '100%', height: `${ROW_HEIGHT}px`,
                            borderBottom: `1px solid ${i % 4 === 0 ? '#e8e8e8' : '#f5f5f5'}`,
                            background: i % 4 === 0 ? '#fafafa' : 'white',
                            cursor: occupied || isBlocked ? 'default' : 'pointer',
                          }}
                        />
                      )
                    })}

                    {clientSlots.map((slot, si) => {
                      const slotStartMins = parseTime(slot.time_start)
                      const slotEndMins = parseTime(slot.time_end)
                      const topOffset = ((slotStartMins - startMins) / 15) * ROW_HEIGHT
                      const height = Math.max(((slotEndMins - slotStartMins) / 15) * ROW_HEIGHT - 2, ROW_HEIGHT - 2)
                      const sameSlot = clientSlots.filter(s => s.time_start === slot.time_start)
                      const slotIndex = sameSlot.indexOf(slot)
                      const slotCount = sameSlot.length
                      const stackedTop = topOffset + 1 + (slotIndex * (height / slotCount))
                      const stackedHeight = Math.max((height / slotCount) - 2, 14)

                      return (
                        <div key={si} style={{
                          position: 'absolute',
                          top: `${slotCount > 1 ? stackedTop : topOffset + 1}px`,
                          left: '3%',
                          width: '94%',
                          height: `${slotCount > 1 ? stackedHeight : height}px`,
                          background: sc.bg,
                          border: `1px solid ${sc.border}`,
                          borderRadius: '4px',
                          padding: '3px 5px',
                          overflow: 'hidden',
                          boxSizing: 'border-box',
                          zIndex: 1
                        }}>
                          <div style={{ fontSize: '10px', fontWeight: '500', color: sc.color, lineHeight: '1.3' }}>{slot.client_name}</div>
                          <div style={{ fontSize: '9px', color: sc.color, opacity: 0.7, marginTop: '1px' }}>{slot.time_start}–{slot.time_end}</div>
                        </div>
                      )
                    })}

                    {blockedSlots.map((b, bi) => {
                      const bStartMins = parseTime(b.time_start)
                      const bEndMins = parseTime(b.time_end)
                      const topOffset = ((bStartMins - startMins) / 15) * ROW_HEIGHT
                      const height = Math.max(((bEndMins - bStartMins) / 15) * ROW_HEIGHT - 2, ROW_HEIGHT - 2)
                      const bStyle = BLOCK_STYLES[b.type] || BLOCK_STYLES.blocked

                      return (
                        <div key={bi}
                          onClick={() => { if (confirm('Remove this slot?')) removeBlock(b.index) }}
                          style={{
                            position: 'absolute',
                            top: `${topOffset + 1}px`,
                            left: '2%', width: '96%',
                            height: `${height}px`,
                            background: bStyle.bg,
                            border: `1px solid ${bStyle.border}`,
                            borderRadius: '4px',
                            boxSizing: 'border-box',
                            zIndex: 2,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '2px 4px',
                            overflow: 'hidden'
                          }}>
                          {b.type !== 'blocked' && (
                            <div style={{ fontSize: '9px', color: bStyle.color, fontWeight: '500', textAlign: 'center', lineHeight: '1.3' }}>
                              {b.type === 'open' ? 'Open for decking' : b.label}
                            </div>
                          )}
                          {b.type === 'open' && b.label && (
                            <div style={{ fontSize: '8px', color: bStyle.color, opacity: 0.8, textAlign: 'center', marginTop: '1px' }}>{b.label}</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ color: '#0f4c81', margin: '0 0 4px' }}>Master schedule</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>
            {master.length} slots · Edit clients via <a href="/clients" style={{ color: '#185FA5' }}>Clients</a> · Add therapists via <a href="/therapists" style={{ color: '#185FA5' }}>Therapists</a>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input placeholder="Search client or therapist..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', width: '200px' }} />
          <button onClick={async () => {
            if (!confirm('Rebuild entire master schedule from clients data? This will clear and rewrite all entries.')) return
            const res = await fetch('/api/master/rebuild', { method: 'POST' })
            const json = await res.json()
            if (json.success) {
              alert(`Done! Rebuilt ${json.rebuilt} entries.`)
              fetchAll()
            } else {
              alert('Rebuild failed: ' + json.error)
            }
          }} style={{
            padding: '9px 16px', borderRadius: '8px', border: '1px solid #E24B4A',
            cursor: 'pointer', fontSize: '13px', background: '#FCEBEB', color: '#791F1F', fontWeight: '500'
          }}>↺ Rebuild from clients</button>
          <button onClick={() => { setShowImport(true); setImportResult(null); fetchImportPreview() }} style={{
            padding: '9px 16px', borderRadius: '8px', border: '1px solid #1D9E75',
            cursor: 'pointer', fontSize: '13px', background: '#EAF3DE', color: '#27500A', fontWeight: '500'
          }}>Import from sheet</button>
        </div>
      </div>

      {showImport && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '560px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 0.5rem', color: '#0f4c81' }}>Import from sheet</h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '13px', color: '#999' }}>
              Reads all rows from your <strong style={{ fontWeight: '500' }}>import</strong> tab. Skips duplicates — safe to run multiple times.
            </p>

            {importResult ? (
              <div>
                <div style={{ background: '#EAF3DE', border: '1px solid #97C459', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: '500', color: '#27500A', marginBottom: '8px' }}>Import complete!</div>
                  <div style={{ fontSize: '13px', color: '#27500A', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span>✓ {importResult.imported_clients} new client{importResult.imported_clients !== 1 ? 's' : ''} created</span>
                    <span>✓ {importResult.imported_slots} master schedule slots added</span>
                    {importResult.skipped_clients > 0 && <span style={{ color: '#633806' }}>↷ {importResult.skipped_clients} clients already existed (skipped)</span>}
                    {importResult.skipped_slots > 0 && <span style={{ color: '#633806' }}>↷ {importResult.skipped_slots} slots already existed (skipped)</span>}
                  </div>
                </div>
                {importResult.skipped_client_names?.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>Skipped (already in system):</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {importResult.skipped_client_names.map(n => (
                        <span key={n} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#f0f0f0', color: '#666' }}>{n}</span>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={() => setShowImport(false)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: '#0f4c81', color: 'white', cursor: 'pointer', fontWeight: '500' }}>Done</button>
              </div>
            ) : (
              <div>
                {importPreview.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#999', background: '#f8f9fa', borderRadius: '8px', marginBottom: '1rem' }}>
                    No rows found in import tab
                  </div>
                ) : (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>{importPreview.length} rows found:</div>
                    <div style={{ background: '#f8f9fa', borderRadius: '8px', overflow: 'hidden', maxHeight: '300px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: '#f0f0f0' }}>
                            {['Client', 'Therapist', 'Day', 'Time'].map(h => (
                              <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#666', fontWeight: '500', borderBottom: '1px solid #e0e0e0' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                              <td style={{ padding: '7px 10px', color: '#0f4c81', fontWeight: '500' }}>{row.client_name}</td>
                              <td style={{ padding: '7px 10px', color: '#666' }}>{row.therapist}</td>
                              <td style={{ padding: '7px 10px', color: '#666' }}>{row.day}</td>
                              <td style={{ padding: '7px 10px', color: '#666' }}>{row.time_start}–{row.time_end}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <div style={{ background: '#FAEEDA', border: '1px solid #EF9F27', borderRadius: '8px', padding: '10px 12px', marginBottom: '1rem', fontSize: '12px', color: '#633806' }}>
                  This will create client records and master schedule entries. Existing entries will be skipped.
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowImport(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer', background: 'white', color: '#666' }}>Cancel</button>
                  <button onClick={runImport} disabled={importing || importPreview.length === 0} style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', background: '#0f4c81', color: 'white', cursor: 'pointer', fontWeight: '500', opacity: importPreview.length === 0 ? 0.5 : 1 }}>
                    {importing ? 'Importing...' : `Import ${importPreview.length} rows`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {blockModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '380px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 0.5rem', color: '#0f4c81' }}>Mark slot</h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '13px', color: '#999' }}>{blockModal.therapist} · {selectedDay} · {blockModal.time_start}</p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '8px' }}>Type</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { value: 'blocked', label: 'Blocked', sub: 'Therapist not taking a client', color: '#444' },
                  { value: 'admin',   label: 'Admin / Other', sub: 'Meeting, duties, etc — add a label', color: '#666' },
                  { value: 'open',    label: 'Open for decking', sub: 'Available for new client — optional note', color: '#085041' },
                ].map(opt => (
                  <button key={opt.value} onClick={() => { setBlockType(opt.value); setBlockLabel('') }} style={{
                    padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                    border: blockType === opt.value ? `2px solid ${opt.color}` : '1px solid #ddd',
                    background: blockType === opt.value
                      ? (opt.value === 'open' ? '#E1F5EE' : opt.value === 'admin' ? '#f5f5f5' : '#eee')
                      : 'white',
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: opt.color }}>{opt.label}</div>
                    <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {blockType === 'admin' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Label</label>
                <input value={blockLabel} onChange={e => setBlockLabel(e.target.value)}
                  placeholder="e.g. Admin Duties, Team Meeting, Training..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
            )}

            {blockType === 'open' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Note <span style={{ color: '#aaa', fontWeight: '400' }}>(optional)</span></label>
                <input value={blockLabel} onChange={e => setBlockLabel(e.target.value)}
                  placeholder="e.g. CBT only, ST preferred, Morning slot..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '8px' }}>Duration</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {BLOCK_DURATIONS.map(d => (
                  <button key={d.mins} onClick={() => setBlockDuration(d.mins)} style={{
                    padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px',
                    border: blockDuration === d.mins ? '2px solid #0f4c81' : '1px solid #ddd',
                    background: blockDuration === d.mins ? '#E6F1FB' : 'white',
                    color: blockDuration === d.mins ? '#0f4c81' : '#666',
                    fontWeight: blockDuration === d.mins ? '500' : '400'
                  }}>{d.label}</button>
                ))}
              </div>
            </div>

            <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '10px 12px', marginBottom: '1.25rem', fontSize: '13px', color: '#666' }}>
              {blockModal.time_start} – {formatTime(parseTime(blockModal.time_start) + blockDuration)}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setBlockModal(null); setBlockType('blocked'); setBlockLabel('') }}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={addBlock} disabled={savingBlock} style={{ flex: 2, padding: '8px', borderRadius: '6px', border: 'none', background: '#0f4c81', color: 'white', cursor: 'pointer', fontWeight: '500' }}>
                {savingBlock ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '6px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {DAYS.map(day => {
          const count = master.filter(s => s.day === day).length
          const therapistCount = [...new Set(therapistData.filter(t => t.day === day).map(t => t.name))].length
          return (
            <button key={day} onClick={() => { setSelectedDay(day); setSearch('') }} style={{
              padding: '7px 16px', borderRadius: '20px', border: 'none',
              cursor: 'pointer', fontSize: '13px', fontWeight: '500',
              background: selectedDay === day && !search ? '#0f4c81' : '#f0f0f0',
              color: selectedDay === day && !search ? 'white' : '#666'
            }}>
              {day}
              <span style={{ fontSize: '10px', opacity: 0.7, marginLeft: '4px' }}>({therapistCount}T · {count}S)</span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Loading...</div>

      ) : search && filteredMaster ? (
        <div>
          <p style={{ fontSize: '13px', color: '#999', marginBottom: '12px' }}>
            {filteredMaster.length} result{filteredMaster.length !== 1 ? 's' : ''} for "{search}"
          </p>
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  {['Client', 'Therapist', 'Day', 'Time'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#666', fontWeight: '500', borderBottom: '1px solid #e0e0e0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMaster.map((s, i) => {
                  const sc = SPECIALTY_COLORS[therapistData.find(t => t.name === s.therapist)?.specialty] || SPECIALTY_COLORS.OT
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '10px 16px', fontWeight: '500', color: '#0f4c81' }}>{s.client_name}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '10px', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{s.therapist}</span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#E6F1FB', color: '#0C447C' }}>{s.day}</span>
                      </td>
                      <td style={{ padding: '10px 16px', color: '#666' }}>{s.time_start} – {s.time_end}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      ) : dayTherapists.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999', background: '#f8f9fa', borderRadius: '12px' }}>
          No therapists for {selectedDay} — add them in <a href="/therapists" style={{ color: '#185FA5' }}>Therapists</a>
        </div>

      ) : (
        <div>
          {START_GROUPS.map(group => (
            <GroupGrid key={group.start} groupStart={group.start} />
          ))}

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '1rem', alignItems: 'center' }}>
            {Object.entries(SPECIALTY_COLORS).map(([specialty, colors]) => (
              <span key={specialty} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#666' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: colors.bg, border: `1px solid ${colors.border}`, display: 'inline-block' }}></span>
                {specialty}
              </span>
            ))}
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#666' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#555', border: '1px solid #444', display: 'inline-block' }}></span>
              Blocked
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#666' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#d0d0d0', border: '1px solid #aaa', display: 'inline-block' }}></span>
              Admin/Other
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#666' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#E1F5EE', border: '1px solid #5DCAA5', display: 'inline-block' }}></span>
              Open for decking
            </span>
            <span style={{ fontSize: '11px', color: '#ccc' }}>· Click empty slot to mark · Click marked slot to remove</span>
          </div>
        </div>
      )}

      <div style={{ marginTop: '1.5rem', padding: '12px 16px', background: '#FAEEDA', borderRadius: '8px', fontSize: '12px', color: '#633806', border: '1px solid #EF9F27' }}>
        Read-only for clients — edit via <a href="/clients" style={{ color: '#633806', fontWeight: '500' }}>Clients page</a> · Add therapists via <a href="/therapists" style={{ color: '#633806', fontWeight: '500' }}>Therapists page</a> · Click any empty slot to mark it
      </div>
    </div>
  )
}