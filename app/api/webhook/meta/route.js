import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../../lib/sheets'

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN

async function sendMessage(recipientId, message, quickReplies = null) {
  const body = {
    recipient: { id: recipientId },
    message: quickReplies ? {
      text: message,
      quick_replies: quickReplies
    } : { text: message }
  }

  await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

async function findSessionByPsid(psid) {
  const clientData = await getSheetData('clients')
  const [, ...clientRows] = clientData
  const client = clientRows.find(r => r && r[3] === psid)
  if (!client) return null

  const sheets = getGoogleSheets()
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID
  })

  const weekSheets = spreadsheet.data.sheets
    .map(s => s.properties.title)
    .filter(t => t.startsWith('week_'))
    .sort()
    .reverse()
    .slice(0, 4)

  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const tomorrowDay = tomorrow.toLocaleDateString('en-US', { weekday: 'long' })

  for (const weekKey of weekSheets) {
    const data = await getSheetData(weekKey)
    const [, ...rows] = data
    const session = rows.find(r =>
      r && r[1] === client[1] && r[4] === tomorrowDay && r[8] === 'Pencil'
    )
    if (session) return { session, weekKey, rowIndex: rows.indexOf(session), clientName: client[1] }
  }
  return null
}

async function updateSessionStatus(weekKey, rowIndex, status) {
  const sheets = getGoogleSheets()
  const sheetRow = rowIndex + 2
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${weekKey}!I${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[status]] }
  })
}

// GET - webhook verification
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

// POST - receive messages
export async function POST(request) {
  try {
    const body = await request.json()

    if (body.object !== 'page') return Response.json({ status: 'ok' })

    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        const psid = event.sender?.id
        if (!psid) continue

        // Handle quick reply button taps
        if (event.message?.quick_reply) {
          const payload = event.message.quick_reply.payload
          const result = await findSessionByPsid(psid)

          if (!result) {
            await sendMessage(psid, "Thank you for your response! Our secretary will be in touch.")
            continue
          }

          const { session, weekKey, rowIndex, clientName } = result

          if (payload === 'CONFIRM_YES') {
            await updateSessionStatus(weekKey, rowIndex, 'Scheduled')
            await sendMessage(psid,
              `Thank you! We have confirmed ${clientName}'s session tomorrow. See you then! 😊`
            )
          }

          if (payload === 'CONFIRM_NO') {
            await updateSessionStatus(weekKey, rowIndex, 'Absent')
            await sendMessage(psid,
              `Thank you for letting us know! Please share your availability for a make-up session and our secretary will get in touch. 🙏`
            )
          }
        }
      }
    }

    return Response.json({ status: 'ok' })
  } catch (error) {
    console.error('Webhook error:', error)
    return Response.json({ status: 'ok' })
  }
}