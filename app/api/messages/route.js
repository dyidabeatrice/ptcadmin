import { getSheetData, getGoogleSheets, SPREADSHEET_ID, getSheetId } from '../../lib/sheets'
import { formatPHDateTime } from '../../lib/dates'
import { sendTaggedMessage } from '../../lib/messenger'

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
        sent_at: row[7] || '',
        reaction: row[9] || '',
        reaction_at: row[10] || ''
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
      const createdAt = formatPHDateTime()
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
      let fbMessageId = ''
      if (psid && !body.skip_messenger) {
        const result = await sendTaggedMessage(psid, body.message)
        if (result.error) return Response.json({ success: false, error: result.error.message })
        fbMessageId = result.message_id || ''
      }
      const sentAt = formatPHDateTime()
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `messages!E${rowIndex + 2}:I${rowIndex + 2}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[body.message, 'sent', rows[rowIndex][6], sentAt, fbMessageId]] }
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
      const sheetId = await getSheetId('messages')

      const types = body.types || [] // empty array = all types
      const startDate = body.start_date // 'YYYY-MM-DD' or null
      const endDate = body.end_date // 'YYYY-MM-DD' or null

      // sent_at looks like "Aug 25, 2026, 03:42 PM" — native Date parsing of
      // this exact comma-heavy format is unreliable, so parse the date
      // portion manually (time-of-day doesn't matter for a day-level filter).
      const MONTHS = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 }
      function parseSentDate(str) {
        if (!str) return null
        const parts = str.split(',').map(s => s.trim())
        if (parts.length < 2) return null
        const [monthDay, year] = [parts[0], parts[1]]
        const [monthAbbr, day] = monthDay.split(' ')
        const month = MONTHS[monthAbbr]
        if (month === undefined) return null
        return new Date(parseInt(year), month, parseInt(day))
      }

      const rangeStart = startDate ? new Date(startDate + 'T00:00:00') : null
      const rangeEnd = endDate ? new Date(endDate + 'T00:00:00') : null

      const toDelete = rows
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => {
          if (!r || r[5] !== 'sent') return false
          if (types.length > 0 && !types.includes(r[3])) return false
          if (rangeStart || rangeEnd) {
            const sentDate = parseSentDate(r[7])
            if (!sentDate) return false
            if (rangeStart && sentDate < rangeStart) return false
            if (rangeEnd && sentDate > rangeEnd) return false
          }
          return true
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