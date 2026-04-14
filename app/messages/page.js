'use client'
import { useState, useEffect } from 'react'

const MESSAGE_TYPES = {
  'ie_reminder': 'IE Appointment Reminder',
  'outstanding': 'Outstanding Balance',
  'makeup': 'Make-up Schedule',
  'document': 'Document Payment Reminder',
  'policies': 'Clinic Policies',
}

export default function MessagesPage() {
  const [drafts, setDrafts] = useState([])
  const [archive, setArchive] = useState([])
  const [tab, setTab] = useState('drafts')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [composeModal, setComposeModal] = useState(false)
  const [composeForm, setComposeForm] = useState({ client_name: '', type: '', message: '' })
  const [clients, setClients] = useState([])
  const [composeSaving, setComposeSaving] = useState(false)

  useEffect(() => { 
  fetchMessages()
  fetchClients()
}, [tab])

async function fetchClients() {
  const res = await fetch('/api/clients')
  const json = await res.json()
  if (json.success) setClients(json.data.filter(c => c.status !== 'inactive'))
}

  async function composeSend() {
  if (!composeForm.client_name || !composeForm.message) return alert('Please fill in client and message')
  setComposeSaving(true)
  const client = clients.find(c => c.name === composeForm.client_name)
  await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create_draft',
      client_name: composeForm.client_name,
      psid: client?.psid || '',
      type: composeForm.type || 'custom',
      message: composeForm.message
    })
  })
  setComposeModal(false)
  setComposeForm({ client_name: '', type: '', message: '' })
  fetchMessages()
  setComposeSaving(false)
}

  async function fetchMessages() {
    setLoading(true)
    const res = await fetch(`/api/messages?tab=${tab}`)
    const json = await res.json()
    if (json.success) {
      if (tab === 'drafts') setDrafts(json.data)
      else setArchive(json.data)
    }
    setLoading(false)
  }

  async function sendMessage(msg) {
    setSending(msg.id)
    const messageToSend = editingId === msg.id ? editText : msg.message
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', id: msg.id, message: messageToSend })
    })
    const json = await res.json()
    if (!json.success) alert(`Failed to send: ${json.error}`)
    setEditingId(null)
    setSending(null)
    fetchMessages()
  }

  async function saveEdit(msg) {
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_draft', id: msg.id, message: editText })
    })
    setEditingId(null)
    fetchMessages()
  }

  async function deleteMessage(msg) {
    if (!confirm(`Delete this draft for ${msg.client_name}?`)) return
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id: msg.id })
    })
    fetchMessages()
  }

  async function clearOld() {
    if (!confirm('Clear all sent messages older than 3 months?')) return
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear_old' })
    })
    fetchMessages()
  }

  function getTypeColor(type) {
    if (type === 'ie_reminder') return { bg: '#E6F1FB', color: '#0C447C', border: '#B5D4F4' }
    if (type === 'outstanding') return { bg: '#FAEEDA', color: '#633806', border: '#EF9F27' }
    if (type === 'makeup') return { bg: '#EAF3DE', color: '#27500A', border: '#97C459' }
    if (type === 'document') return { bg: '#F3E6FB', color: '#4C0C7C', border: '#C4B5F4' }
    if (type === 'policies') return { bg: '#FFF5E6', color: '#7C4C0C', border: '#F4C4B5' }
    return { bg: '#f8f9fa', color: '#666', border: '#e0e0e0' }
  }

  const messages = tab === 'drafts' ? drafts : archive

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ color: '#0f4c81', margin: '0 0 4px' }}>Messages</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>Review and send messages to clients via Messenger</p>
        </div>
        <button onClick={() => setComposeModal(true)} style={{
          background: '#0f4c81', color: 'white', border: 'none',
          padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500'
        }}>+ Compose</button>
        {tab === 'archive' && (
          <button onClick={clearOld} style={{
            background: 'white', border: '1px solid #ddd', color: '#999',
            padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px'
          }}>Clear old messages</button>
        )}
      </div>

      {composeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '480px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 1.25rem', color: '#0f4c81' }}>Compose message</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Client</label>
              <select value={composeForm.client_name} onChange={e => setComposeForm({ ...composeForm, client_name: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}>
                <option value="">Select client...</option>
                {clients.sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Type</label>
              <select value={composeForm.type} onChange={e => setComposeForm({ ...composeForm, type: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}>
                <option value="">Select type...</option>
                {Object.entries(MESSAGE_TYPES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
                <option value="custom">Custom message</option>
              </select>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Message</label>
              <textarea value={composeForm.message} onChange={e => setComposeForm({ ...composeForm, message: e.target.value })}
                rows={6} placeholder="Type your message..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', lineHeight: '1.6', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'sans-serif' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setComposeModal(false); setComposeForm({ client_name: '', type: '', message: '' }) }}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={composeSend} disabled={composeSaving || !composeForm.client_name || !composeForm.message}
                style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0f4c81', color: 'white', cursor: 'pointer', fontWeight: '500',
                opacity: composeSaving || !composeForm.client_name || !composeForm.message ? 0.5 : 1 }}>
                {composeSaving ? 'Saving...' : 'Save as draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
        {['drafts', 'archive'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 20px', borderRadius: '20px', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: '500',
            background: tab === t ? '#0f4c81' : '#f0f0f0',
            color: tab === t ? 'white' : '#666'
          }}>{t === 'drafts' ? `Drafts ${drafts.length > 0 ? `(${drafts.length})` : ''}` : 'Archive'}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Loading...</div>
      ) : messages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999', background: '#f8f9fa', borderRadius: '12px' }}>
          {tab === 'drafts' ? 'No pending messages — use the Remind button on the Schedule or Documents page to generate messages.' : 'No archived messages.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.map(msg => {
            const tc = getTypeColor(msg.type)
            const isEditing = editingId === msg.id
            const isSending = sending === msg.id
            return (
              <div key={msg.id} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600', color: '#0f4c81', fontSize: '14px' }}>{msg.client_name}</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>
                      {MESSAGE_TYPES[msg.type] || msg.type}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#999' }}>
                    {tab === 'drafts' ? msg.created_at : `Sent: ${msg.sent_at}`}
                  </span>
                </div>
                <div style={{ padding: '12px 16px' }}>
                  {isEditing ? (
                    <textarea value={editText} onChange={e => setEditText(e.target.value)}
                      rows={6}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #0f4c81', fontSize: '13px', lineHeight: '1.6', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'sans-serif' }} />
                  ) : (
                    <div style={{ fontSize: '13px', color: '#333', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{msg.message}</div>
                  )}
                </div>
                {tab === 'drafts' && (
                  <div style={{ padding: '10px 16px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    {isEditing ? (
                      <>
                        <button onClick={() => setEditingId(null)} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white', fontSize: '12px' }}>Cancel</button>
                        <button onClick={() => saveEdit(msg)} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#0f4c81', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>Save</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => deleteMessage(msg)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #fcc', background: '#fff5f5', color: '#c00', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                        <button onClick={() => { setEditingId(msg.id); setEditText(msg.message) }} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white', fontSize: '12px' }}>Edit</button>
{msg.psid ? (
                          <button onClick={() => sendMessage(msg)} disabled={isSending} style={{
                            padding: '6px 16px', borderRadius: '6px', border: 'none',
                            background: '#1D9E75', color: 'white',
                            cursor: 'pointer', fontSize: '12px', fontWeight: '500',
                            opacity: isSending ? 0.7 : 1
                          }}>{isSending ? 'Sending...' : 'Send via Messenger'}</button>
                        ) : msg.phone ? (
                          <a href={`viber://chat?number=+${msg.phone.replace(/\s+/g, '').replace(/^\+/, '')}`}
                            onClick={() => sendMessage(msg)}
                            style={{
                              padding: '6px 16px', borderRadius: '6px', border: 'none',
                              background: '#7360F2', color: 'white',
                              cursor: 'pointer', fontSize: '12px', fontWeight: '500',
                              textDecoration: 'none', display: 'inline-block'
                            }}>Open in Viber</a>
                        ) : (
                          <button disabled style={{
                            padding: '6px 16px', borderRadius: '6px', border: 'none',
                            background: '#ddd', color: 'white',
                            cursor: 'not-allowed', fontSize: '12px'
                          }}>No contact linked</button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}