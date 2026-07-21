'use client'
import { useState, useEffect } from 'react'

const TABS = ['To-do', 'Inquiries']

const TASK_TYPES = [
  { value: 'ie', label: 'IE Reminder', color: '#E6F1FB', border: '#B5D4F4', text: '#0C447C' },
  { value: 'makeup', label: 'Make-up', color: '#EAF3DE', border: '#97C459', text: '#27500A' },
  { value: 'other', label: 'Other', color: '#f8f9fa', border: '#e0e0e0', text: '#666' },
]

export default function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ type: 'ie', client_name: '', therapist: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('To-do')
  const [inquiries, setInquiries] = useState([])
  const [expandedContacts, setExpandedContacts] = useState({})
  const [newNoteForm, setNewNoteForm] = useState({})
  const [addContactModal, setAddContactModal] = useState(false)
  const [newContact, setNewContact] = useState({ contact_name: '', recorded_by: '', note: '' })
  const [inquirySaving, setInquirySaving] = useState(false)

  useEffect(() => { fetchAll(); fetchInquiries() }, [])

  async function fetchInquiries() {
    const res = await fetch('/api/inquiries')
    const json = await res.json()
    if (json.success) setInquiries(json.data)
  }

  async function addNoteToContact(contactName) {
    const entry = newNoteForm[contactName]
    if (!entry?.note) return alert('Please enter a note')
    setInquirySaving(true)
    await fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_name: contactName, note: entry.note, recorded_by: entry.recorded_by || '' })
    })
    setNewNoteForm(prev => ({ ...prev, [contactName]: { note: '', recorded_by: '' } }))
    await fetchInquiries()
    setInquirySaving(false)
  }

  async function deleteInquiryEntry(index) {
    if (!confirm('Delete this note?')) return
    await fetch('/api/inquiries', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index })
    })
    await fetchInquiries()
  }

  async function fetchAll() {
    setLoading(true)
    const [tRes, cRes] = await Promise.all([fetch('/api/tasks'), fetch('/api/clients')])
    const [tJson, cJson] = await Promise.all([tRes.json(), cRes.json()])
    if (tJson.success) setTasks(tJson.data)
    if (cJson.success) setClients(cJson.data.filter(c => c.status !== 'inactive'))
    setLoading(false)
  }

  async function addTask() {
    if (!form.notes && !form.client_name) return alert('Please add a note or select a client')
    setSaving(true)
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    setForm({ type: 'ie', client_name: '', therapist: '', notes: '' })
    await fetchAll()
    setSaving(false)
  }

  async function deleteTask(id) {
    await fetch('/api/tasks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  async function sendRemind(task) {
    const client = clients.find(c => c.name === task.client_name)
    const message = task.type === 'ie'
      ? `Hi! Just a reminder that ${task.client_name} has an upcoming Initial Evaluation appointment${task.therapist ? ` with ${task.therapist}` : ''}. Please confirm your attendance. Thank you! 😊`
      : `Hi! We'd like to schedule a make-up session for ${task.client_name}${task.therapist ? ` with ${task.therapist}` : ''}. Please let us know your availability. Thank you! 😊`
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_draft',
        client_name: task.client_name,
        psid: client?.psid || '',
        type: task.type === 'ie' ? 'ie_reminder' : 'makeup',
        message
      })
    })
    alert('Reminder added to message drafts!')
  }

  function getClientTherapists(clientName) {
    const client = clients.find(c => c.name === clientName)
    if (!client || !client.schedule) return []
    return [...new Set(client.schedule.split(';').map(s => s.split('|')[0]).filter(Boolean))]
  }

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.type === filter)
  const counts = { ie: tasks.filter(t => t.type === 'ie').length, makeup: tasks.filter(t => t.type === 'makeup').length, other: tasks.filter(t => t.type === 'other').length }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '8px 18px', borderRadius: '20px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: '600',
              background: activeTab === tab ? '#0f4c81' : '#f0f0f0',
              color: activeTab === tab ? 'white' : '#666'
            }}>{tab}</button>
          ))}
        </div>
        {activeTab === 'Inquiries' && (
          <button onClick={() => setAddContactModal(true)} style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd',
            background: 'white', color: '#0f4c81', cursor: 'pointer', fontSize: '13px', fontWeight: '500'
          }}>+ Add inquiry</button>
        )}
      </div>

      {activeTab === 'To-do' && (
      <>
      {/* Add task form */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {TASK_TYPES.map(t => (
            <button key={t.value} onClick={() => setForm({ ...form, type: t.value, client_name: '', therapist: '', notes: '' })} style={{
              padding: '6px 14px', borderRadius: '20px', border: form.type === t.value ? `2px solid ${t.border}` : '1px solid #ddd',
              background: form.type === t.value ? t.color : 'white',
              color: form.type === t.value ? t.text : '#666',
              cursor: 'pointer', fontSize: '12px', fontWeight: '500'
            }}>{t.label}</button>
          ))}
        </div>

        {(form.type === 'ie' || form.type === 'makeup') && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#999', display: 'block', marginBottom: '3px' }}>Client</label>
              <input value={form.client_name} onChange={e => {
                const therapists = getClientTherapists(e.target.value)
                setForm({ ...form, client_name: e.target.value, therapist: therapists[0] || '' })
              }}
                list="task-client-list" placeholder="Type or select..."
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', boxSizing: 'border-box' }} />
              <datalist id="task-client-list">
                {clients.sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#999', display: 'block', marginBottom: '3px' }}>Therapist</label>
              <input value={form.therapist} onChange={e => setForm({ ...form, therapist: e.target.value })}
                list="task-therapist-list" placeholder="Type or select..."
                style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', boxSizing: 'border-box' }} />
              <datalist id="task-therapist-list">
                {getClientTherapists(form.client_name).map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder={form.type === 'ie' ? 'Add note (e.g. May 3 IE with THERAPIST)...' : form.type === 'makeup' ? 'Add note (e.g. absent Apr 21, needs make-up)...' : 'Add a task...'}
            style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }} />
          <button onClick={addTask} disabled={saving} style={{
            padding: '8px 18px', borderRadius: '8px', border: 'none',
            background: '#0f4c81', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
            opacity: saving ? 0.6 : 1
          }}>{saving ? '...' : '+ Add'}</button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: `All (${tasks.length})` },
          { key: 'ie', label: `IE Reminders (${counts.ie})` },
          { key: 'makeup', label: `Make-up (${counts.makeup})` },
          { key: 'other', label: `Other (${counts.other})` },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
            fontSize: '12px', fontWeight: '500',
            background: filter === f.key ? '#0f4c81' : '#f0f0f0',
            color: filter === f.key ? 'white' : '#666'
          }}>{f.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999', background: '#f8f9fa', borderRadius: '12px' }}>
          No tasks here — you're all caught up! 🎉
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(task => {
            const type = TASK_TYPES.find(t => t.value === task.type) || TASK_TYPES[2]
            return (
              <div key={task.id} style={{
                background: 'white', borderRadius: '10px',
                border: '1px solid #e0e0e0', overflow: 'hidden',
                display: 'flex', alignItems: 'stretch'
              }}>
                <div style={{ width: '4px', background: type.border, flexShrink: 0 }} />
                <div style={{ flex: 1, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '8px', background: type.color, color: type.text, fontWeight: '500' }}>{type.label}</span>
                      {task.client_name && <span style={{ fontSize: '13px', fontWeight: '500', color: '#0f4c81' }}>{task.client_name}</span>}
                      {task.therapist && <span style={{ fontSize: '12px', color: '#999' }}>· {task.therapist}</span>}
                    </div>
                    {task.notes && <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>{task.notes}</div>}
                    <div style={{ fontSize: '11px', color: '#bbb', marginTop: '3px' }}>Added {task.created_at}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    {task.client_name && task.type !== 'other' && (
                      <button onClick={() => sendRemind(task)} style={{
                        padding: '5px 12px', borderRadius: '6px',
                        border: `1px solid ${type.border}`, background: type.color,
                        color: type.text, cursor: 'pointer', fontSize: '11px', fontWeight: '500'
                      }}>Remind</button>
                    )}
                    <button onClick={() => deleteTask(task.id)} style={{
                      padding: '5px 12px', borderRadius: '6px',
                      border: '1px solid #97C459', background: '#EAF3DE',
                      color: '#27500A', cursor: 'pointer', fontSize: '11px', fontWeight: '500'
                    }}>✓ Done</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </>
      )}

      {activeTab === 'Inquiries' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {inquiries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#999', background: '#f8f9fa', borderRadius: '12px' }}>
              No inquiries yet — click "+ Add inquiry" to log one.
            </div>
          ) : (
            Object.entries(
              inquiries.reduce((acc, inq) => {
                (acc[inq.contact_name] = acc[inq.contact_name] || []).push(inq)
                return acc
              }, {})
            )
              .map(([name, entries]) => ({
                name,
                entries: [...entries].sort((a, b) => Number(b.id) - Number(a.id))
              }))
              .sort((a, b) => Number(b.entries[0]?.id || 0) - Number(a.entries[0]?.id || 0))
              .map((contact, idx) => {
                const isExpanded = expandedContacts[contact.name] ?? (idx === 0)
                return (
                  <div key={contact.name} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
                    <div onClick={() => setExpandedContacts(prev => ({ ...prev, [contact.name]: !isExpanded }))}
                      style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f4c81' }}>{contact.name}</span>
                      <span style={{ fontSize: '12px', color: '#999', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {contact.entries.length} {contact.entries.length === 1 ? 'entry' : 'entries'}
                        <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▾</span>
                      </span>
                    </div>
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid #f0f0f0' }}>
                        {contact.entries.map(entry => (
                          <div key={entry.id + '-' + entry.index} style={{ padding: '10px 16px', borderBottom: '1px solid #f5f5f5', display: 'flex', gap: '12px' }}>
                            <span style={{ fontSize: '12px', color: '#999', flexShrink: 0, width: '80px' }}>{entry.date}</span>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: '13px', color: '#333' }}>{entry.note}</span>
                              {entry.recorded_by && <span style={{ fontSize: '11px', color: '#bbb', marginLeft: '8px' }}>— {entry.recorded_by}</span>}
                            </div>
                            <button onClick={() => deleteInquiryEntry(entry.index)} style={{
                              border: 'none', background: 'none', color: '#ccc', cursor: 'pointer', fontSize: '13px', flexShrink: 0
                            }}>✕</button>
                          </div>
                        ))}
                        <div style={{ padding: '10px 16px', display: 'flex', gap: '8px' }}>
                          <input
                            value={newNoteForm[contact.name]?.note || ''}
                            onChange={e => setNewNoteForm(prev => ({ ...prev, [contact.name]: { ...prev[contact.name], note: e.target.value } }))}
                            onKeyDown={e => e.key === 'Enter' && addNoteToContact(contact.name)}
                            placeholder="Add a note for today..."
                            style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }}
                          />
                          <input
                            value={newNoteForm[contact.name]?.recorded_by || ''}
                            onChange={e => setNewNoteForm(prev => ({ ...prev, [contact.name]: { ...prev[contact.name], recorded_by: e.target.value } }))}
                            placeholder="By"
                            style={{ width: '90px', padding: '7px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }}
                          />
                          <button onClick={() => addNoteToContact(contact.name)} disabled={inquirySaving} style={{
                            padding: '7px 14px', borderRadius: '6px', border: 'none', background: '#0f4c81', color: 'white',
                            cursor: 'pointer', fontSize: '12px', fontWeight: '500', opacity: inquirySaving ? 0.6 : 1
                          }}>Add</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
          )}
        </div>
      )}

      {addContactModal && (
        <div onClick={() => setAddContactModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'white', borderRadius: '12px', padding: '1.5rem', width: '340px', maxWidth: '90vw'
          }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '16px', color: '#0f4c81' }}>Add inquiry</h3>

            <label style={{ fontSize: '11px', color: '#999', display: 'block', marginBottom: '3px' }}>Contact name</label>
            <input value={newContact.contact_name} onChange={e => setNewContact({ ...newContact, contact_name: e.target.value })}
              placeholder="e.g. Santos, Maria" autoFocus
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', marginBottom: '10px', boxSizing: 'border-box' }} />

            <label style={{ fontSize: '11px', color: '#999', display: 'block', marginBottom: '3px' }}>First note</label>
            <input value={newContact.note} onChange={e => setNewContact({ ...newContact, note: e.target.value })}
              placeholder="e.g. First inquiry via FB message..."
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', marginBottom: '10px', boxSizing: 'border-box' }} />

            <label style={{ fontSize: '11px', color: '#999', display: 'block', marginBottom: '3px' }}>Recorded by</label>
            <input value={newContact.recorded_by} onChange={e => setNewContact({ ...newContact, recorded_by: e.target.value })}
              placeholder="Your name"
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', marginBottom: '16px', boxSizing: 'border-box' }} />

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setAddContactModal(false)} style={{
                padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', background: 'white',
                color: '#666', cursor: 'pointer', fontSize: '13px'
              }}>Cancel</button>
              <button onClick={async () => {
                if (!newContact.contact_name || !newContact.note) return alert('Please add a contact name and a note')
                setInquirySaving(true)
                await fetch('/api/inquiries', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(newContact)
                })
                setNewContact({ contact_name: '', recorded_by: '', note: '' })
                await fetchInquiries()
                setInquirySaving(false)
                setAddContactModal(false)
              }} disabled={inquirySaving} style={{
                padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#0f4c81',
                color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500', opacity: inquirySaving ? 0.6 : 1
              }}>{inquirySaving ? 'Adding...' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}