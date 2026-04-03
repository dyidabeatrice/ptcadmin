import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../../lib/sheets'

const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN
const CRON_SECRET = process.env.CRON_SECRET

async function sendReminder(psid, clientName, therapist, date, timeStart, specialty) {
  const message = `Good day! This is a friendly reminder that ${clientName} has a ${specialty} session tomorrow, ${date} at ${timeStart} with ${therapist}. Please confirm attendance:`

  const quickReplies = [
    { content_type: 'text', title: "✓ Yes, we'll be there", payload: 'CONFIRM_YES' },
    { content_type: 'text', title: "✗ Sorry, we can't make it", payload: 'CONFIRM_NO' }
  ]

  const res = await fetch(
    `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: psid },
        message: { text: message, quick_replies: quickReplies }
      })
    }
  )
  return await res.json()
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    const tomorrowDay = tomorrow.toLocaleDateString('en-US', { weekday: 'long' })
    const tomorrowDate = tomorrow.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })

    const clientData = await getSheetData('clients')
    const [, ...clientRows] = clientData
    const clientMap = {}
    clientRows.filter(r => r && r[0]).forEach(row => {
      clientMap[row[1]] = { psid: row[3], specialty: 'OT' }
    })

    const therapistData = await getSheetData('therapists')
    const [, ...therapistRows] = therapistData
    const therapistMap = {}
    therapistRows.filter(r => r && r[0]).forEach(row => {
      therapistMap[row[1]] = row[2]
    })

    const sent = []
    const failed = []
    const skipped = []

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
          skipped.push({ client: clientName, reason: 'No PSID/FB account' })
          continue
        }

        const specialty = therapistMap[therapist] || 'OT'

        const result = await sendReminder(
          client.psid, clientName, therapist,
          tomorrowDate, timeStart, specialty
        )

        if (result.error) {
          failed.push({ client: clientName, error: result.error.message })
        } else {
          sent.push({ client: clientName, therapist, time: timeStart })
        }
      }
    }

    return Response.json({
      success: true,
      sent: sent.length,
      failed: failed.length,
      skipped: skipped.length,
      details: { sent, failed, skipped }
    })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}