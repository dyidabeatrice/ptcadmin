'use client'
import { useState, useEffect, useRef } from 'react'

export default function AnnouncementsPage() {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [reminderText, setReminderText] = useState('')
  const editorRef = useRef(null)

  // Converts old-style plain text (with real newlines) into basic HTML the
  // first time it loads, so existing content doesn't just collapse onto one line.
  function toEditableHTML(text) {
    if (!text) return ''
    if (text.includes('<')) return text // already HTML from a previous save
    return text.split('\n').map(line => line || '<br>').join('<br>')
  }
  const [weatherText, setWeatherText] = useState('')
  const [weatherStart, setWeatherStart] = useState('')
  const [weatherEnd, setWeatherEnd] = useState('')
  const [savingReminder, setSavingReminder] = useState(false)
  const [savingWeather, setSavingWeather] = useState(false)
  const [previewHTML, setPreviewHTML] = useState(null)

  useEffect(() => { fetchAll() }, [])

  // Sets the editor's content only once it's actually mounted (i.e. once
  // loading has finished and the div exists in the DOM) — fixes the timing
  // bug where setting editorRef during the fetch itself was too early.
  useEffect(() => {
    if (!loading && editorRef.current) {
      editorRef.current.innerHTML = reminderText
    }
  }, [loading])

  async function fetchAll() {
    setLoading(true)
    const res = await fetch('/api/announcements')
    const json = await res.json()
    if (json.success) {
      setData(json.data)
      const html = toEditableHTML(json.data.therapist_reminder?.value || '')
      setReminderText(html)
      setWeatherText(json.data.weather_reminder?.value || '')
      setWeatherStart(json.data.weather_reminder?.start_date || '')
      setWeatherEnd(json.data.weather_reminder?.end_date || '')
    }
    setLoading(false)
  }

  async function saveReminder() {
    setSavingReminder(true)
    const html = editorRef.current?.innerHTML || ''
    await fetch('/api/announcements', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'therapist_reminder', value: html, start_date: '', end_date: '' })
    })
    // Don't refetch/reset the editor here — it already shows exactly what was
    // just saved, and re-running fetchAll() would briefly unmount it (via the
    // loading state) and lose its content.
    setData(prev => ({ ...prev, therapist_reminder: { ...prev.therapist_reminder, value: html } }))
    setSavingReminder(false)
  }

  async function saveWeather() {
    if (weatherText && (!weatherStart || !weatherEnd)) {
      alert('Please set both a start and end date for this reminder.')
      return
    }
    setSavingWeather(true)
    await fetch('/api/announcements', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'weather_reminder', value: weatherText, start_date: weatherStart, end_date: weatherEnd })
    })
    await fetchAll()
    setSavingWeather(false)
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '700px', margin: '0 auto' }}>
      <h1 style={{ color: '#0f4c81', margin: '0 0 4px' }}>Announcements</h1>
      <p style={{ margin: '0 0 1.5rem', fontSize: '13px', color: '#999' }}>Manage messages shown to therapists in the portal</p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Loading...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Therapist Reminder */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 4px', color: '#0f4c81', fontSize: '15px' }}>Reminder Tab</h3>
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#999' }}>
              Shown in its own tab in the therapist portal. Leave blank to hide the tab entirely.
            </p>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px', padding: '6px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
              {[
                { cmd: 'bold', icon: 'B', style: { fontWeight: '700' } },
                { cmd: 'italic', icon: 'I', style: { fontStyle: 'italic' } },
                { cmd: 'underline', icon: 'U', style: { textDecoration: 'underline' } },
                { cmd: 'insertUnorderedList', icon: '• List' },
                { cmd: 'insertOrderedList', icon: '1. List' },
              ].map(btn => (
                <button key={btn.cmd} type="button"
                  onMouseDown={e => e.preventDefault()} // keep focus/selection in the editor
                  onClick={() => { document.execCommand(btn.cmd, false, null); editorRef.current?.focus() }}
                  style={{ padding: '6px 10px', borderRadius: '5px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '12px', ...btn.style }}
                >{btn.icon}</button>
              ))}

              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '5px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '12px' }}>
                Text color
                <input type="color" defaultValue="#000000"
                  onMouseDown={e => e.stopPropagation()}
                  onChange={e => { document.execCommand('foreColor', false, e.target.value); editorRef.current?.focus() }}
                  style={{ width: '20px', height: '20px', padding: 0, border: 'none', cursor: 'pointer' }} />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '5px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '12px' }}>
                Highlight
                <input type="color" defaultValue="#fff3cd"
                  onMouseDown={e => e.stopPropagation()}
                  onChange={e => { document.execCommand('hiliteColor', false, e.target.value); editorRef.current?.focus() }}
                  style={{ width: '20px', height: '20px', padding: 0, border: 'none', cursor: 'pointer' }} />
              </label>
            </div>

            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              style={{ width: '100%', minHeight: '150px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box', marginBottom: '12px', lineHeight: '1.6', outline: 'none' }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={saveReminder} disabled={savingReminder} style={{
                padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0f4c81',
                color: 'white', cursor: 'pointer', fontWeight: '500', opacity: savingReminder ? 0.6 : 1
              }}>{savingReminder ? 'Saving...' : 'Save'}</button>
              <button onClick={() => setPreviewHTML(editorRef.current?.innerHTML || '')} style={{
                padding: '8px 20px', borderRadius: '6px', border: '1px solid #0f4c81', background: 'white',
                color: '#0f4c81', cursor: 'pointer', fontWeight: '500'
              }}>Preview</button>
            </div>
          </div>

          {/* Weather / Urgent Reminder */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 4px', color: '#0f4c81', fontSize: '15px' }}>Weather / Urgent Reminder</h3>
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#999' }}>
              Shown as a banner above the color guide on the "My Schedule" tab, only within the date range below.
            </p>
            <textarea value={weatherText} onChange={e => setWeatherText(e.target.value)}
              rows={3} placeholder="e.g. Heads up — heavy rain expected this week, sessions may be affected."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical', marginBottom: '12px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Start date <span style={{ color: '#E24B4A' }}>*</span></label>
                <input type="date" value={weatherStart} onChange={e => setWeatherStart(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>End date <span style={{ color: '#E24B4A' }}>*</span></label>
                <input type="date" value={weatherEnd} onChange={e => setWeatherEnd(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
            </div>
            <button onClick={saveWeather} disabled={savingWeather} style={{
              padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0f4c81',
              color: 'white', cursor: 'pointer', fontWeight: '500', opacity: savingWeather ? 0.6 : 1
            }}>{savingWeather ? 'Saving...' : 'Save'}</button>
          </div>

        </div>
      )}

      {previewHTML !== null && (
        <div onClick={() => setPreviewHTML(null)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#f8f9fa', borderRadius: '12px', padding: '2rem', width: '500px', maxWidth: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#0f4c81', fontSize: '15px' }}>Preview — Reminders Tab</h3>
              <button onClick={() => setPreviewHTML(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', color: '#999' }}>✕</button>
            </div>
            <div
              style={{ background: 'white', borderRadius: '12px', border: '1px solid #B5D4F4', padding: '1.5rem', fontSize: '14px', color: '#0C447C', lineHeight: '1.7' }}
              dangerouslySetInnerHTML={{ __html: previewHTML }}
            />
          </div>
        </div>
      )}
    </div>
  )
}