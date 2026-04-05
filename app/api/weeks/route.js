import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

const SPECIALTY_RATES = {
  OT: 1200,
  ST: 1300,
  PT: 900,
  SPED: 900,
}

function getDefaultAmount(therapistName, therapistList) {
  const t = therapistList.find(r => r[1] === therapistName)
  if (!t) return 1200
  const specialty = t[2] || 'OT'
  if (t[3] === 'TRUE') return specialty === 'ST' ? 600 : 600 // intern rate
  return SPECIALTY_RATES[specialty] || 1200
}

export function getMondayOf(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function getWeekKey(monday) {
  const d = new Date(monday)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `week_${y}_${m}_${day}`
}

export function getWeekLabel(monday) {
  const start = new Date(monday)
  const end = new Date(monday)
  end.setDate(end.getDate() + 6)
  const opts = { month: 'short', day: 'numeric', year: 'numeric' }
  return `${start.toLocaleDateString('en-PH', opts)} – ${end.toLocaleDateString('en-PH', opts)}`
}

export function getWeekDates(monday) {
  const dates = {}
  DAYS.forEach((day, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    dates[day] = d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
  })
  return dates
}

async function getAllSheets() {
  const sheets = getGoogleSheets()
  const res = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID
  })
  return res.data.sheets.map(s => s.properties.title)
}

async function getWeekSheets() {
  const all = await getAllSheets()
  return all
    .filter(t => t.startsWith('week_'))
    .sort()
}

async function createWeekSheet(weekKey, weekLabel) {
  const sheets = getGoogleSheets()
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        addSheet: {
          properties: { title: weekKey }
        }
      }]
    }
  })
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${weekKey}!A1:M1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        'id', 'client_name', 'therapist', 'date', 'day',
        'time_start', 'time_end', 'session_type', 'status',
        'payment', 'mop', 'amount', 'notes'
      ]]
    }
  })
  return weekKey
}

export async function GET() {
  try {
    const weekSheets = await getWeekSheets()
    const weeks = weekSheets.map(key => {
      const parts = key.replace('week_', '').split('_')
      const monday = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`)
      return {
        key,
        label: getWeekLabel(monday),
        monday: monday.toISOString()
      }
    })
    return Response.json({ success: true, data: weeks })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()

    if (body.action === 'generate') {
      const sheets = getGoogleSheets()
      const existingWeeks = await getWeekSheets()
      const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
      const currentMonday = getMondayOf(today)
      const created = []

      for (let w = 0; w < 4; w++) {
        const monday = new Date(currentMonday)
        monday.setDate(monday.getDate() + w * 7)
        const weekKey = getWeekKey(monday)

        if (existingWeeks.includes(weekKey)) continue

        const masterData = await getSheetData('masterschedule')
        const [, ...masterRows] = masterData
        const clientData = await getSheetData('clients')
        const [, ...clientRows] = clientData
        const therapistData = await getSheetData('therapists')
        const [, ...therapistRows] = therapistData

        const inactiveClients = new Set(
          clientRows.filter(r => r && r[0] && r[9] === 'inactive').map(r => r[1])
        )

        const master = masterRows
          .filter(r => r && r[0] && !inactiveClients.has(r[1]))
          .map(row => ({
            client_name: row[1], therapist: row[2],
            day: row[3]?.trim(), time_start: row[4], time_end: row[5]
          }))

        const weekDates = getWeekDates(monday)
        const newRows = master
          .filter(m => weekDates[m.day])
          .map(m => {
          const amount = getDefaultAmount(m.therapist, therapistRows)
          return [
            Date.now().toString() + Math.random().toString(36).slice(2),
            m.client_name, m.therapist, weekDates[m.day],
            m.day, m.time_start, m.time_end,
            'Regular', 'Pencil', 'Unpaid', '', amount, ''
          ]
        })

        await createWeekSheet(weekKey, getWeekLabel(monday))

        if (newRows.length > 0) {
          await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: weekKey,
            valueInputOption: 'RAW',
            requestBody: { values: newRows }
          })
        }

        created.push(weekKey)
      }

      return Response.json({ success: true, created })
    }

    if (body.action === 'check_archive') {
      const weekSheets = await getWeekSheets()
      const MONTHS_LIMIT = 18
      const cutoff = new Date()
      cutoff.setMonth(cutoff.getMonth() - MONTHS_LIMIT)

      const toArchive = weekSheets.filter(key => {
        const parts = key.replace('week_', '').split('_')
        const monday = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`)
        return monday < cutoff
      })

      return Response.json({ success: true, to_archive: toArchive, count: toArchive.length })
    }

    return Response.json({ success: false, error: 'Unknown action' })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}