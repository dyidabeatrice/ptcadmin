'use client'
import { useState, useEffect } from 'react'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

const SESSION_TYPES = {
  OT: [
    { value: 'OT SESSION', label: 'OT Session', amount: 1200 },
    { value: 'OT-IE', label: 'Initial Evaluation', amount: 2800 },
    { value: 'OT-FE', label: 'Follow-up Evaluation', amount: 1500 },
    { value: 'SPECIALIZED OT TX', label: 'Specialized OT', amount: 1700 },
    { value: 'PR', label: 'Progress Report', amount: 750 },
    { value: 'PR-RUSHED', label: 'Progress Report (Rushed)', amount: 1000 },
    { value: 'IE REPORT', label: 'IE Report', amount: 0 },
    { value: 'Cancellation Fee', label: 'Cancellation Fee', amount: 0 },
    { value: 'Custom Amount', label: 'Custom Amount', amount: 0 },
  ],
  OT_INTERN: [
    { value: 'OT SESSION', label: 'OT Intern Session', amount: 600 },
    { value: 'OT-IE', label: 'Intern Evaluation', amount: 800 },
    { value: 'Cancellation Fee', label: 'Cancellation Fee', amount: 0 },
    { value: 'Custom Amount', label: 'Custom Amount', amount: 0 },
  ],
  ST: [
    { value: 'ST SESSION', label: 'ST Session', amount: 1300 },
    { value: 'ST-IE', label: 'Initial Evaluation', amount: 2800 },
    { value: 'ST-FE', label: 'Follow-up Evaluation', amount: 1500 },
    { value: 'SPECIALIZED ST TX', label: 'Specialized ST', amount: 1700 },
    { value: 'PR', label: 'Progress Report', amount: 750 },
    { value: 'PR-RUSHED', label: 'Progress Report (Rushed)', amount: 1000 },
    { value: 'IE REPORT', label: 'IE Report', amount: 0 },
    { value: 'Cancellation Fee', label: 'Cancellation Fee', amount: 0 },
    { value: 'Custom Amount', label: 'Custom Amount', amount: 0 },
  ],
  ST_INTERN: [
    { value: 'ST SESSION', label: 'ST Intern Session', amount: 600 },
    { value: 'ST-IE', label: 'Intern Evaluation', amount: 800 },
    { value: 'Cancellation Fee', label: 'Cancellation Fee', amount: 0 },
    { value: 'Custom Amount', label: 'Custom Amount', amount: 0 },
  ],
  PT: [
    { value: 'PT SESSION', label: 'PT Session', amount: 900 },
    { value: 'PT-IE', label: 'Initial Evaluation', amount: 2800 },
    { value: 'PT FE', label: 'Follow-up Evaluation', amount: 1500 },
    { value: 'Cancellation Fee', label: 'Cancellation Fee', amount: 0 },
    { value: 'Custom Amount', label: 'Custom Amount', amount: 0 },
  ],
  SPED: [
    { value: 'SPED SESSION', label: 'SPED Tutorial', amount: 900 },
    { value: 'SPED IE', label: 'SPED Initial Evaluation', amount: 1500 },
    { value: 'SPED FE', label: 'SPED Follow-up Evaluation', amount: 1500 },
    { value: 'PLAYSCHOOL', label: 'Playgroup', amount: 750 },
    { value: 'Cancellation Fee', label: 'Cancellation Fee', amount: 0 },
    { value: 'Custom Amount', label: 'Custom Amount', amount: 0 },
  ],
}

const MOP_OPTIONS = ['Cash', 'BDO', 'Union Bank']
const ROW_HEIGHT = 32

function parseTime(str) {
  if (!str) return 0
  const [time, period] = str.split(' ')
  let [h, m] = time.split(':').map(Number)
  if (period === 'PM' && h !== 12) h += 12
  if (period === 'AM' && h === 12) h = 0
  return h * 60 + m
}

