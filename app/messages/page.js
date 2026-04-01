'use client'
import { useState, useEffect } from 'react'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

const TYPE_COLORS = {
  'Session reminder':  { bg: '#E6F1FB', color: '#0C447C' },
  'Unpaid reminder':   { bg: '#FCEBEB', color: '#791F1F' },
  'Therapist absence': { bg: '#FAEEDA', color: '#633806' },
}

const TEMPLATE_KEYS = ['Session reminder', 'Unpaid reminder', 'Therapist absence']
const TEMPLATE_LABELS = {
  'Session reminder':  'Session reminder (day before)',
  'Unpaid reminder':   'Unpaid session reminder',
  'Therapist absence': 'Therapist absence notice',
}
const TEMPLATE_VARS = '[CLIENT], [DATE], [TIME], [THERAPIST]'

export default function MessagesPage() {
  const [messages, setMessages] = useState([])
  const [templates, setTemplates] = useState({})
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('All')
  const [filterSent, setFilterSent] = useState('Pending')
  const [editingMessage, setEditingMessage] = useState(null)
  const [editText, setEditText] = useState('')
  const [absenceModal, setAbsenceModal] = useState(false)
  const [absenceForm, setAbsenceForm] = useState({ therapist: '', day: '' })
  const [absenceMessages, setAbsenceMessages] = useState([])
  const [therapists, setTherapists] = useState([])
  const [sending, setSending] = useState(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [editTemplates, setEditTemplates] = useState({})
  const [savingTemplates, setSavingTemplates] = useState(false)

  useEffect(() => {
    fetchMessages()
    fetchTherapists()
  }, [])

  async function fetchMessages() {
    setLoading(true)
    const res = await fetch('/api/messages')
    const json = await res.json()
    if (json.success) {
      setMessages(json.data)
      setTemplates(json.templates || {})
      setEditTemplates(json.templates || {})
    }
    setLoading(false)
  }

  async function fetchTherapists() {
    const res = await fetch('/api/therapists')
    const json = await res.json()
    if (json.success) {
      const names = [...new Set(json.data.map(t => t.name))].sort()
      setTherapists(names)
    }
  }

  async function saveTemplates() {
    setSavingTemplates(true)
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_templates', templates: editTemplates })
    })
    const json = await res.json()
    if (json.success) {
      setTemplates(editTemplates)
      setShowTemplates(false)
      alert('Templates saved!')
      fetchMessages()
    } else {
      alert('Error saving: ' + json.error)
    }
    setSavingTemplates(false)
  }

  async function generateAbsenceMessages() {
    if (!absenceForm.therapist || !absenceForm.day) return alert('Please select a therapist and day')
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'absence', ...absenceForm })
    })
    const json = await res.json()
    if (json.success) {
      if (json.data.length === 0) alert(`No scheduled sessions found for ${absenceForm.therapist} on ${absenceForm.day}`)
      else setAbsenceMessages(json.data)
    }
  }

  async function sendMessage(msg, customText) {
    setSending(msg.key)
    const text = customText || msg.message
    const fbUrl = msg.fb_account
      ? `https://m.me/${msg.fb_account.replace(/^https?:\/\/(www\.)?(facebook\.com\/|fb\.com\/|m\.me\/)/, '').replace(/\/$/, '')}`
      : 'https://www.facebook.com/messages'
    window.open(fbUrl, '_blank')
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log', key: msg.key, client_name: msg.client_name, fb_account: msg.fb_account, type: msg.type, message: text })
    })
    setMessages(prev => prev.map(m => m.key === msg.key ? { ...m, sent: true } : m))
    setEditingMessage(null)
    setSending(null)
  }

  async function copyAndLog(msg, customText) {
    const text = customText || msg.message
    await navigator.clipboard.writeText(text)
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log', key: msg.key, client_name: msg.client_name, fb_account: msg.fb_account, type: msg.type, message: text })
    })
    setMessages(prev => prev.map(m => m.key === msg.key ? { ...m, sent: true } : m))
    setEditingMessage(null)
    alert('Message copied!')
  }

  const types = ['All', 'Session reminder', 'Unpaid reminder', 'Therapist absence']
  const filtered = messages.filter(m => {
    const matchType = filterType === 'All' || m.type === filterType
    const matchSent = filterSent === 'All' || (filterSent === 'Pending' && !m.sent) || (filterSent === 'Sent' && m.sent)
    return matchType && matchSent
  })

  const pendingCount = messages.filter(m => !m.sent).length
  const sentCount = messages.filter(m => m.sent).length

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ color: '#0f4c81', margin: '0 0 4px' }}>Messages</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>{pendingCount} pending · {sentCount} sent</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => { setShowTemplates(true); setEditTemplates({ ...templates }) }} style={{
            padding: '9px 16px', borderRadius: '8px', border: '1px solid #ddd',
            cursor: 'pointer', fontSize: '13px', background: 'white', color: '#666'
          }}>Edit templates</button>
          <button onClick={() => { setAbsenceModal(true); setAbsenceMessages([]) }} style={{
            background: '#FAEEDA', color: '#633806', border: '1px solid #EF9F27',
            padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500'
          }}>Therapist absence notice</button>
        </div>
      </div>

      {showTemplates && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '600px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 0.5rem', color: '#0f4c81' }}>Edit message templates</h3>
            <p style={{ margin: '0 0 1.5rem', fontSize: '13px', color: '#999' }}>
              Available variables: <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{TEMPLATE_VARS}</code>
            </p>
            {TEMPLATE_KEYS.map(key => (
              <div key={key} style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '13px', fontWeight: '500', color: '#0f4c81', display: 'block', marginBottom: '6px' }}>
                  {TEMPLATE_LABELS[key]}
                </label>
                <textarea
                  value={editTemplates[key] || ''}
                  onChange={e => setEditTemplates({ ...editTemplates, [key]: e.target.value })}
                  rows={4}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', lineHeight: '1.6', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowTemplates(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={saveTemplates} disabled={savingTemplates} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0f4c81', color: 'white', cursor: 'pointer', fontWeight: '500' }}>
                {savingTemplates ? 'Saving...' : 'Save templates'}
              </button>
            </div>
          </div>
        </div>
      )}

      {absenceModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '520px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 1rem', color: '#0f4c81' }}>Therapist absence notice</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Therapist</label>
                <select value={absenceForm.therapist}
                  onChange={e => setAbsenceForm({ ...absenceForm, therapist: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}>
                  <option value="">Select therapist...</option>
                  {therapists.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Day</label>
                <select value={absenceForm.day}
                  onChange={e => setAbsenceForm({ ...absenceForm, day: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}>
                  <option value="">Select day...</option>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <button onClick={generateAbsenceMessages} style={{
              width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
              background: '#0f4c81', color: 'white', cursor: 'pointer', fontWeight: '500', marginBottom: '1rem'
            }}>Generate absence messages</button>

            {absenceMessages.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>{absenceMessages.length} client{absenceMessages.length !== 1 ? 's' : ''} affected:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                  {absenceMessages.map((m, i) => (
                    <div key={i} style={{ background: '#f8f9fa', borderRadius: '8px', padding: '10px 12px', border: '1px solid #e0e0e0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '500', fontSize: '13px', color: '#0f4c81' }}>{m.client_name}</span>
                        <span style={{ fontSize: '11px', color: '#999' }}>{m.time_start}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', lineHeight: '1.5' }}>{m.message}</div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => sendMessage(m, m.message)} style={{
                          flex: 1, padding: '6px', borderRadius: '6px', border: 'none',
                          background: '#0f4c81', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '500'
                        }}>Open in Messenger</button>
                        <button onClick={() => copyAndLog(m, m.message)} style={{
                          padding: '6px 12px', borderRadius: '6px', border: '1px solid #ddd',
                          background: 'white', cursor: 'pointer', fontSize: '12px', color: '#666'
                        }}>Copy</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => setAbsenceModal(false)} style={{
              width: '100%', marginTop: '1rem', padding: '8px', borderRadius: '6px',
              border: '1px solid #ddd', cursor: 'pointer', background: 'white', color: '#666'
            }}>Close</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['Pending', 'Sent', 'All'].map(f => (
            <button key={f} onClick={() => setFilterSent(f)} style={{
              padding: '7px 16px', borderRadius: '20px', border: 'none',
              cursor: 'pointer', fontSize: '13px', fontWeight: '500',
              background: filterSent === f ? '#0f4c81' : '#f0f0f0',
              color: filterSent === f ? 'white' : '#666'
            }}>{f}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {types.map(t => (
            <button key={t} onClick={() => setFilterType(t)} style={{
              padding: '6px 12px', borderRadius: '20px', border: 'none',
              cursor: 'pointer', fontSize: '12px',
              background: filterType === t ? '#185FA5' : '#f0f0f0',
              color: filterType === t ? 'white' : '#666'
            }}>{t}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Loading messages...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999', background: '#f8f9fa', borderRadius: '12px' }}>
          {filterSent === 'Pending' ? 'No pending messages — all caught up!' : 'No messages found'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map((msg, i) => (
            <div key={i} style={{
              background: 'white', borderRadius: '12px',
              border: `1px solid ${msg.sent ? '#e0e0e0' : '#B5D4F4'}`,
              padding: '1rem 1.25rem',
              opacity: msg.sent ? 0.65 : 1
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '500', fontSize: '14px', color: '#0f4c81' }}>{msg.client_name}</span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: TYPE_COLORS[msg.type]?.bg, color: TYPE_COLORS[msg.type]?.color }}>
                    {msg.type}
                  </span>
                  {msg.sent && <span style={{ fontSize: '11px', color: '#1D9E75' }}>✓ Sent</span>}
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>{msg.date} · {msg.time_start}</div>
              </div>

              {msg.fb_account && (
                <div style={{ fontSize: '12px', color: '#185FA5', marginBottom: '8px' }}>FB: {msg.fb_account}</div>
              )}

              {editingMessage === msg.key ? (
                <div>
                  <textarea value={editText} onChange={e => setEditText(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', lineHeight: '1.6', minHeight: '100px', boxSizing: 'border-box', resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button onClick={() => sendMessage(msg, editText)} disabled={sending === msg.key}
                      style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: '#0f4c81', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                      Open in Messenger
                    </button>
                    <button onClick={() => copyAndLog(msg, editText)}
                      style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#666' }}>Copy</button>
                    <button onClick={() => setEditingMessage(null)}
                      style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#666' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '13px', color: '#444', lineHeight: '1.6', background: '#f8f9fa', padding: '10px 12px', borderRadius: '8px', marginBottom: '8px' }}>
                    {msg.message}
                  </div>
                  {!msg.sent && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => sendMessage(msg, msg.message)} disabled={sending === msg.key}
                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: '#0f4c81', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                        {sending === msg.key ? 'Opening...' : 'Open in Messenger'}
                      </button>
                      <button onClick={() => { setEditingMessage(msg.key); setEditText(msg.message) }}
                        style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#666' }}>Edit</button>
                      <button onClick={() => copyAndLog(msg, msg.message)}
                        style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#666' }}>Copy</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}