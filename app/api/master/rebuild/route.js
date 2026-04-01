<div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={async () => {
          if (!confirm('This will wipe the master schedule and rebuild it cleanly from your clients data. Continue?')) return
          const res = await fetch('/api/master/rebuild', { method: 'POST' })
          const json = await res.json()
          if (json.success) {
            alert(`Done! Master schedule rebuilt with ${json.rebuilt} entries.`)
            fetchMaster()
          } else {
            alert('Rebuild failed: ' + json.error)
          }
        }} style={{
          padding: '10px 18px', borderRadius: '8px',
          border: '1px solid #E24B4A', cursor: 'pointer',
          fontSize: '13px', background: '#FCEBEB', color: '#791F1F', fontWeight: '500'
        }}>Rebuild from clients</button>
        <button onClick={() => { setForm({ ...EMPTY_FORM, day: selectedDay }); setShowForm(true) }} style={{
          background: '#0f4c81', color: 'white', border: 'none',
          padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500'
        }}>+ Add Recurring Slot</button>
      </div>