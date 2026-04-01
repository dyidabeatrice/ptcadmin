import { getSheetData, getSheetId, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'

const TEMPLATES = {
  'Session reminder': `Good day! This is a friendly reminder that [CLIENT] has a therapy session tomorrow, [DATE] at [TIME] with [THERAPIST]. Please make sure to arrive on time. Thank you!`,
  'Unpaid reminder': `Good day! We would like to remind you that [CLIENT]'s session on [DATE] at [TIME] with [THERAPIST] has an outstanding balance. Kindly settle the payment on or before the next session. Thank you!`,
  'Therapist absence': `Good day! We regret to inform you that [CLIENT]'s session on [DATE] at [TIME] will not push through due to [THERAPIST]'s absence. We will get in touch regarding rescheduling. We apologize for the inconvenience.`,
}

function fillTemplate(template, data) {
  return template
    .replace(/\[CLIENT\]/g, data.client_name || '')
    .replace(/\[DATE\]/g, data.date || '')
    .replace(/\[TIME\]/g, data.time_start || '')
    .replace(/\[THERAPIST\]/g, data.therapist || '')
}

export async function GET() {
  try {
    const [sessionData, clientData, messageData] = await Promise.all([
      getSheetData('sessions'),
      getSheetData('clients'),
      getSheetData('messages')
    ])

    const [, ...sessionRows] = sessionData
    const [, ...clientRows] = clientData
    const [, ...messageRows] = messageData

    const sessions = sessionRows.filter(r => r && r[0]).map((row, i) => ({
      index: i,
      id: row[0], client_name: row[1], therapist: row[2],
      date: row[3], day: row[4], time_start: row[5], time_end: row[6],
      session_type: row[7] || 'Regular', status: row[8] || 'Scheduled',
      payment: row[9] || 'Unpaid'
    }))

    const clientMap = {}
    clientRows.filter(r => r && r[0]).forEach(row => {
      clientMap[row[1]] = { fb_account: row[3], phone: row[4] }
    })

    const sentIds = new Set(messageRows.filter(r => r && r[0]).map(r => r[3]))

    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const tomorrowDay = tomorrow.toLocaleDateString('en-US', { weekday: 'long' })
    const tomorrowDate = tomorrow.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })

    const generated = []

    sessions.forEach(s => {
      const client = clientMap[s.client_name] || {}
      const fb = client.fb_account || ''

      if (s.day === tomorrowDay && s.status === 'Scheduled') {
        const key = `reminder-${s.id}`
        generated.push({
          key, type: 'Session reminder',
          client_name: s.client_name, therapist: s.therapist,
          date: s.date, time_start: s.time_start,
          fb_account: fb,
          message: fillTemplate(TEMPLATES['Session reminder'], s),
          sent: sentIds.has(key),
          session_id: s.id
        })
      }

      if (s.payment === 'Unpaid' && s.status !== 'Cancelled') {
        const key = `unpaid-${s.id}`
        generated.push({
          key, type: 'Unpaid reminder',
          client_name: s.client_name, therapist: s.therapist,
          date: s.date, time_start: s.time_start,
          fb_account: fb,
          message: fillTemplate(TEMPLATES['Unpaid reminder'], s),
          sent: sentIds.has(key),
          session_id: s.id
        })
      }
    })

    return Response.json({ success: true, data: generated, templates: TEMPLATES })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const sheets = getGoogleSheets()
    const today = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })

    if (body.action === 'absence') {
      const sessionData = await getSheetData('sessions')
      const [, ...sessionRows] = sessionData
      const clientData = await getSheetData('clients')
      const [, ...clientRows] = clientData

      const clientMap = {}
      clientRows.filter(r => r && r[0]).forEach(row => {
        clientMap[row[1]] = { fb_account: row[3] }
      })

      const affected = sessionRows
        .filter(r => r && r[0] && r[2] === body.therapist && r[4] === body.day && r[8] !== 'Cancelled')
        .map((row, i) => ({
          index: i, id: row[0], client_name: row[1], therapist: row[2],
          date: row[3], day: row[4], time_start: row[5],
          fb_account: clientMap[row[1]]?.fb_account || ''
        }))

      const messages = affected.map(s => ({
        key: `absence-${s.id}`,
        type: 'Therapist absence',
        client_name: s.client_name,
        therapist: s.therapist,
        date: s.date,
        time_start: s.time_start,
        fb_account: s.fb_account,
        message: fillTemplate(TEMPLATES['Therapist absence'], s),
        sent: false,
        session_id: s.id
      }))

      return Response.json({ success: true, data: messages })
    }

    if (body.action === 'log') {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'messages', valueInputOption: 'RAW',
        requestBody: { values: [[
          Date.now().toString(),
          body.client_name, body.fb_account,
          body.key, body.type,
          body.message, today
        ]]}
      })
      return Response.json({ success: true })
    }

    return Response.json({ success: false, error: 'Unknown action' })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}