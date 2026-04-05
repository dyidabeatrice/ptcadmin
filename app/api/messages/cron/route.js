import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../../lib/sheets'

const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN
const CRON_SECRET = process.env.CRON_SECRET

async function sendMessengerMessage(recipientId, message, quickReplies = null) {
  const PAGE_ID = process.env.META_PAGE_ID
  const body = {
    recipient: { id: recipientId },
    message: quickReplies ? { text: message, quick_replies: quickReplies } : { text: message }
  }
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${PAGE_ID}/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  )
  return await res.json()
}

async function sendSessionReminders() {
  const sheets = getGoogleSheets()
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })

  const weekSheets = spreadsheet.data.sheets
    .map(s => s.properties.title)
    .filter(t => t.startsWith('week_'))
    .sort()
    .reverse()
    .slice(0, 4)

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowDay = tomorrow.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' })
  const tomorrowDate = tomorrow.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })

  const clientData = await getSheetData('clients')
  const [, ...clientRows] = clientData
  const clientMap = {}
  clientRows.filter(r => r && r[0]).forEach(row => {
    clientMap[row[1]] = { psid: row[3] }
  })

  const therapistData = await getSheetData('therapists')
  const [, ...therapistRows] = therapistData
  const therapistMap = {}
  therapistRows.filter(r => r && r[0]).forEach(row => {
    therapistMap[row[1]] = row[2]
  })

  const sent = [], failed = [], skipped = []

  for (const weekKey of weekSheets) {
    const data = await getSheetData(weekKey)
    const [, ...rows] = data

    const tomorrowSessions = rows.filter(r =>
      r && r[0] && r[4] === tomorrowDay && r[8] === 'Pencil'
    )

    for (const session of tomorrowSessions) {
      const clientName = session[1]
      const therapist = session[2]
      const timeStart = session[5]
      const client = clientMap[clientName]

      if (!client?.psid) {
        skipped.push({ client: clientName, reason: 'No PSID' })
        continue
      }

      const specialty = therapistMap[therapist] || 'OT'
      const message = `Good day! This is a friendly reminder that ${clientName} has a ${specialty} session tomorrow, ${tomorrowDate} at ${timeStart} with T. ${therapist}. Please confirm attendance:`

      const quickReplies = [
        { content_type: 'text', title: "✓ Yes", payload: 'CONFIRM_YES' },
        { content_type: 'text', title: "✗ No", payload: 'CONFIRM_NO' }
      ]

      const result = await sendMessengerMessage(client.psid, message, quickReplies)

      if (result.error) {
        failed.push({ client: clientName, error: result.error.message })
      } else {
        sent.push({ client: clientName, therapist, time: timeStart })
      }
    }
  }

  return { sent, failed, skipped }
}

async function sendDocumentReminders() {
  const clientData = await getSheetData('clients')
  const [, ...clientRows] = clientData
  const clientMap = {}
  clientRows.filter(r => r && r[0]).forEach(row => {
    clientMap[row[1]] = { psid: row[3] }
  })

  const reportData = await getSheetData('reports')
  const [, ...reportRows] = reportData

  const twoDaysFromNow = new Date()
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)
  twoDaysFromNow.setHours(0, 0, 0, 0)

  const sent = [], failed = [], skipped = []

  for (const row of reportRows) {
    if (!row || !row[0]) continue
    const status = row[8]
    const deadline = row[5]
    const clientName = row[1]
    const docType = row[6]
    const amount = parseFloat(row[7] || 0)

    if (status !== 'Outstanding') continue
    if (amount <= 0) continue
    if (!deadline) continue

    const deadlineDate = new Date(deadline)
    deadlineDate.setHours(0, 0, 0, 0)

    const diffDays = Math.ceil((deadlineDate - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24))
    if (diffDays !== 2) continue

    const client = clientMap[clientName]
    if (!client?.psid) {
      skipped.push({ client: clientName, reason: 'No PSID' })
      continue
    }

    const formattedDeadline = deadlineDate.toLocaleDateString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric'
    })

    const message = `Hi! This is a gentle reminder to settle your balance for your ${docType} request for ${clientName} on or before ${formattedDeadline}. Thank you.`

    const result = await sendMessengerMessage(client.psid, message)

    if (result.error) {
      failed.push({ client: clientName, error: result.error.message })
    } else {
      sent.push({ client: clientName, docType, deadline: formattedDeadline })
    }
  }

  return { sent, failed, skipped }
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const type = body.type || 'session'

    if (type === 'document') {
      const results = await sendDocumentReminders()
      return Response.json({ success: true, type: 'document', ...results })
    }

    const results = await sendSessionReminders()
    return Response.json({ success: true, type: 'session', ...results })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}
