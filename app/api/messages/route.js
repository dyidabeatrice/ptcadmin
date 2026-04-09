import { getSheetData, getGoogleSheets, SPREADSHEET_ID, getSheetId } from '../../lib/sheets'

const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN

async function sendMessengerMessage(psid, message) {
  const res = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: psid },
      message: { text: message }
    })
  })
  return await res.json()
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const tab = searchParams.get('tab') || 'drafts'

    const [msgData, clientData] = await Promise.all([
      getSheetData('messages'),
      getSheetData('clients')
    ])

    const [, ...rows] = msgData
    const [, ...clientRows] = clientData

    if (!rows || rows.length === 0) return Response.json({ success: true, data: [] })

    const messages = rows.filter(r => r && r[0]).map((row, i) => {
      const client = clientRows.find(c => c && c[1] === row[1])
      return {
        index: i,
        id: row[0],
        client_name: row[1],
        psid: row[2],
        phone: client?.[4] ? String(client[4]).replace(/^\+/, '').replace(/^0/, '63') : '',
        type: row[3],
        message: row[4],
        status: row[5] || 'draft',
        created_at: row[6] || '',
        sent_at: row[7] || ''
      }
    })

    if (tab === 'archive') {
      return Response.json({ success: true, data: messages.filter(m => m.status === 'sent') })
    }
    return Response.json({ success: true, data: messages.filter(m => m.status === 'draft') })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const sheets = getGoogleSheets()

    if (body.action === 'create_draft') {
      const id = Date.now().toString()
      const createdAt = new Date().toLocaleDateString('en-PH', {
        timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'messages',
        valueInputOption: 'RAW',
        requestBody: { values: [[
          id, body.client_name, body.psid || '',
          body.type, body.message,
          'draft', createdAt, ''
        ]]}
      })
      return Response.json({ success: true, id })
    }

    if (body.action === 'send') {
      const data = await getSheetData('messages')
      const [, ...rows] = data
      const rowIndex = rows.findIndex(r => r && r[0] === body.id)
      if (rowIndex === -1) return Response.json({ success: false, error: 'Message not found' })

      const psid = rows[rowIndex][2]
      
      if (psid) {
        const result = await sendMessengerMessage(psid, body.message)
        if (result.error) return Response.json({ success: false, error: result.error.message })
      }

      const sentAt = new Date().toLocaleDateString('en-PH', {
        timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `messages!E${rowIndex + 2}:H${rowIndex + 2}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[body.message, 'sent', rows[rowIndex][6], sentAt]] }
      })

      return Response.json({ success: true })
    }

    if (body.action === 'update_draft') {
      const data = await getSheetData('messages')
      const [, ...rows] = data
      const rowIndex = rows.findIndex(r => r && r[0] === body.id)
      if (rowIndex === -1) return Response.json({ success: false, error: 'Message not found' })

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `messages!E${rowIndex + 2}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[body.message]] }
      })
      return Response.json({ success: true })
    }

    if (body.action === 'delete') {
      const data = await getSheetData('messages')
      const [, ...rows] = data
      const rowIndex = rows.findIndex(r => r && r[0] === body.id)
      if (rowIndex === -1) return Response.json({ success: false, error: 'Message not found' })
      const sheetId = await getSheetId('messages')
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [{ deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowIndex + 1, endIndex: rowIndex + 2 }
        }}]}
      })
      return Response.json({ success: true })
    }

    if (body.action === 'clear_old') {
      const data = await getSheetData('messages')
      const [, ...rows] = data
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      const sheetId = await getSheetId('messages')

      const toDelete = rows
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => {
          if (!r || r[5] !== 'sent' || !r[7]) return false
          const sentDate = new Date(r[7])
          return sentDate < threeMonthsAgo
        })
        .map(({ i }) => i)
        .reverse()

      for (const i of toDelete) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: { requests: [{ deleteDimension: {
            range: { sheetId, dimension: 'ROWS', startIndex: i + 1, endIndex: i + 2 }
          }}]}
        })
      }
      return Response.json({ success: true, deleted: toDelete.length })
    }

    return Response.json({ success: false, error: 'Unknown action' })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}