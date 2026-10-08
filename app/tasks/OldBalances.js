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

// Left to right on screen. Anything not marked urgent or to confirm shows under Marked as loss.
const COLUMNS = [
  { key: 'urgent',  title: '⚠️ URGENT',          bg: '#FFF5F5', border: '#F3C2C2', titleColor: '#B71C1C', cardBorder: '#E57373', headBg: '#FDECEC' },
  { key: 'confirm', title: '❓ TO CONFIRM',      bg: '#FFFBEA', border: '#EBD98A', titleColor: '#7A5C00', cardBorder: '#E6C34D', headBg: '#FFF6D6' },
  { key: 'loss',    title: '📉 MARKED AS LOSS',  bg: '#F1F1F1', border: '#CFCFCF', titleColor: '#555',    cardBorder: '#CFCFCF', headBg: '#EDEDED' }
]
const PRIORITY = ['urgent', 'confirm', 'loss']

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
  const [dragKey, setDragKey] = useState(null)
  const [overCol, setOverCol] = useState(null)

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

  // Move a whole name to another column. Shows on screen right away, then saves.
  async function moveGroup(key, status) {
    const g = allGroups.find(x => x.key === key)
    if (!g || g.status === status) return
    const ids = g.entries.map(e => e.id)
    setEntries(prev => prev.map(e => ids.includes(e.id) ? { ...e, status } : e))
    const res = await fetch('/api/old-balances', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_status', ids, status })
    })
    const json = await res.json()
    if (!json.success) { alert(json.error || 'Could not move.'); reload() }
  }

  const q = search.trim().toLowerCase()

  const byName = {}
  entries.forEach(e => {
    const key = groupKey(e.name)
    if (!byName[key]) byName[key] = []
    byName[key].push(e)
  })
  const allGroups = Object.entries(byName).map(([key, list]) => {
    const sorted = [...list].sort((a, b) => b.amount - a.amount)
    // If entries disagree (e.g. a new entry added to a flagged name), the strongest mark wins.
    const status = PRIORITY.find(p => sorted.some(e => e.status === p)) || 'loss'
    return { key, name: sorted[0].name, entries: sorted, status, total: sorted.reduce((s, e) => s + (e.amount || 0), 0) }
  })
  const visible = allGroups.filter(g => !q || g.entries.some(e => `${e.name} ${e.breakdown} ${e.updates.join(' ')}`.toLowerCase().includes(q)))

  const owed = allGroups.reduce((s, g) => s + g.total, 0)

  const amountOk = modal && modal.amount !== '' && Number.isFinite(Number(modal.amount)) && Number(modal.amount) >= 0
  const canSave = modal && modal.name.trim() && amountOk && !saving

  const smallLabel = { fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700', marginBottom: '5px' }

  function renderGroup(g, col) {
    const isOpen = q ? true : !!expanded[g.key]
    const isLoss = col.key === 'loss'
    return (
      <div key={g.key} draggable
        onDragStart={() => setDragKey(g.key)} onDragEnd={() => { setDragKey(null); setOverCol(null) }}
        style={{ background: 'white', border: `1px ${isLoss ? 'dashed' : 'solid'} ${col.cardBorder}`, borderRadius: '10px', marginBottom: '8px', overflow: 'hidden', opacity: dragKey === g.key ? 0.4 : 1 }}>
        <div onClick={() => setExpanded(prev => ({ ...prev, [g.key]: !prev[g.key] }))}
          style={{ padding: '9px 11px', background: col.headBg, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: isLoss ? '#777' : col.key ? col.titleColor : '#0f4c81', minWidth: 0, wordBreak: 'break-word' }}>
            <span style={{ fontSize: '10px', color: '#999', marginRight: '4px' }}>{isOpen ? '▼' : '▶'}</span>{g.name}
          </span>
          <span style={{ fontSize: '14px', fontWeight: '700', color: isLoss ? '#777' : '#791F1F', whiteSpace: 'nowrap' }}>{peso(g.total)}</span>
        </div>

        {isOpen && (
          <>
            {g.entries.map(e => (
              <div key={e.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                <div style={{ padding: '9px 11px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#791F1F' }}>{peso(e.amount)}</span>
                    {e.name !== g.name && <span style={{ fontSize: '11px', color: '#999', marginLeft: '8px' }}>typed as "{e.name}"</span>}
                  </div>
                  <div>
                    <button onClick={() => setModal({ id: e.id, name: e.name, amount: String(e.amount), breakdown: e.breakdown, updatesText: e.updates.join('\n') })} title="Edit"
                      style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', color: '#bbb', padding: '0 3px' }}>✎</button>
                    <button onClick={() => remove(e)} title="Delete"
                      style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', color: '#bbb', padding: '0 3px' }}>✕</button>
                  </div>
                </div>

                <div style={{ padding: '6px 11px 9px' }}>
                  <div style={smallLabel}>Breakdown</div>
                  <div style={{ fontSize: '12px', color: '#444', whiteSpace: 'pre-wrap', lineHeight: '1.55' }}>{e.breakdown || '—'}</div>
                </div>

                <div style={{ padding: '9px 11px', borderTop: '1px solid #f6f6f6' }}>
                  <div style={smallLabel}>Updates</div>
                  {e.updates.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#bbb', fontStyle: 'italic' }}>No updates yet</div>
                  ) : e.updates.map((u, i) => {
                    const { date, text } = splitUpdate(u)
                    return (
                      <div key={i} style={{ fontSize: '12px', color: '#444', padding: '2px 0', lineHeight: '1.45' }}>
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
                        style={{ flex: 1, minWidth: 0, padding: '6px 9px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '12px' }} />
                      <button onClick={() => addUpdate(e.id)} disabled={updateSaving === e.id}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#0f4c81', color: 'white', fontSize: '11px', cursor: 'pointer', opacity: updateSaving === e.id ? 0.6 : 1 }}>
                        {updateSaving === e.id ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '6px', padding: '8px 11px', borderTop: '1px solid #f3f3f3', alignItems: 'center', flexWrap: 'wrap', background: '#fafafa' }}>
              <span style={{ fontSize: '10px', color: '#999' }}>Label</span>
              {COLUMNS.filter(c => c.key !== g.status).map(c => (
                <button key={c.key} onClick={() => moveGroup(g.key, c.key)}
                  style={{ border: '1px solid #ddd', background: 'white', borderRadius: '12px', padding: '2px 9px', fontSize: '11px', cursor: 'pointer' }}>{c.title}</button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  // The To-do page is capped at 800px. This tab breaks out of it and centres itself, up to 1400px wide.
  return (
    <div style={{ width: 'min(1400px, 94vw)', marginLeft: 'calc(50% - min(1400px, 94vw) / 2)' }}>
      <div style={{ background: '#F7F4FB', border: '1px solid #D9CFF0', borderRadius: '8px', padding: '9px 14px', fontSize: '12px', color: '#4C0C7C', marginBottom: '1rem' }}>
        Balances from before JANUARY to MAY. Manual edits are required to update the amount after a payment, and the entry should be deleted once it's settled.
      </div>

      <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '12px', padding: '14px 18px', display: 'flex', gap: '28px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total owed</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#791F1F' }}>{peso(owed)}</div>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Names</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#0f4c81' }}>{allGroups.length}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '0.5rem' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or details..."
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '12px', width: '220px' }} />
        <button onClick={() => setModal({ ...EMPTY_FORM })} style={{ padding: '8px 16px', borderRadius: '8px', background: '#1D9E75', color: 'white', border: 'none', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
          + Add old balance
        </button>
      </div>
      <div style={{ fontSize: '11px', color: '#999', marginBottom: '8px' }}>Drag a name to another column, or open it and use "Label".</div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Loading...</div>
      ) : loadError ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#791F1F', background: '#FCEBEB', borderRadius: '12px' }}>
          Couldn't load old balances. <button onClick={loadAll} style={{ background: 'none', border: 'none', color: '#0f4c81', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit' }}>Tap to retry</button>
        </div>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px', alignItems: 'start' }}>
            {COLUMNS.map(col => {
              const all = allGroups.filter(g => g.status === col.key)
              const list = visible.filter(g => g.status === col.key).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
              return (
                <div key={col.key}
                  onDragOver={ev => { ev.preventDefault(); setOverCol(col.key) }}
                  onDragLeave={() => setOverCol(null)}
                  onDrop={ev => { ev.preventDefault(); if (dragKey) moveGroup(dragKey, col.key); setDragKey(null); setOverCol(null) }}
                  style={{ background: col.bg, border: `1px solid ${col.border}`, borderRadius: '12px', padding: '10px', minHeight: '200px', outline: overCol === col.key && dragKey ? '2px dashed #0f4c81' : 'none', outlineOffset: '-4px' }}>
                  <div style={{ padding: '2px 4px 10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: col.titleColor }}>{col.title}</span>
                      <span style={{ fontSize: '11px', fontWeight: '600', background: 'white', borderRadius: '10px', padding: '1px 9px' }}>{all.length}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{peso(all.reduce((s, g) => s + g.total, 0))}</div>
                  </div>
                  {list.length === 0
                    ? <div style={{ fontSize: '12px', color: '#bbb', textAlign: 'center', padding: '22px 6px', fontStyle: 'italic' }}>{entries.length === 0 ? 'No old balances logged yet.' : 'Nothing here'}</div>
                    : list.map(g => renderGroup(g, col))}
                </div>
              )
            })}
          </div>
        </div>
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