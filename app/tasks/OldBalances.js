'use client'
import { useState, useEffect } from 'react'
import { fetchJSON } from '../lib/fetchJSON'

const peso = n => '₱' + Number(n || 0).toLocaleString()
const EMPTY_FORM = { id: null, name: '', amount: '', breakdown: '', updatesText: '' }

// Updates are stored as "Oct 3 — text". Lines typed by hand without a date still display.
function splitUpdate(u) {
  const i = u.indexOf(' — ')
  return i === -1 ? { date: '', text: u } : { date: u.slice(0, i), text: u.slice(i + 3) }
}

// Entries are grouped by name, ignoring capitalization and extra spaces.
const groupKey = name => (name || '').trim().replace(/\s+/g, ' ').toLowerCase()

export default function OldBalances() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState({})
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [updateOpen, setUpdateOpen] = useState({})
  const [updateText, setUpdateText] = useState({})
  const [updateSaving, setUpdateSaving] = useState(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    setLoadError(false)
    const json = await fetchJSON('/api/old-balances')
    if (json.success) setEntries(json.data)
    else setLoadError(true)
    setLoading(false)
  }

  async function reload() {
    const json = await fetchJSON('/api/old-balances')
    if (json.success) setEntries(json.data)
  }

  async function save() {
    setSaving(true)
    const editing = !!modal.id
    const body = editing
      ? { action: 'edit', id: modal.id, name: modal.name, amount: modal.amount, breakdown: modal.breakdown, updates: modal.updatesText.split('\n') }
      : { name: modal.name, amount: modal.amount, breakdown: modal.breakdown }
    const res = await fetch('/api/old-balances', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const json = await res.json()
    setSaving(false)
    if (!json.success) { alert(json.error || 'Could not save. Please try again.'); return }
    setModal(null)
    reload()
  }

  async function addUpdate(id) {
    const text = (updateText[id] || '').trim()
    if (!text) return
    setUpdateSaving(id)
    const res = await fetch('/api/old-balances', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_update', id, text })
    })
    const json = await res.json()
    setUpdateSaving(null)
    if (!json.success) { alert(json.error || 'Could not add the update.'); return }
    setUpdateText(prev => ({ ...prev, [id]: '' }))
    setUpdateOpen(prev => ({ ...prev, [id]: false }))
    reload()
  }

  async function remove(e) {
    if (!confirm(`Delete this old balance for ${e.name}?`)) return
    await fetch('/api/old-balances', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: e.id })
    })
    reload()
  }

  async function toggleUrgent(g) {
    const makeUrgent = !g.urgent
    const ids = g.entries.map(e => e.id)
    // Flip it on screen right away, then save.
    setEntries(prev => prev.map(e => ids.includes(e.id) ? { ...e, urgent: makeUrgent } : e))
    const res = await fetch('/api/old-balances', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_urgent', ids, urgent: makeUrgent })
    })
    const json = await res.json()
    if (!json.success) { alert(json.error || 'Could not update.'); reload() }
  }

  async function toggleConfirm(g) {
    const makeConfirm = !g.confirm
    const ids = g.entries.map(e => e.id)
    setEntries(prev => prev.map(e => ids.includes(e.id) ? { ...e, needs_confirm: makeConfirm } : e))
    const res = await fetch('/api/old-balances', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_confirm', ids, confirm: makeConfirm })
    })
    const json = await res.json()
    if (!json.success) { alert(json.error || 'Could not update.'); reload() }
  }

  const total = entries.reduce((sum, e) => sum + (e.amount || 0), 0)
  const q = search.trim().toLowerCase()

  const byName = {}
  entries.forEach(e => {
    const key = groupKey(e.name)
    if (!byName[key]) byName[key] = []
    byName[key].push(e)
  })
  const allGroups = Object.entries(byName).map(([key, list]) => {
    const sorted = [...list].sort((a, b) => b.amount - a.amount)
    return { key, name: sorted[0].name, entries: sorted, urgent: sorted.some(e => e.urgent), confirm: sorted.some(e => e.needs_confirm), confirm: sorted.some(e => e.needs_confirm), total: sorted.reduce((s, e) => s + (e.amount || 0), 0) }
  })
  // Highest remaining balance first
  const groups = allGroups
    .filter(g => !q || g.entries.some(e => `${e.name} ${e.breakdown} ${e.updates.join(' ')}`.toLowerCase().includes(q)))
    .sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || b.total - a.total || a.name.localeCompare(b.name))

  const amountOk = modal && modal.amount !== '' && Number.isFinite(Number(modal.amount)) && Number(modal.amount) >= 0
  const canSave = modal && modal.name.trim() && amountOk && !saving

  const smallLabel = { fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700', marginBottom: '5px' }

  return (
    <div>
      <div style={{ background: '#F7F4FB', border: '1px solid #D9CFF0', borderRadius: '8px', padding: '9px 14px', fontSize: '12px', color: '#4C0C7C', marginBottom: '1rem' }}>
        Balances from before JANUARY to MAY. Manual edits are required to update the amount after a payment, and the entry should be deleted once it's settled.
      </div>

      <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '12px', padding: '14px 18px', display: 'flex', gap: '28px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total owed</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#791F1F' }}>{peso(total)}</div>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Names</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#0f4c81' }}>{allGroups.length}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '1rem' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or details..."
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', width: '220px' }} />
        <button onClick={() => setModal({ ...EMPTY_FORM })} style={{ padding: '8px 16px', borderRadius: '8px', background: '#1D9E75', color: 'white', border: 'none', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
          + Add old balance
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Loading...</div>
      ) : loadError ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#791F1F', background: '#FCEBEB', borderRadius: '12px' }}>
          Couldn't load old balances. <button onClick={loadAll} style={{ background: 'none', border: 'none', color: '#0f4c81', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit' }}>Tap to retry</button>
        </div>
      ) : groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999', background: '#f8f9fa', borderRadius: '12px' }}>
          {entries.length === 0 ? 'No old balances logged yet.' : 'No entries match your search.'}
        </div>
      ) : (
        groups.map(g => {
          // While searching, matching names open automatically so the match is visible.
          const isOpen = q ? true : !!expanded[g.key]
          return (
            <div key={g.key} style={{ background: 'white', border: g.urgent ? '1px solid #E57373' : g.confirm ? '1px solid #E6C34D' : '1px solid #e0e0e0', borderRadius: '12px', marginBottom: '10px', overflow: 'hidden' }}>
              <div onClick={() => setExpanded(prev => ({ ...prev, [g.key]: !prev[g.key] }))}
                style={{ padding: '10px 14px', background: g.urgent ? '#FDECEC' : g.confirm ? '#FFF6D6' : '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', fontWeight: g.urgent ? '700' : '600', color: g.urgent ? '#B71C1C' : g.confirm ? '#7A5C00' : '#0f4c81' }}>{g.name}</span>
                    {g.confirm ? (
                      <button onClick={ev => { ev.stopPropagation(); toggleConfirm(g) }} title="Click to remove the confirmation mark"
                        style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', border: '1px solid #E6C34D', background: '#F5C518', color: '#4A3600', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.03em' }}>❓ TO CONFIRM</button>
                    ) : (
                      <button onClick={ev => { ev.stopPropagation(); toggleConfirm(g) }} title="Mark as needs confirmation"
                        style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', padding: 0, opacity: 0.35 }}>❓</button>
                    )}
                    {g.urgent ? (
                      <button onClick={ev => { ev.stopPropagation(); toggleUrgent(g) }} title="Click to remove the urgent mark"
                        style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', border: '1px solid #E57373', background: '#B71C1C', color: 'white', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.03em' }}>⚠️ URGENT</button>
                    ) : (
                      <button onClick={ev => { ev.stopPropagation(); toggleUrgent(g) }} title="Mark as urgent"
                        style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', padding: 0, opacity: 0.35 }}>⚠️</button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#999' }}>Remaining</span>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: '#791F1F' }}>{peso(g.total)}</span>
                  <span style={{ color: '#999', fontSize: '12px' }}>{isOpen ? '▼' : '▶'}</span>
                </div>
              </div>

              {isOpen && g.entries.map(e => (
                <div key={e.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                  <div style={{ padding: '10px 14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#791F1F' }}>{peso(e.amount)}</span>
                      {e.name !== g.name && <span style={{ fontSize: '11px', color: '#999', marginLeft: '8px' }}>typed as "{e.name}"</span>}
                    </div>
                    <div>
                      <button onClick={() => setModal({ id: e.id, name: e.name, amount: String(e.amount), breakdown: e.breakdown, updatesText: e.updates.join('\n') })} title="Edit"
                        style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', color: '#bbb', padding: '0 3px' }}>✎</button>
                      <button onClick={() => remove(e)} title="Delete"
                        style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', color: '#bbb', padding: '0 3px' }}>✕</button>
                    </div>
                  </div>

                  <div style={{ padding: '8px 14px 10px' }}>
                    <div style={smallLabel}>Breakdown</div>
                    <div style={{ fontSize: '12px', color: '#444', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{e.breakdown || '—'}</div>
                  </div>

                  <div style={{ padding: '10px 14px', borderTop: '1px solid #f6f6f6' }}>
                    <div style={smallLabel}>Updates</div>
                    {e.updates.length === 0 ? (
                      <div style={{ fontSize: '12px', color: '#bbb', fontStyle: 'italic' }}>No updates yet</div>
                    ) : e.updates.map((u, i) => {
                      const { date, text } = splitUpdate(u)
                      return (
                        <div key={i} style={{ fontSize: '12px', color: '#444', padding: '3px 0', lineHeight: '1.5' }}>
                          {date && <span style={{ color: '#0f4c81', fontWeight: '600', marginRight: '6px' }}>{date}</span>}{text}
                        </div>
                      )
                    })}
                    <button onClick={() => setUpdateOpen(prev => ({ ...prev, [e.id]: !prev[e.id] }))}
                      style={{ fontSize: '11px', color: '#0f4c81', cursor: 'pointer', background: 'none', border: 'none', padding: 0, marginTop: '6px', textDecoration: 'underline' }}>
                      + Add update
                    </button>
                    {updateOpen[e.id] && (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                        <input autoFocus value={updateText[e.id] || ''} onChange={ev => setUpdateText(prev => ({ ...prev, [e.id]: ev.target.value }))}
                          onKeyDown={ev => { if (ev.key === 'Enter') addUpdate(e.id) }}
                          placeholder="e.g. Mom said she'll pay on the 15th"
                          style={{ flex: 1, padding: '6px 9px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '12px' }} />
                        <button onClick={() => addUpdate(e.id)} disabled={updateSaving === e.id}
                          style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#0f4c81', color: 'white', fontSize: '11px', cursor: 'pointer', opacity: updateSaving === e.id ? 0.6 : 1 }}>
                          {updateSaving === e.id ? 'Adding...' : 'Add'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        })
      )}

      {modal && (
        <div onClick={() => !saving && setModal(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={ev => ev.stopPropagation()} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', width: '460px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 1rem', color: '#0f4c81', fontSize: '15px' }}>{modal.id ? 'Edit old balance' : 'Add old balance'}</h3>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Name</label>
              <input value={modal.name} onChange={ev => setModal({ ...modal, name: ev.target.value })} placeholder="Type any name, e.g. Reyes, John"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', boxSizing: 'border-box' }} />
              <div style={{ fontSize: '11px', color: '#999', marginTop: '3px' }}>Free text. Entries with the same name are grouped together.</div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Amount owed now (₱)</label>
              <input type="number" value={modal.amount} onChange={ev => setModal({ ...modal, amount: ev.target.value })} placeholder="0"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Breakdown</label>
              <textarea rows={6} value={modal.breakdown} onChange={ev => setModal({ ...modal, breakdown: ev.target.value })}
                placeholder={'One item per line, e.g.\nOT sessions, Jan – Mar 2025 (12 × ₱1,200) = ₱14,400\nProgress report, 2 copies = ₱4,500\nLess paid: ₱900 (cash, Apr 2025)'}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', fontFamily: 'inherit', lineHeight: '1.5', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>

            {modal.id && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Updates</label>
                <textarea rows={4} value={modal.updatesText} onChange={ev => setModal({ ...modal, updatesText: ev.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', fontFamily: 'inherit', lineHeight: '1.5', resize: 'vertical', boxSizing: 'border-box' }} />
                <div style={{ fontSize: '11px', color: '#999', marginTop: '3px' }}>One update per line. Normally you add these with "+ Add update" on the entry.</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={() => setModal(null)} disabled={saving} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={save} disabled={!canSave} style={{
                padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#0f4c81', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
                opacity: canSave ? 1 : 0.5
              }}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}