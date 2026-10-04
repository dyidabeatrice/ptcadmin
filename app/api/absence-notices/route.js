import { getSheetData, getGoogleSheets, SPREADSHEET_ID, deleteSheetRow, findRowIndexById } from '../../lib/sheets'
import { formatPHDateTime } from '../../lib/dates'

export async function GET() {
  try {
    const data = await getSheetData('absence_notices')
    const [, ...rows] = data
    const notices = rows.filter(r => r && r[0]).map(row => ({
      id: row[0],
      type: row[1],
      name: row[2],
      date: row[3],
      end_date: row[4] || '',
      note: row[5] || '',
      logged_at: row[6] || '',
      open_ended: row[7] === 'TRUE'
    }))
    return Response.json({ success: true, data: notices })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const type = body.type === 'therapist' ? 'therapist' : 'client'
    const name = (body.name || '').trim()
    if (!name || !body.date) return Response.json({ success: false, error: 'Name and date are required' })
    // Open-ended only makes sense for therapists; clients without an end date are a single day.
    const openEnded = type === 'therapist' && !!body.open_ended
    const endDate = openEnded ? '' : (body.end_date || '')
    if (endDate && endDate < body.date) {
      return Response.json({ success: false, error: 'The "until" date is before the start date' })
    }
    const sheets = getGoogleSheets()
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'absence_notices',
      valueInputOption: 'RAW',
      requestBody: { values: [[
        Date.now().toString() + Math.random().toString(36).slice(2),
        type, name, body.date, endDate, (body.note || '').trim(), formatPHDateTime(), openEnded ? 'TRUE' : ''
      ]]}
    })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

// "Mark returned": ends the leave as of yesterday and clears open-ended.
export async function PATCH(request) {
  try {
    const { action, id } = await request.json()
    if (action !== 'returned') return Response.json({ success: false, error: 'Unknown action' })
    const data = await getSheetData('absence_notices')
    const [, ...rows] = data
    const idx = rows.findIndex(r => r && r[0] === id)
    if (idx === -1) return Response.json({ success: false, error: 'Not found' })

    const startDate = rows[idx][3]
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
    const y = new Date(today + 'T00:00:00Z')
    y.setUTCDate(y.getUTCDate() - 1)
    const yesterday = y.toISOString().slice(0, 10)
    const newEnd = yesterday < startDate ? startDate : yesterday

    const sheets = getGoogleSheets()
    const row = idx + 2
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'RAW',
        data: [
          { range: `absence_notices!E${row}`, values: [[newEnd]] },
          { range: `absence_notices!H${row}`, values: [['']] }
        ]
      }
    })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json()
    const rowIndex = await findRowIndexById('absence_notices', id)
    if (rowIndex === -1) return Response.json({ success: false, error: 'Not found' })
    await deleteSheetRow('absence_notices', rowIndex)
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}