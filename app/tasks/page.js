'use client'
import { useState, useEffect } from 'react'

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

  useEffect(() => { fetchAll() }, [])

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
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#0f4c81', margin: '0 0 4px', fontSize: '22px' }}>To-do</h1>
        <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>IE reminders, make-up sessions, and other tasks</p>
      </div>

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
            placeholder={form.type === 'ie' ? 'Add note (e.g. May 3 IE with PATRICIA)...' : form.type === 'makeup' ? 'Add note (e.g. absent Apr 21, needs make-up)...' : 'Add a task...'}
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
    </div>
  )
}