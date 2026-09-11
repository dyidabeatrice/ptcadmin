import { getSheetData, getSheetId, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'
import { formatPHDateTime } from '../../lib/dates'

export async function GET() {
  try {
    const data = await getSheetData('new_starts')
    const [, ...rows] = data
    const entries = rows.filter(r => r && r[0]).map(row => ({
      id: row[0],
      client_name: row[1],
      guardian_name: row[2],
      notes: row[3] || '',
      week_start: row[4],
      sessions: row[5] ? JSON.parse(row[5]) : [],
      created_at: row[6] || ''
    }))
    return Response.json({ success: true, data: entries })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const sheets = getGoogleSheets()
    const id = Date.now().toString() + Math.random().toString(36).slice(2)
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'new_starts',
      valueInputOption: 'RAW',
      requestBody: { values: [[
        id,
        body.client_name || '',
        body.guardian_name || '',
        body.notes || '',
        body.week_start || '',
        JSON.stringify(body.sessions || []),
        formatPHDateTime()
      ]]}
    })
    return Response.json({ success: true, id })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json()
    const data = await getSheetData('new_starts')
    const [, ...rows] = data
    const rowIndex = rows.findIndex(r => r && r[0] === body.id)
    if (rowIndex === -1) return Response.json({ success: false, error: 'Not found' })
    const sheets = getGoogleSheets()
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `new_starts!B${rowIndex + 2}:F${rowIndex + 2}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[
        body.client_name || '',
        body.guardian_name || '',
        body.notes || '',
        body.week_start || '',
        JSON.stringify(body.sessions || [])
      ]]}
    })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json()
    const data = await getSheetData('new_starts')
    const [, ...rows] = data
    const rowIndex = rows.findIndex(r => r && r[0] === id)
    if (rowIndex === -1) return Response.json({ success: false, error: 'Not found' })
    const sheets = getGoogleSheets()
    const sheetId = await getSheetId('new_starts')
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ deleteDimension: {
        range: { sheetId, dimension: 'ROWS', startIndex: rowIndex + 1, endIndex: rowIndex + 2 }
      }}]}
    })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}