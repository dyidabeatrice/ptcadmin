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
  const client = clientRows.find(r => r && r[11] === psid)
  if (!client) return null

  const sheets = getGoogleSheets()
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })

  const weekSheets = spreadsheet.data.sheets
    .map(s => s.properties.title)
    .filter(t => t.startsWith('week_'))
    .sort().reverse().slice(0, 4)

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowDay = tomorrow.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'long' })

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

async function autoSavePsid(psid, senderName) {
  try {
    const clientData = await getSheetData('clients')
    const [, ...clientRows] = clientData
    const sheets = getGoogleSheets()

    const matchIndex = clientRows.findIndex(r => {
      if (!r || !r[3]) return false
      const fbName = r[3].toLowerCase().trim()
      const msgName = senderName.toLowerCase().trim()
      return fbName === msgName || fbName.includes(msgName) || msgName.includes(fbName)
    })

    if (matchIndex !== -1 && !clientRows[matchIndex][11]) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `clients!L${matchIndex + 2}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[psid]] }
      })
    }
  } catch (e) {
    console.error('Auto-PSID error:', e)
  }
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

async function getClientByPsid(psid) {
  if (!psid) return ''
  const data = await getSheetData('clients')
  const [, ...rows] = data
  const match = rows.find(r => r && r[11] === psid)
  return match ? match[1] : ''
}

async function savePendingPayment(psid, clientName, imageUrl, senderName) {
  const sheets = getGoogleSheets()
  const now = new Date().toLocaleDateString('en-US', {
    timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'pending_payments',
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        Date.now().toString(),
        psid || '',
        clientName || '',
        '',
        imageUrl || '',
        now,
        'pending',
        senderName || ''
      ]]
    }
  })
}

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

export async function POST(request) {
  try {
    const body = await request.json()
    if (body.object !== 'page') return Response.json({ status: 'ok' })

    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        const psid = event.sender?.id
        if (!psid) continue

        // Get sender name for auto-PSID matching
        let senderName = null
        try {
          const nameRes = await fetch(`https://graph.facebook.com/v19.0/${psid}?fields=name&access_token=${PAGE_ACCESS_TOKEN}`)
          const nameJson = await nameRes.json()
          senderName = nameJson.name || null
        } catch (e) {
          senderName = null
        }

        // Auto-save PSID if we have a name
        if (senderName) {
          await autoSavePsid(psid, senderName)
        }

        // Handle image attachments — payment screenshots
        const attachments = event.message?.attachments || []
        const imageAttachments = attachments.filter(a => a.type === 'image')

        if (imageAttachments.length > 0) {
          for (const attachment of imageAttachments) {
            const imageUrl = attachment.payload?.url
            if (!imageUrl) continue
            try {
              const clientName = await getClientByPsid(psid)
              console.log('Saving pending payment:', { psid, clientName, senderName })
              await savePendingPayment(psid, clientName, imageUrl, senderName || '')
            } catch (imgError) {
              console.error('Image processing error:', imgError)
            }
          }
          continue
        }

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