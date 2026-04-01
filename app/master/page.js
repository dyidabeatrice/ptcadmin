'use client'
import { useState, useEffect } from 'react'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

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

function generateAllSlots() {
  const slots = []
  let h = 8, m = 0
  while (h < 19) {
    slots.push(formatTime(h, m))
    m += 15
    if (m >= 60) { h++; m = 0 }
  }
  return slots
}

const ALL_SLOTS = generateAllSlots()

export default function MasterPage() {
  const [master, setMaster] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState('Monday')
  const [search, setSearch] = useState('')

  useEffect(() => { fetchMaster() }, [])

  async function fetchMaster() {
    setLoading(true)
    const res = await fetch('/api/master')
    const json = await res.json()
    if (json.success) setMaster(json.data)
    setLoading(false)
  }

  const daySlots = master.filter(s => s.day === selectedDay)
  const therapists = [...new Set(daySlots.map(s => s.therapist))].sort()
  const usedSlots = ALL_SLOTS.filter(t => daySlots.some(s => s.time_start === t))

  const filteredMaster = search
    ? master.filter(s =>
        s.client_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.therapist?.toLowerCase().includes(search.toLowerCase())
      )
    : null

  function getSlotsForCell(therapist, time) {
    return daySlots.filter(s => s.time_start === time && s.therapist === therapist)
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ color: '#0f4c81', margin: '0 0 4px' }}>Master schedule</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>
            Permanent recurring template · {master.length} total slots · To make changes, edit clients in the <a href="/clients" style={{ color: '#185FA5' }}>Clients page</a>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input placeholder="Search client or therapist..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', width: '220px' }} />
          {search && (
            <button onClick={() => setSearch('')} style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', fontSize: '12px', background: 'white', color: '#666' }}>Clear</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {DAYS.map(day => {
          const count = master.filter(s => s.day === day).length
          return (
            <button key={day} onClick={() => { setSelectedDay(day); setSearch('') }} style={{
              padding: '7px 16px', borderRadius: '20px', border: 'none',
              cursor: 'pointer', fontSize: '13px', fontWeight: '500',
              background: selectedDay === day && !search ? '#0f4c81' : '#f0f0f0',
              color: selectedDay === day && !search ? 'white' : '#666'
            }}>
              {day} <span style={{ fontSize: '11px', opacity: 0.7 }}>({count})</span>
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
                {filteredMaster.map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 16px', fontWeight: '500', color: '#0f4c81' }}>{s.client_name}</td>
                    <td style={{ padding: '10px 16px', color: '#666' }}>{s.therapist}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#E6F1FB', color: '#0C447C' }}>{s.day}</span>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#666' }}>{s.time_start} – {s.time_end}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      ) : daySlots.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999', background: '#f8f9fa', borderRadius: '12px' }}>
          No recurring slots for {selectedDay} yet — add clients with schedules in the <a href="/clients" style={{ color: '#185FA5' }}>Clients page</a>
        </div>

      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '12px', minWidth: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 14px', background: '#0f4c81', color: 'white', textAlign: 'left', minWidth: '85px', fontWeight: '500', borderRight: '1px solid #1a5fa0', position: 'sticky', left: 0, zIndex: 2 }}>TIME</th>
                {therapists.map(t => (
                  <th key={t} style={{ padding: '10px 12px', background: '#0f4c81', color: 'white', textAlign: 'center', minWidth: '140px', fontWeight: '500', borderRight: '1px solid #1a5fa0', whiteSpace: 'nowrap', fontSize: '12px' }}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usedSlots.map((slot, i) => (
                <tr key={slot} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '5px 14px', color: '#666', fontSize: '11px', borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #f0f0f0', whiteSpace: 'nowrap', fontWeight: '500', position: 'sticky', left: 0, background: i % 2 === 0 ? 'white' : '#fafafa', zIndex: 1 }}>{slot}</td>
                  {therapists.map(therapist => {
                    const slots = getSlotsForCell(therapist, slot)
                    return (
                      <td key={therapist} style={{ padding: '3px 4px', borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #f0f0f0', verticalAlign: 'top' }}>
                        {slots.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {slots.map((s, si) => (
                              <div key={si} style={{ background: '#E6F1FB', border: '1px solid #B5D4F4', borderRadius: '4px', padding: '4px 6px' }}>
                                <div style={{ fontWeight: '500', fontSize: '11px', color: '#0C447C' }}>{s.client_name}</div>
                                <div style={{ fontSize: '10px', color: '#378ADD', marginTop: '1px' }}>{s.time_start}–{s.time_end}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ height: '20px' }} />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '1.5rem', padding: '12px 16px', background: '#FAEEDA', borderRadius: '8px', fontSize: '12px', color: '#633806', border: '1px solid #EF9F27' }}>
        This is a read-only view. To add, edit or remove schedule slots, go to the <a href="/clients" style={{ color: '#633806', fontWeight: '500' }}>Clients page</a> and update the client's schedule there.
      </div>
    </div>
  )
}