function formatTime(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const period = h >= 12 ? 'PM' : 'AM'
  const dh = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${dh}:${m.toString().padStart(2, '0')} ${period}`
}

function getTherapistKey(therapist, therapistData) {
  const t = therapistData.find(x => x.name === therapist)
  if (!t) return 'OT'
  if (t.is_intern) return `${t.specialty}_INTERN`
  return t.specialty
}

function getDefaultSessionType(key) {
  const types = SESSION_TYPES[key] || SESSION_TYPES.OT
  return types[0].value
}

function getSessionColor(session) {
  const paid = session.payment === 'Paid'
  const status = session.status
  if (status === 'Absent') return { bg: '#F4CCCC', border: '#E06666', color: '#7B0000' }
  if (status === 'Pencil') return { bg: '#FFFBE6', border: '#FFD666', color: '#7C5800' }
  if (status === 'Cancelled' && !paid) return { bg: '#FCE5CD', border: '#E69138', color: '#7F3F00' }
  if (status === 'Present' && !paid) return { bg: '#FCE5CD', border: '#E69138', color: '#7F3F00' }
  if ((status === 'Present' && paid) || (status === 'Cancelled' && paid)) return { bg: '#D9EAD3', border: '#6AA84F', color: '#274E13' }
  return { bg: '#E6F1FB', border: '#B5D4F4', color: '#0C447C' }
}

const SESSION_TYPE_RATES = {
  'OT SESSION': 1200, 'OT-IE': 2800, 'OT-FE': 1500, 'SPECIALIZED OT TX': 1700,
  'PR': 750, 'PR-RUSHED': 1000, 'IE REPORT': 0,
  'ST SESSION': 1300, 'ST-IE': 2800, 'ST-FE': 1500, 'SPECIALIZED ST TX': 1700,
  'PT SESSION': 900, 'PT-IE': 2800, 'PT FE': 1500,
  'SPED SESSION': 900, 'SPED IE': 1500, 'SPED FE': 1500, 'PLAYSCHOOL': 750,
}                         

export default function SchedulePage() {
  const [weeks, setWeeks] = useState([])
  const [selectedWeek, setSelectedWeek] = useState(null)
  const [sessions, setSessions] = useState([])
  const [therapistData, setTherapistData] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(() => {
    const day = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    return DAYS.includes(day) ? day : 'Monday'
  })
  const [notification, setNotification] = useState(null)
  const [absentTherapists, setAbsentTherapists] = useState(new Set())
  const [holidayDays, setHolidayDays] = useState(new Set())
  const [blockedSlots, setBlockedSlots] = useState([])
  const [freeSlotMode, setFreeSlotMode] = useState(false)
  const [search, setSearch] = useState('')
  const [payModal, setPayModal] = useState(null)
  const [payForm, setPayForm] = useState({ session_type: '', mop: 'Cash', amount: 0, use_credit: false, split: false, split_credit: 0, split_cash: 0 })
  const [clientCredit, setClientCredit] = useState(0)
  const [rescheduleModal, setRescheduleModal] = useState(null)
  const [rescheduleForm, setRescheduleForm] = useState({ day: '', therapist: '', time_start: '', time_end: '' })
  const [remindModal, setRemindModal] = useState(null)
  const [remindSending, setRemindSending] = useState(false)
  const [addModal, setAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ client_name: '', therapist: '', day: '', time_start: '', time_end: '' })
  const [saving, setSaving] = useState(false)
  const [absentConfirm, setAbsentConfirm] = useState(null)
  const [dragSession, setDragSession] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [contextMenu, setContextMenu] = useState(null) // { session, x, y }

  function getTypesForTherapist(therapistName) {
    const t = therapistData.find(x => x.name === therapistName)
    const specialty = t?.specialty || 'OT'
    const isIntern = t?.is_intern
    if (isIntern) return [
      { value: 'OT SESSION', label: 'Intern Session (₱600)' },
      { value: 'OT-IE', label: 'Intern Evaluation (₱800)' },
      { value: 'Cancellation Fee', label: 'Cancellation Fee' },
    ]
    const maps = {
      OT: ['OT SESSION','OT-IE','OT-FE','SPECIALIZED OT TX','Cancellation Fee'],
      ST: ['ST SESSION','ST-IE','ST-FE','SPECIALIZED ST TX','Cancellation Fee'],
      PT: ['PT SESSION','PT-IE','PT FE','Cancellation Fee'],
      SPED: ['SPED SESSION','SPED IE','SPED FE','PLAYSCHOOL','Cancellation Fee'],
    }
    return (maps[specialty] || maps.OT).map(v => ({ value: v, label: `${v} ${SESSION_TYPE_RATES[v] !== undefined ? `(₱${SESSION_TYPE_RATES[v].toLocaleString()})` : ''}` }))
  }

  useEffect(() => { initializePage() }, [])

  async function initializePage() {
    setLoading(true)
    const [tRes, cRes] = await Promise.all([fetch('/api/therapists'), fetch('/api/clients')])
    const [tJson, cJson] = await Promise.all([tRes.json(), cRes.json()])
    if (tJson.success) setTherapistData(tJson.data)
    if (cJson.success) setClients(cJson.data.filter(c => c.status !== 'inactive'))

    const genRes = await fetch('/api/weeks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'generate' }) })
    const genJson = await genRes.json()
    if (genJson.success && genJson.created?.length > 0) {
      setNotification(`Generated ${genJson.created.length} new week${genJson.created.length !== 1 ? 's' : ''}`)
      setTimeout(() => setNotification(null), 4000)
    }

    const bRes = await fetch('/api/blocked')
    const bJson = await bRes.json()
    if (bJson.success) setBlockedSlots(bJson.data)

    const absentFromBlocked = new Set(
      (bJson.data || [])
        .filter(b => b.type === 'absent' && b.day === selectedDay && b.label?.includes(selectedWeek?.key || ''))
        .map(b => b.therapist)
    )
    setAbsentTherapists(absentFromBlocked)

    const weeksRes = await fetch('/api/weeks')
    const weeksJson = await weeksRes.json()
    if (weeksJson.success && weeksJson.data.length > 0) {
      setWeeks(weeksJson.data)
      const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
      const isSunday = today.getDay() === 0
      const targetDay = isSunday ? new Date(today.getTime() + 24 * 60 * 60 * 1000) : today
      const monday = getMondayOf(targetDay)
      const currentKey = getWeekKey(monday)
      const current = weeksJson.data.find(w => w.key === currentKey) || weeksJson.data[weeksJson.data.length - 1]
      setSelectedWeek(current)
      await fetchSessions(current.key)
    }
    setLoading(false)
  }

  function getMondayOf(date) {
    const d = new Date(date)
    const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    return d
  }

  function getWeekKey(monday) {
    const y = monday.getFullYear()
    const m = String(monday.getMonth() + 1).padStart(2, '0')
    const d = String(monday.getDate()).padStart(2, '0')
    return `week_${y}_${m}_${d}`
  }

  async function fetchSessions(weekKey) {
    const res = await fetch(`/api/sessions?week=${weekKey}`)
    const json = await res.json()
    if (json.success) setSessions(json.data)
  }

  async function switchWeek(week) {
    setSelectedWeek(week)

    const bRes = await fetch('/api/blocked')
    const bJson = await bRes.json()
    if (bJson.success) {
      setBlockedSlots(bJson.data)
      const absentFromBlocked = new Set(
        (bJson.data || [])
          .filter(b => b.type === 'absent' && b.day === selectedDay && b.label?.includes(week.key))
          .map(b => b.therapist)
      )
      setAbsentTherapists(absentFromBlocked)  
    } else {
      setAbsentTherapists(new Set())
    }
    setHolidayDays(new Set())
    setSearch('')
    setFreeSlotMode(false)
    setSessions([])
    await fetchSessions(week.key)
  }

  // Grid calculations
const daySessions = sessions.filter(s => s.day === selectedDay)
  
  const therapistsByStartTime = ['8:00 AM', '8:15 AM', '8:30 AM', '8:45 AM'].flatMap(startTime =>
    [...new Set(
      therapistData
        .filter(t => t.day === selectedDay && t.time_start === startTime)
        .map(t => t.name)
    )].sort()
  )

  const oneOffTherapists = [...new Set(daySessions.map(s => s.therapist))]
    .filter(t => !therapistsByStartTime.includes(t))
    .sort()

  const therapists = therapistsByStartTime.length > 0 
    ? [...therapistsByStartTime, ...oneOffTherapists]
    : [...new Set(therapistData.filter(t => t.day === selectedDay).map(t => t.name))].sort()

  const gridStartMins = 8 * 60
  const gridEndMins = therapists.reduce((max, t) => {
    const entry = therapistData.find(x => x.name === t && x.day === selectedDay)
    if (!entry) return max
    return Math.max(max, parseTime(entry.time_end))
  }, 18 * 60)

  const totalMins = gridEndMins - gridStartMins
  const totalRows = Math.ceil(totalMins / 15)
  const timeSlots = []
  for (let i = 0; i <= totalRows; i++) timeSlots.push(formatTime(gridStartMins + i * 15))

  function getSessionsForTherapist(therapist) {
    return daySessions.filter(s => s.therapist === therapist)
  }

  function isSlotFree(therapist, timeMins) {
    return !daySessions.some(s => {
      const start = parseTime(s.time_start)
      const end = parseTime(s.time_end)
      return s.therapist === therapist && timeMins >= start && timeMins < end
    })
  }

  async function updateStatus(session, status) {
    if (status === 'Absent' && session.payment === 'Paid') { setAbsentConfirm(session); return }
    await fetch('/api/sessions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status', week_key: selectedWeek.key, rowIndex: session.index, status }) })
    fetchSessions(selectedWeek.key)
    const cRes = await fetch('/api/clients')
    const cJson = await cRes.json()
    if (cJson.success) setClients(cJson.data.filter(c => c.status !== 'inactive'))
  }

  async function confirmAbsent() {
    await fetch('/api/sessions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'absent_paid', week_key: selectedWeek.key, rowIndex: absentConfirm.index, client_name: absentConfirm.client_name, amount: absentConfirm.amount }) })
    setAbsentConfirm(null)
    fetchSessions(selectedWeek.key)
  }

  async function openPayModal(session) {
    const key = getTherapistKey(session.therapist, therapistData)
    const types = SESSION_TYPES[key] || SESSION_TYPES.OT
    const defaultType = types[0].value
    const amount = types[0].amount
    setPayForm({ session_type: defaultType, mop: 'Cash', amount, use_credit: false, split: false, split_credit: 0, split_cash: amount })
    setPayModal(session)
    const res = await fetch(`/api/credits?client=${encodeURIComponent(session.client_name)}`)
    const json = await res.json()
    if (json.success) setClientCredit(json.credit_balance || 0)
  }

  async function confirmPayment() {
    setSaving(true)
    await fetch('/api/sessions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pay', week_key: selectedWeek.key, rowIndex: payModal.index, session_id: payModal.id, client_name: payModal.client_name, therapist: payModal.therapist, date: payModal.date, session_type: payForm.session_type, mop: payForm.use_credit ? 'Credit' : payForm.split ? 'Split' : payForm.mop, amount: payForm.amount, use_credit: payForm.use_credit, split: payForm.split, split_credit: payForm.split_credit, split_cash: payForm.split_cash })
    })
    setPayModal(null)
    fetchSessions(selectedWeek.key)
    const cRes = await fetch('/api/clients')
    const cJson = await cRes.json()
    if (cJson.success) setClients(cJson.data.filter(c => c.status !== 'inactive'))
    setSaving(false)
  }

  async function reversePayment(session) {
    if (!confirm(`Reverse payment for ${session.client_name}?`)) return
    await fetch('/api/sessions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unpay', week_key: selectedWeek.key, rowIndex: session.index, session_id: session.id, client_name: session.client_name, amount: session.amount }) })
    fetchSessions(selectedWeek.key)
    const cRes = await fetch('/api/clients')
    const cJson = await cRes.json()
    if (cJson.success) setClients(cJson.data.filter(c => c.status !== 'inactive'))
  }

  async function deleteSession(session) {
    if (!confirm(`Delete session for ${session.client_name}?`)) return
    await fetch('/api/sessions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rowIndex: session.index, week_key: selectedWeek.key }) })
    fetchSessions(selectedWeek.key)
  }

  async function confirmReschedule() {
    if (!rescheduleForm.day || !rescheduleForm.therapist || !rescheduleForm.time_start || !rescheduleForm.time_end) return alert('Please fill in all fields')
    setSaving(true)
    const parts = selectedWeek.key.replace('week_', '').split('_')
    const monday = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`)
    const weekDates = {}
    DAYS.forEach((day, i) => {
      const d = new Date(monday)
      d.setDate(d.getDate() + i)
      weekDates[day] = d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
    })
    await fetch('/api/sessions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reschedule', week_key: selectedWeek.key, rowIndex: rescheduleModal.index, therapist: rescheduleForm.therapist, date: weekDates[rescheduleForm.day] || '', day: rescheduleForm.day, time_start: rescheduleForm.time_start, time_end: rescheduleForm.time_end }) })
    setRescheduleModal(null)
    fetchSessions(selectedWeek.key)
    setSaving(false)
  }

  async function addOneOff() {
    if (!addForm.client_name || !addForm.therapist || !addForm.day || !addForm.time_start || !addForm.time_end) return alert('Please fill in all fields')
    setSaving(true)
    const parts = selectedWeek.key.replace('week_', '').split('_')
    const monday = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`)
    const weekDates = {}
    DAYS.forEach((day, i) => {
      const d = new Date(monday)
      d.setDate(d.getDate() + i)
      weekDates[day] = d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
    })
    await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', week_key: selectedWeek.key, ...addForm, date: weekDates[addForm.day] || '' }) })
    setAddModal(false)
    setAddForm({ client_name: '', therapist: '', day: '', time_start: '', time_end: '' })
    fetchSessions(selectedWeek.key)
    setSaving(false)
  }

  async function toggleHoliday(day) {
    if (holidayDays.has(day)) { setHolidayDays(prev => { const n = new Set(prev); n.delete(day); return n }); return }
    if (!confirm(`Mark ${day} as a holiday? All sessions will be cancelled.`)) return
    setHolidayDays(prev => new Set([...prev, day]))
    await fetch('/api/sessions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'holiday', week_key: selectedWeek.key, day }) })
    const affectedSessions = sessions.filter(s => s.day === day && s.status !== 'Cancelled')
    const uniqueClients = [...new Set(affectedSessions.map(s => s.client_name))]
    
    if (uniqueClients.length > 0) {
      const defaultMessage = `Hello po! We would like to inform you that our clinic will be closed on ${day}, [DATE]. We apologize for any inconvenience and will reach out to reschedule your appointment. Thank you for your understanding! 😊`
      
      const editedMessage = window.prompt(`Holiday message for ${uniqueClients.length} client(s) — edit if needed:`, defaultMessage)
      
      if (editedMessage) {
        for (const clientName of uniqueClients) {
          const client = clients.find(c => c.name === clientName)
          await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create_draft',
              client_name: clientName,
              psid: client?.psid || '',
              type: 'holiday',
              message: editedMessage
            })
          })
        }
        alert(`${uniqueClients.length} message draft(s) created! Go to Messages page to review and send.`)
      }
    }
    fetchSessions(selectedWeek.key)
  }

    async function toggleTherapistAbsent(therapist) {
    const isAbsent = absentTherapists.has(therapist)
    if (isAbsent) {
      setAbsentTherapists(prev => { const n = new Set(prev); n.delete(therapist); return n })
      await fetch('/api/sessions', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'therapist_undo_absent', week_key: selectedWeek.key, therapist, day: selectedDay })
      })
    } else {
      if (!confirm(`Mark ${therapist} as absent for ${selectedDay}?`)) return
      setAbsentTherapists(prev => new Set([...prev, therapist]))
      await fetch('/api/sessions', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'therapist_absent', week_key: selectedWeek.key, therapist, day: selectedDay })
      })
      const affectedSessions = sessions.filter(s => s.therapist === therapist && s.day === selectedDay && s.status !== 'Cancelled')
      const uniqueClients = [...new Set(affectedSessions.map(s => s.client_name))]

      if (uniqueClients.length > 0) {
        const defaultMessage = `Hello po! We would like to inform you that T. ${therapist} will be unavailable on ${selectedDay}, [DATE]. We apologize for the inconvenience and will reach out to reschedule your session. Thank you for your understanding! 😊`

        const editedMessage = window.prompt(`Absence message for ${uniqueClients.length} client(s) of ${therapist} — edit if needed:`, defaultMessage)

        if (editedMessage) {
          for (const clientName of uniqueClients) {
            const client = clients.find(c => c.name === clientName)
            await fetch('/api/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'create_draft',
                client_name: clientName,
                psid: client?.psid || '',
                type: 'therapist_absent',
                message: editedMessage
              })
            })
          }
          alert(`${uniqueClients.length} message draft(s) created! Go to Messages page to review and send.`)
        }
      }
    }
  }

  const therapistKey = payModal ? getTherapistKey(payModal.therapist, therapistData) : 'OT'
  const sessionTypes = SESSION_TYPES[therapistKey] || SESSION_TYPES.OT
  const isCustomAmount = ['SPECIALIZED OT TX', 'SPECIALIZED ST TX', 'Cancellation Fee', 'Custom Amount', 'IE REPORT'].includes(payForm.session_type)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const searchedSessions = search ? sessions.filter(s => s.client_name?.toLowerCase().includes(search.toLowerCase())) : null

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>

      {notification && (
        <div style={{ position: 'fixed', top: '1rem', right: '1rem', background: '#0f4c81', color: 'white', padding: '12px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '500', zIndex: 200, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          ✓ {notification}
        </div>
      )}

      {contextMenu && (
        <div
          onClick={() => setContextMenu(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed', top: contextMenu.y, left: contextMenu.x,
              background: 'white', borderRadius: '8px', border: '1px solid #e0e0e0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 201, minWidth: '200px', padding: '6px 0'
            }}
          >
            <div style={{ fontSize: '11px', color: '#999', padding: '4px 12px 6px', borderBottom: '1px solid #f0f0f0', marginBottom: '4px' }}>
              {contextMenu.session.client_name} — change type
            </div>
            {getTypesForTherapist(contextMenu.session.therapist).map(t => (
              <button key={t.value} onClick={async () => {
                const isIntern = therapistData.find(x => x.name === contextMenu.session.therapist)?.is_intern
                const amount = isIntern
                  ? (t.value === 'OT-IE' ? 800 : 600)
                  : (SESSION_TYPE_RATES[t.value] ?? 0)
                const sheets = selectedWeek
                await fetch('/api/sessions', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'update_type',
                    week_key: selectedWeek.key,
                    rowIndex: contextMenu.session.index,
                    session_type: t.value,
                    amount
                  })
                })
                setContextMenu(null)
                fetchSessions(selectedWeek.key)
              }} style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '6px 12px', border: 'none', background: 'none',
                fontSize: '12px', color: '#333', cursor: 'pointer',
                fontWeight: contextMenu.session.session_type === t.value ? '600' : '400',
                background: contextMenu.session.session_type === t.value ? '#f0f0f0' : 'none'
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ color: '#0f4c81', margin: '0 0 4px' }}>Schedule</h1>
          {selectedWeek && <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>{selectedWeek.label}</p>}
          <span style={{ fontSize: '11px', color: '#999' }}>Right-click any session to change its type</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input placeholder="Search client..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', width: '180px' }} />
          <select value={selectedWeek?.key || ''} onChange={e => { const w = weeks.find(x => x.key === e.target.value); if (w) switchWeek(w) }}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', cursor: 'pointer' }}>
            {weeks.map(w => <option key={w.key} value={w.key}>{w.label}</option>)}
          </select>
          <button onClick={() => setAddModal(true)} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#1D9E75', color: 'white', cursor: 'pointer', fontWeight: '500' }}>+ Add one-off session</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {DAYS.map(day => {
          const count = sessions.filter(s => s.day === day).length
          const isToday = day === today
          const isHoliday = holidayDays.has(day)
          return (
            <button key={day} onClick={() => { setSelectedDay(day); setFreeSlotMode(false)
              const absentFromBlocked = new Set(
                (blockedSlots || [])
                  .filter(b => b.type === 'absent' && b.day === day && b.label?.includes(selectedWeek?.key || ''))
                  .map(b => b.therapist)
              )
              setAbsentTherapists(absentFromBlocked)
             }} style={{
              padding: '7px 14px', borderRadius: '20px',
              border: isToday ? '2px solid #fcc200' : 'none',
              cursor: 'pointer', fontSize: '13px', fontWeight: '500',
              background: isHoliday ? '#888' : selectedDay === day ? '#0f4c81' : '#f0f0f0',
              color: isHoliday || selectedDay === day ? 'white' : '#666'
            }}>
              {day} {isHoliday ? '🏖' : count > 0 ? <span style={{ fontSize: '11px', opacity: 0.7 }}>({count})</span> : ''}
            </button>
          )
        })}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button onClick={() => setFreeSlotMode(!freeSlotMode)} style={{
            padding: '7px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px',
            background: freeSlotMode ? '#1D9E75' : '#f0f0f0',
            color: freeSlotMode ? 'white' : '#666'
          }}>Highlight free slots</button>
          <button onClick={() => toggleHoliday(selectedDay)} style={{
            padding: '7px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px',
            background: holidayDays.has(selectedDay) ? '#888' : '#f0f0f0',
            color: holidayDays.has(selectedDay) ? 'white' : '#666'
          }}>{holidayDays.has(selectedDay) ? '🏖 Holiday' : 'Mark holiday'}</button>
        </div>
      </div>

      {/* Modals */}
      {absentConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '400px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 0.5rem', color: '#0f4c81' }}>Session already paid</h3>
            <p style={{ margin: '0 0 0.5rem', fontSize: '14px' }}>This session for <strong>{absentConfirm.client_name}</strong> was already paid (₱{Number(absentConfirm.amount || 0).toLocaleString()}).</p>
            <p style={{ margin: '0 0 1.5rem', fontSize: '13px', color: '#666' }}>Payment will be moved to their credit balance automatically. If a cash refund is needed, go to the Payments page.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setAbsentConfirm(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={confirmAbsent} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#E24B4A', color: 'white', cursor: 'pointer', fontWeight: '500' }}>Mark absent + credit payment</button>
            </div>
          </div>
        </div>
      )}

      {payModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '420px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 1rem', color: '#0f4c81' }}>Record payment</h3>
            <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '10px 12px', marginBottom: '1rem' }}>
              <div style={{ fontWeight: '500', color: '#0f4c81' }}>{payModal.client_name}</div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{payModal.therapist} · {payModal.day} {payModal.time_start}–{payModal.time_end}</div>
              {clientCredit > 0 && <div style={{ marginTop: '6px', fontSize: '12px', color: '#27500A', background: '#EAF3DE', padding: '4px 8px', borderRadius: '6px', display: 'inline-block' }}>💳 Credit: ₱{clientCredit.toLocaleString()}</div>}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Session type</label>
              <select value={payForm.session_type}
                onChange={e => {
                  const t = sessionTypes.find(x => x.value === e.target.value)
                  setPayForm({ ...payForm, session_type: e.target.value, amount: t?.amount || 0, split_cash: t?.amount || 0, use_credit: false, split: false })
                }}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}>
                {sessionTypes.map(t => <option key={t.value} value={t.value}>{t.label}{t.amount > 0 ? ` — ₱${t.amount.toLocaleString()}` : ' — custom amount'}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>
                Amount (₱) {isCustomAmount && <span style={{ color: '#E24B4A', fontWeight: '500' }}>— enter manually</span>}
              </label>
              <input type="number" value={payForm.amount}
                onChange={e => setPayForm({ ...payForm, amount: Number(e.target.value), split_cash: Number(e.target.value) })}
                readOnly={!isCustomAmount}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: isCustomAmount ? '2px solid #fcc200' : '1px solid #ddd', fontSize: '16px', fontWeight: '500', boxSizing: 'border-box', background: isCustomAmount ? 'white' : '#f8f9fa' }} />
            </div>
            {payForm.session_type === 'Custom Amount' && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Notes <span style={{ color: '#E24B4A' }}>*</span></label>
                <input value={payForm.custom_notes || ''} onChange={e => setPayForm({ ...payForm, custom_notes: e.target.value })}
                  placeholder="Specify session type or reason..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: !payForm.custom_notes ? '2px solid #EF9F27' : '1px solid #97C459', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
            )}
            {clientCredit > 0 && (
              <div style={{ marginBottom: '12px', padding: '10px 12px', background: '#EAF3DE', borderRadius: '8px', border: '1px solid #97C459' }}>
                <div style={{ fontSize: '12px', fontWeight: '500', color: '#27500A', marginBottom: '8px' }}>Client has ₱{clientCredit.toLocaleString()} credit</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    ...(clientCredit >= payForm.amount ? [{ key: 'full', label: 'Use full credit', active: payForm.use_credit && !payForm.split }] : []),
                    { key: 'split', label: 'Split payment', active: payForm.split },
                    { key: 'normal', label: 'Pay normally', active: !payForm.use_credit && !payForm.split },
                  ].map(opt => (
                    <button key={opt.key} onClick={() => {
                      if (opt.key === 'full') setPayForm({ ...payForm, use_credit: true, split: false, mop: 'Credit' })
                      else if (opt.key === 'split') setPayForm({ ...payForm, split: true, use_credit: false, split_credit: Math.min(clientCredit, payForm.amount), split_cash: Math.max(0, payForm.amount - clientCredit) })
                      else setPayForm({ ...payForm, use_credit: false, split: false })
                    }} style={{
                      padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', border: 'none',
                      background: opt.active ? '#27500A' : 'white',
                      color: opt.active ? 'white' : '#27500A', fontWeight: '500'
                    }}>{opt.label}</button>
                  ))}
                </div>
                {payForm.split && (
                  <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Credit amount</label>
                      <input type="number" value={payForm.split_credit}
                        onChange={e => setPayForm({ ...payForm, split_credit: Number(e.target.value), split_cash: Math.max(0, payForm.amount - Number(e.target.value)) })}
                        style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #97C459', fontSize: '13px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '3px' }}>Cash amount</label>
                      <input type="number" value={payForm.split_cash}
                        onChange={e => setPayForm({ ...payForm, split_cash: Number(e.target.value), split_credit: Math.max(0, payForm.amount - Number(e.target.value)) })}
                        style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                )}
              </div>
            )}
            {!payForm.use_credit && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>Mode of payment</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {MOP_OPTIONS.map(mop => (
                    <button key={mop} onClick={() => setPayForm({ ...payForm, mop, reference: '' })} style={{
                      padding: '7px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px',
                      border: payForm.mop === mop ? '2px solid #0f4c81' : '1px solid #ddd',
                      background: payForm.mop === mop ? '#E6F1FB' : 'white',
                      color: payForm.mop === mop ? '#0f4c81' : '#666',
                      fontWeight: payForm.mop === mop ? '500' : '400'
                    }}>{mop}</button>
                  ))}
                </div>
                {(payForm.mop === 'BDO' || payForm.mop === 'Union Bank') && !payForm.use_credit && (
                  <div style={{ marginTop: '8px' }}>
                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Reference number <span style={{ color: '#E24B4A' }}>*</span></label>
                    <input value={payForm.reference || ''} onChange={e => setPayForm({ ...payForm, reference: e.target.value })}
                      placeholder="Enter reference number..."
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: !payForm.reference ? '2px solid #EF9F27' : '1px solid #97C459', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                )}
              </div>
            )}
            <div style={{ background: '#EAF3DE', borderRadius: '8px', padding: '10px 14px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#27500A', fontWeight: '500' }}>Total</span>
              <span style={{ color: '#27500A', fontWeight: '700', fontSize: '18px' }}>₱{Number(payForm.amount || 0).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setPayModal(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={confirmPayment} disabled={saving || !payForm.amount || ((payForm.mop === 'BDO' || payForm.mop === 'Union Bank') && !payForm.use_credit && !payForm.reference) || (payForm.session_type === 'Custom Amount' && !payForm.custom_notes)} style={{
 padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#1D9E75', color: 'white', cursor: 'pointer', fontWeight: '500', opacity: (saving || !payForm.amount || ((payForm.mop === 'BDO' || payForm.mop === 'Union Bank') && !payForm.use_credit && !payForm.reference) || (payForm.session_type === 'Custom Amount' && !payForm.custom_notes)) ? 0.5 : 1 }}>
                {saving ? 'Saving...' : `Confirm ₱${Number(payForm.amount || 0).toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {rescheduleModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '400px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 0.5rem', color: '#0f4c81' }}>Reschedule</h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '13px', color: '#999' }}>{rescheduleModal.client_name} · {rescheduleModal.day} {rescheduleModal.time_start}</p>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>New day</label>
              <select value={rescheduleForm.day} onChange={e => setRescheduleForm({ ...rescheduleForm, day: e.target.value, therapist: '', time_start: '', time_end: '' })}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}>
                <option value="">Select day...</option>
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Therapist</label>
              <select value={rescheduleForm.therapist} onChange={e => setRescheduleForm({ ...rescheduleForm, therapist: e.target.value, time_start: '', time_end: '' })}
                disabled={!rescheduleForm.day}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', opacity: !rescheduleForm.day ? 0.5 : 1 }}>
                <option value="">Select therapist...</option>
                {[...new Set(therapistData.filter(t => t.day === rescheduleForm.day).map(t => t.name))].sort().map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Start time</label>
                <select value={rescheduleForm.time_start} onChange={e => setRescheduleForm({ ...rescheduleForm, time_start: e.target.value, time_end: '' })}
                  disabled={!rescheduleForm.therapist}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', opacity: !rescheduleForm.therapist ? 0.5 : 1 }}>
                  <option value="">Start...</option>
                  {(() => {
                    const entry = therapistData.find(t => t.name === rescheduleForm.therapist && t.day === rescheduleForm.day)
                    if (!entry) return null
                    const slots = []
                    let mins = parseTime(entry.time_start)
                    const end = parseTime(entry.time_end)
                    while (mins < end) { slots.push(formatTime(mins)); mins += 15 }
                    return slots.map(t => <option key={t} value={t}>{t}</option>)
                  })()}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>End time</label>
                <select value={rescheduleForm.time_end} onChange={e => setRescheduleForm({ ...rescheduleForm, time_end: e.target.value })}
                  disabled={!rescheduleForm.time_start}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', opacity: !rescheduleForm.time_start ? 0.5 : 1 }}>
                  <option value="">End...</option>
                  {[60, 90, 120].map(mins => {
                    if (!rescheduleForm.time_start) return null
                    const endMins = parseTime(rescheduleForm.time_start) + mins
                    const endTime = formatTime(endMins)
                    return <option key={mins} value={endTime}>{mins === 60 ? '1 hr' : mins === 90 ? '1.5 hrs' : '2 hrs'} ({endTime})</option>
                  })}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setRescheduleModal(null); setRescheduleForm({ day: '', therapist: '', time_start: '', time_end: '' }) }}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={confirmReschedule} disabled={saving} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0f4c81', color: 'white', cursor: 'pointer', fontWeight: '500' }}>
                {saving ? 'Moving...' : 'Confirm reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {remindModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '400px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 0.5rem', color: '#0f4c81' }}>Send reminder</h3>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '1.5rem' }}>{remindModal.client_name} · {remindModal.date} · {remindModal.time_start}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
              {[
                { type: 'ie_reminder', label: '📅 IE Appointment Reminder', show: true },
                { type: 'outstanding', label: '💳 Outstanding Balance Reminder', show: true },
                { type: 'makeup', label: '🔄 Re-Schedule / Make-Up Request', show: true },
              ].map(opt => (
                <button key={opt.type} onClick={async () => {
                  setRemindSending(true)
                  const client = clients.find(c => c.name === remindModal.client_name)
                  const psid = client?.psid || ''
                  const outstanding = Number(client?.outstanding_balance || 0)

                  let message = ''
                  if (opt.type === 'ie_reminder') {
                    message = `Hello po! This is a friendly reminder that ${remindModal.client_name} has an EVALUATION SESSION on ${remindModal.date} at ${remindModal.time_start}. See you po! 😊`
                  } else if (opt.type === 'outstanding') {
                    message = `Hello po! This is a gentle reminder to settle your outstanding balance of PHP ${outstanding.toLocaleString()} for ${remindModal.client_name}. Please remit the total balance to ensure there is no interruption to your scheduled sessions.\n\nYou can complete your payment via the following methods:\n\nFor cashless payments, here is our account:\n\nACCOUNT NAME: Potentials Therapy Center\nBDO: 0122-2002-8786\nUNION BANK: 0023-1000-9113\n\nPlease be advised that if the balance is not settled, we will be unable to proceed with further sessions until your account is brought current. We value our professional relationship and trust that this will be resolved swiftly.\n\nThank you for your prompt attention to this matter.`
                  } else if (opt.type === 'makeup') {
                    message = `Hello po! Pwede po ba si ${remindModal.client_name} for make up on **DATE & TIME** with T. **THERAPIST**. Please confirm as soon as possible.`
                  }

                  await fetch('/api/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'create_draft',
                      client_name: remindModal.client_name,
                      psid,
                      type: opt.type,
                      message
                    })
                  })
                  setRemindModal(null)
                  setRemindSending(false)
                  alert(`Draft created! Go to Messages page to review and send.`)
                }} disabled={remindSending} style={{
                  padding: '12px 16px', borderRadius: '8px', border: '1px solid #e0e0e0',
                  background: '#f8f9fa', color: '#333', cursor: 'pointer', fontSize: '13px',
                  textAlign: 'left', fontWeight: '500'
                }}>{opt.label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setRemindModal(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}


        {addModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', width: '400px', maxWidth: '90vw' }}>
              <h3 style={{ margin: '0 0 1rem', color: '#0f4c81' }}>Add one-off session</h3>

              {/* Client name — free text + datalist */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Client name</label>
                <input value={addForm.client_name} onChange={e => setAddForm({ ...addForm, client_name: e.target.value })}
                  list="client-list" placeholder="Type name or select existing..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }} />
                <datalist id="client-list">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist>
                <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>Can type a new name for walk-in / IE clients</div>
              </div>

              {/* Day */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Day</label>
                <select value={addForm.day} onChange={e => setAddForm({ ...addForm, day: e.target.value, therapist: '' })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}>
                  <option value="">Select day...</option>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Therapist */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Therapist</label>
                <select value={addForm.therapist} onChange={e => setAddForm({ ...addForm, therapist: e.target.value })}
                  disabled={!addForm.day}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', opacity: !addForm.day ? 0.5 : 1 }}>
                  <option value="">Select therapist...</option>
                  {[...new Set(therapistData.map(t => t.name))].sort().map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.5rem' }}>
                {['time_start', 'time_end'].map(key => (
                  <div key={key}>
                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>{key === 'time_start' ? 'Start' : 'End'}</label>
                    <select value={addForm[key]} onChange={e => setAddForm({ ...addForm, [key]: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }}>
                      <option value="">Select...</option>
                      {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => { setAddModal(false); setAddForm({ client_name: '', therapist: '', day: '', time_start: '', time_end: '' }) }}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: 'white' }}>Cancel</button>
                <button onClick={addOneOff} disabled={saving} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0f4c81', color: 'white', cursor: 'pointer', fontWeight: '500' }}>
                  {saving ? 'Adding...' : 'Add session'}
                </button>
              </div>
            </div>
          </div>
        )}

      {search && searchedSessions ? (
        <div>
          <p style={{ fontSize: '13px', color: '#999', marginBottom: '12px' }}>{searchedSessions.length} result{searchedSessions.length !== 1 ? 's' : ''} for "{search}"</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {searchedSessions.map((s, i) => {
              const sc = getSessionColor(s)
              return (
                <div key={i} style={{ background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '500', color: sc.color }}>
                    {s.client_name}
                    {(() => { const ci = clients.find(c => c.name === s.client_name); return (ci?.outstanding_balance > 0 || (s.payment === 'Unpaid' && (s.status === 'Present' || s.status === 'Cancelled'))) ? <span style={{ marginLeft: '4px', fontSize: '15px' }}>⚠️</span> : null })()}
                  </div>
                  <div style={{ fontSize: '12px', color: sc.color, opacity: 0.8 }}>{s.therapist} · {s.day} {s.time_start}–{s.time_end}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.6)', color: sc.color }}>{s.status}</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.6)', color: sc.color }}>{s.payment}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Loading...</div>

      ) : sessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999', background: '#f8f9fa', borderRadius: '12px' }}>
          No sessions yet — finish migration then sessions will auto-generate!
        </div>

      ) : (
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)', position: 'relative' }}>
          <div style={{ display: 'flex', minWidth: 'fit-content' }}>
            {/* Time column */}
              <div style={{ flexShrink: 0, width: '70px', position: 'sticky', left: 0, zIndex: 10, background: 'white' }}>
              <div style={{ height: '60px', background: '#0f4c81', borderBottom: '2px solid #fcc200', position: 'sticky', top: 0, zIndex: 11 }} />
              {timeSlots.map((slot, i) => (
                                <div key={slot} style={{
                  height: `${ROW_HEIGHT}px`,
                  display: 'flex', alignItems: 'center',
                  paddingLeft: '8px',
                  fontSize: i % 4 === 0 ? '10px' : '9px',
                  color: i % 4 === 0 ? '#999' : '#bbb',
                  fontWeight: i % 4 === 0 ? '500' : '400',
                  borderBottom: `1px solid ${i % 4 === 0 ? '#e0e0e0' : '#f5f5f5'}`,
                  background: i % 4 === 0 ? '#fafafa' : 'white',
                  whiteSpace: 'nowrap', boxSizing: 'border-box'
                }}>
                  {slot}
                </div>
              ))}
            </div>

                        {/* Therapist columns */}
            {therapists.map((therapist, therapistIndex) => {
              const isAbsent = absentTherapists.has(therapist)
              const therapistEntry = therapistData.find(t => t.name === therapist && t.day === selectedDay)
              const specialty = therapistEntry?.specialty || 'OT'
              const therapistSessions = getSessionsForTherapist(therapist)
              const prevTherapist = therapists[therapistIndex - 1]
              const prevEntry = prevTherapist ? therapistData.find(t => t.name === prevTherapist && t.day === selectedDay) : null
              const isNewGroup = therapistIndex > 0 && therapistEntry?.time_start !== prevEntry?.time_start

              return (
                <div key={therapist} style={{ flexShrink: 0, width: '155px', borderLeft: isNewGroup ? '3px solid #0f4c81' : '1px solid #e0e0e0' }}>
                  {/* Header */}
                  <div style={{
                    height: '60px', background: isAbsent ? '#777' : '#0f4c81', color: 'white',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    borderBottom: '2px solid #fcc200', padding: '4px', gap: '3px',
                    position: 'sticky', top: 0, zIndex: 5
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '500', textAlign: 'center' }}>{therapist}</div>
                    <div style={{ fontSize: '10px', opacity: 0.7 }}>{specialty}{therapistEntry?.is_intern ? ' · Intern' : ''}</div>
                    <button onClick={() => toggleTherapistAbsent(therapist)} style={{
                      fontSize: '9px', padding: '1px 8px', borderRadius: '10px', border: 'none',
                      cursor: 'pointer', fontWeight: '500',
                      background: isAbsent ? '#c00' : 'rgba(255,255,255,0.2)', color: 'white'
                    }}>{isAbsent ? 'ABSENT' : 'Mark absent'}</button>
                  </div>

                  {/* Grid body */}
                  <div style={{ position: 'relative', height: `${totalRows * ROW_HEIGHT}px` }}>
                    {/* Background rows */}
                    {timeSlots.map((slot, i) => {
                      const slotMins = gridStartMins + i * 15
                      const free = isSlotFree(therapist, slotMins)
                      return (
                        <div key={slot} style={{
                          position: 'absolute', top: `${i * ROW_HEIGHT}px`,
                          width: '100%', height: `${ROW_HEIGHT}px`,
                          borderBottom: `${i % 4 === 3 ? '2px solid #ccc' : `1px solid ${i % 4 === 0 ? '#e8e8e8' : '#f5f5f5'}`}`,
                          background: dragOver?.therapist === therapist && dragOver?.slotMins === slotMins ? 'rgba(266, 165, 245, 0.3)' : isAbsent ? '#f5f5f5' : freeSlotMode && free ? 'rgba(225,245,238,0.6)' : freeSlotMode && !free ? '#f8f8f8' : i % 4 === 0 ? '#fafafa' : 'white',
                          boxSizing: 'border-box'
                         }} 
                        onClick={() => {
                          if (dragSession) return
                          if (isAbsent) return
                          setAddForm({ client_name: '', therapist, day: selectedDay, time_start: formatTime(slotMins), time_end: formatTime(slotMins + 60) })
                          setAddModal(true)
                        }}
                        onDragOver={e => { e.preventDefault(); setDragOver({ therapist, slotMins }) }}
                        onMouseEnter={e => { 
                          if (!isAbsent) e.currentTarget.style.background = 'rgba(66, 165, 245, 0.15)' 
                        }}
                        onMouseLeave={e => { 
                          e.currentTarget.style.background = dragOver?.therapist === therapist && dragOver?.slotMins === slotMins ? 'rgba(66, 165, 245, 0.3)' : isAbsent ? '#f5f5f5' : freeSlotMode && free ? 'rgba(225,245,238,0.6)' : freeSlotMode && !free ? '#f8f8f8' : i % 4 === 0 ? '#fafafa' : 'white' 
                        }}
                        onDrop={async e => {
                          e.preventDefault()
                          if (!dragSession) return
                          const newTimeStart = formatTime(slotMins)
                          const duration = parseTime(dragSession.time_end) - parseTime(dragSession.time_start)
                          const newTimeEnd = formatTime(slotMins + duration)
                          if (newTimeStart === dragSession.time_start && therapist === dragSession.therapist) return
                          const parts = selectedWeek.key.replace('week_', '').split('_')
                          const monday = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`)
                          const weekDates = {}
                          DAYS.forEach((day, idx) => {
                            const d = new Date(monday)
                            d.setDate(d.getDate() + idx)
                            weekDates[day] = d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
                          })
                          await fetch('/api/sessions', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'reschedule',
                              week_key: selectedWeek.key,
                              rowIndex: dragSession.index,
                              therapist,
                              date: weekDates[selectedDay] || '',
                              day: selectedDay,
                              time_start: newTimeStart,
                              time_end: newTimeEnd
                            })
                          })
                          setDragSession(null)
                          setDragOver(null)
                          fetchSessions(selectedWeek.key)
                        }}
                        />
                      )
                    })}

                    {/* Blocked slots */}
                    {blockedSlots
                        .filter(b => b.therapist === therapist && b.day === selectedDay && b.type !== 'absent')
                        .map((b, bi) => {
                        const bStartMins = parseTime(b.time_start)
                        const bEndMins = parseTime(b.time_end)
                        const topOffset = ((bStartMins - gridStartMins) / 15) * ROW_HEIGHT
                        const height = ((bEndMins - bStartMins) / 15) * ROW_HEIGHT - 2
                        const isAdmin = b.type === 'admin'
                        return (
                          <div key={bi} style={{
                            position: 'absolute',
                            top: `${topOffset + 1}px`,
                            left: '2%', width: '96%',
                            height: `${height}px`,
                            background: isAdmin ? '#d0d0d0' : '#555',
                            borderRadius: '4px',
                            boxSizing: 'border-box',
                            zIndex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden'
                          }}>
                            {isAdmin && b.label && (
                              <div style={{ fontSize: '9px', color: '#444', fontWeight: '500', textAlign: 'center', padding: '0 4px' }}>{b.label}</div>
                            )}
                          </div>
                        )
                      })
                    }

                    {/* Session blocks */}
                    {therapistSessions.map((s, si) => {
                        const startMins = parseTime(s.time_start)
                        const endMins = parseTime(s.time_end)
                        const topOffset = ((startMins - gridStartMins) / 15) * ROW_HEIGHT
                        const height = Math.max(((endMins - startMins) / 15) * ROW_HEIGHT - 2, ROW_HEIGHT - 2)
                        const sc = getSessionColor(s)
                        const clientInfo = clients.find(c => c.name === s.client_name)
                        const hasOutstanding = clientInfo?.outstanding_balance > 0
                        const needsWarning = hasOutstanding || (s.payment === 'Unpaid' && (s.status === 'Present' || s.status === 'Cancelled'))

                        const sameStart = therapistSessions.filter(x => x.time_start === s.time_start)
                        const stackIndex = sameStart.indexOf(s)
                        const stackCount = sameStart.length
                        const stackedTop = topOffset + 1 + (stackIndex * (height / stackCount))
                        const stackedHeight = Math.max((height / stackCount) - 2, 14)

                        return (
                          <div key={si}
                            draggable
                            onDragStart={() => setDragSession(s)}
                            onDragEnd={() => { setDragSession(null); setDragOver(null) }}
                            onDragOver={e => { e.preventDefault(); setDragOver({ therapist, slotMins: parseTime(s.time_start) }) }}
                            onDrop={async e => {
                              e.preventDefault()
                              if (!dragSession || dragSession.index === s.index) return
                              const newTimeStart = s.time_start
                              const duration = parseTime(dragSession.time_end) - parseTime(dragSession.time_start)
                              const newTimeEnd = formatTime(parseTime(newTimeStart) + duration)
                              const parts = selectedWeek.key.replace('week_', '').split('_')
                              const monday = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`)
                              const weekDates = {}
                              DAYS.forEach((day, idx) => {
                                const d = new Date(monday)
                                d.setDate(d.getDate() + idx)
                                weekDates[day] = d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
                              })
                              await fetch('/api/sessions', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  action: 'reschedule',
                                  week_key: selectedWeek.key,
                                  rowIndex: dragSession.index,
                                  therapist,
                                  date: weekDates[selectedDay] || '',
                                  day: selectedDay,
                                  time_start: newTimeStart,
                                  time_end: newTimeEnd
                                })
                              })
                              setDragSession(null)
                              setDragOver(null)
                              fetchSessions(selectedWeek.key)
                            }}
                            onContextMenu={e => {
                              e.preventDefault()
                              setContextMenu({ session: s, x: e.clientX, y: e.clientY })
                            }}
                            style={{
                              position: 'absolute',
                              top: `${stackCount > 1 ? stackedTop : topOffset + 1}px`,
                              left: '8%', width: '85%',
                              height: `${stackCount > 1 ? stackedHeight : height}px`,
                              background: sc.bg, border: `1px solid ${sc.border}`,
                              borderRadius: '4px', padding: '3px 5px',
                              overflow: 'auto', boxSizing: 'border-box', zIndex: 1,
                              cursor: 'grab'
                            }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ fontSize: '10px', fontWeight: '600', color: sc.color, lineHeight: '1.3' }}>{s.client_name}</div>
                              <div style={{ display: 'flex', gap: '1px', flexShrink: 0 }}>
                                {needsWarning && <span style={{ fontSize: '15px' }}>⚠️</span>}
                              </div>
                            </div>
                            {height > 30 && (
                              <div style={{ fontSize: '9px', fontWeight: '700', color: sc.color, marginBottom: '3px' }}>
                                {s.time_start}–{s.time_end}
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', marginTop: '2px' }}>
                              <select value={s.status}
                                onChange={e => updateStatus(s, e.target.value)}
                                style={{ fontSize: '8px', padding: '1px 2px', borderRadius: '3px', border: '1px solid #ddd', cursor: 'pointer', background: 'white', color: '#444', maxWidth: '72px' }}>
                                {[
                                  { value: 'Pencil', label: 'Pencil' },
                                  { value: 'Scheduled', label: 'Confirmed' },
                                  { value: 'Present', label: 'Present' },
                                  { value: 'Absent', label: 'Absent' },
                                  { value: 'Cancelled', label: 'Cancelled' },
                                ].map(st => <option key={st.value} value={st.value}>{st.label}</option>)}
                              </select>
                              {s.payment === 'Unpaid' ? (
                                <button onClick={() => openPayModal(s)}
                                  style={{ fontSize: '8px', padding: '1px 4px', borderRadius: '3px', border: 'none', background: '#FCEBEB', color: '#791F1F', cursor: 'pointer', fontWeight: '500' }}>Unpaid</button>
                              ) : (
                                <button onClick={() => reversePayment(s)}
                                  style={{ fontSize: '8px', padding: '1px 4px', borderRadius: '3px', border: 'none', background: '#EAF3DE', color: '#27500A', cursor: 'pointer' }}>Paid ✓</button>
                              )}
                              <button onClick={() => { setRescheduleModal(s); setRescheduleForm({ day: '', therapist: '', time_start: '', time_end: '' }) }}
                                style={{ fontSize: '8px', padding: '1px 4px', borderRadius: '3px', border: '1px solid #ddd', background: 'white', color: '#666', cursor: 'pointer' }}>Move</button>
                              <button onClick={() => setRemindModal(s)}
                                style={{ fontSize: '8px', padding: '1px 4px', borderRadius: '3px', border: '1px solid #B5D4F4', background: '#E6F1FB', color: '#0C447C', cursor: 'pointer' }}>Remind</button>
                              <button onClick={() => deleteSession(s)}
                                style={{ fontSize: '8px', padding: '1px 3px', borderRadius: '3px', border: '1px solid #fcc', background: '#fff5f5', color: '#c00', cursor: 'pointer' }}>✕</button>
                            </div>
                          </div>
                        )
                      })
                    }
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: '1rem', display: 'flex', gap: '12px', fontSize: '11px', color: '#999', flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { bg: '#FFFBE6', border: '#FFD666', label: 'Pencil' },
          { bg: '#E6F1FB', border: '#B5D4F4', label: 'Confirmed/Unpaid or Paid' },
          { bg: '#D9EAD3', border: '#6AA84F', label: 'Present/Cancelled + Paid' },
          { bg: '#F4CCCC', border: '#E06666', label: 'Absent' },
          { bg: '#FCE5CD', border: '#E69138', label: 'Present/Cancelled + Unpaid' },
        ].map(item => (
          <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', background: item.bg, border: `1px solid ${item.border}`, borderRadius: '2px', display: 'inline-block' }}></span>
            {item.label}
          </span>
        ))}
        <span>⚠️ Outstanding balance</span>
      </div>
    </div>
  )}