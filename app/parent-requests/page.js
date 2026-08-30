'use client'
import { useState, useEffect } from 'react'

function AccountCard({ account, clients, onApprove, onReject }) {
  const [selectedClients, setSelectedClients] = useState([])
  const [clientInput, setClientInput] = useState('')
  const [processing, setProcessing] = useState(false)

  function addClient() {
    const match = clients.find(c => c.name === clientInput)
    if (!match) return
    if (selectedClients.includes(match.name)) { setClientInput(''); return }
    setSelectedClients(prev => [...prev, match.name])
    setClientInput('')
  }

  function removeClient(name) {
    setSelectedClients(prev => prev.filter(c => c !== name))
  }

  async function handleApprove() {
    setProcessing(true)
    await onApprove(account.id, selectedClients)
    setProcessing(false)
  }

  async function handleReject() {
    if (!confirm(`Reject this account (${account.email})? The parent won't be able to access anything.`)) return
    setProcessing(true)
    await onReject(account.id)
    setProcessing(false)
  }

  const statusColors = {
    pending: { bg: '#FAEEDA', border: '#EF9F27', color: '#633806' },
    active: { bg: '#EAF3DE', border: '#97C459', color: '#27500A' },
    rejected: { bg: '#f5f5f5', border: '#ddd', color: '#999' }
  }
  const sc = statusColors[account.status] || statusColors.pending

  return (
    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '1.25rem', marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ fontWeight: '600', color: '#0f4c81', fontSize: '14px' }}>{account.email}</div>
          <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>Registered {account.created_at}</div>
        </div>
        <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '10px', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, fontWeight: '500', textTransform: 'capitalize' }}>
          {account.status}
        </span>
      </div>

      <div style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>
        <span style={{ color: '#999' }}>Requested children: </span>
        <strong>{account.requested_children || '—'}</strong>
      </div>

      {account.status === 'active' && account.linked_clients && (
        <div style={{ fontSize: '13px', color: '#27500A', marginBottom: '12px' }}>
          <span style={{ color: '#999' }}>Linked to: </span>
          <strong>{account.linked_clients}</strong>
        </div>
      )}

      {account.status === 'pending' && (
        <>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Link to client record(s)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={clientInput} onChange={e => setClientInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addClient())}
                list={`client-list-${account.id}`} placeholder="Type or select a client..."
                style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', boxSizing: 'border-box' }} />
              <datalist id={`client-list-${account.id}`}>
                {clients.map(c => <option key={c.id} value={c.name} />)}
              </datalist>
              <button onClick={addClient} style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #0f4c81', background: '#E6F1FB', color: '#0f4c81', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>+ Add</button>
            </div>
            {selectedClients.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {selectedClients.map(name => (
                  <span key={name} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '14px', background: '#E6F1FB', color: '#0C447C', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {name}
                    <button onClick={() => removeClient(name)} style={{ border: 'none', background: 'none', color: '#0C447C', cursor: 'pointer', fontSize: '13px', padding: 0 }}>✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={handleReject} disabled={processing} style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #fcc', background: '#fff5f5', color: '#c00', cursor: 'pointer', fontSize: '12px' }}>Reject</button>
            <button onClick={handleApprove} disabled={processing || selectedClients.length === 0} style={{
              padding: '7px 16px', borderRadius: '6px', border: 'none', background: '#1D9E75', color: 'white',
              cursor: 'pointer', fontSize: '12px', fontWeight: '500', opacity: (processing || selectedClients.length === 0) ? 0.5 : 1
            }}>{processing ? 'Approving...' : 'Approve'}</button>
          </div>
        </>
      )}
    </div>
  )
}

export default function ParentRequestsPage() {
  const [accounts, setAccounts] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [aRes, cRes] = await Promise.all([fetch('/api/parent-requests'), fetch('/api/clients')])
    const [aJson, cJson] = await Promise.all([aRes.json(), cRes.json()])
    if (aJson.success) setAccounts(aJson.data)
    if (cJson.success) setClients(cJson.data.filter(c => c.status !== 'inactive'))
    setLoading(false)
  }

  async function handleApprove(id, linkedClients) {
    await fetch('/api/parent-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', id, linked_clients: linkedClients })
    })
    fetchAll()
  }

  async function handleReject(id) {
    await fetch('/api/parent-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', id })
    })
    fetchAll()
  }

  const pendingCount = accounts.filter(a => a.status === 'pending').length
  const filtered = filter === 'all' ? accounts : accounts.filter(a => a.status === filter)

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#0f4c81', margin: '0 0 4px' }}>Parent Requests</h1>
      <p style={{ margin: '0 0 1.5rem', fontSize: '13px', color: '#999' }}>Approve new parent accounts and link them to the right client records</p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
        {[
          { key: 'pending', label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
          { key: 'active', label: 'Active' },
          { key: 'rejected', label: 'Rejected' },
          { key: 'all', label: 'All' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: '7px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500',
            background: filter === f.key ? '#0f4c81' : '#f0f0f0', color: filter === f.key ? 'white' : '#666'
          }}>{f.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999', background: '#f8f9fa', borderRadius: '12px' }}>
          No {filter !== 'all' ? filter : ''} accounts.
        </div>
      ) : (
        filtered
          .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
          .map(account => (
            <AccountCard key={account.id} account={account} clients={clients} onApprove={handleApprove} onReject={handleReject} />
          ))
      )}
    </div>
  )
}