import { getSheetData, getSheetId, getGoogleSheets, SPREADSHEET_ID, deleteSheetRow } from '../../lib/sheets'
import { formatPHDate } from '../../lib/dates'

export async function GET() {
  try {
    const data = await getSheetData('inquiries')
    const [, ...rows] = data
    const inquiries = rows.filter(r => r && r[0]).map((row, i) => ({
      index: i,
      id: row[0],
      contact_name: row[1] || '',
      date: row[2] || '',
      recorded_by: row[3] || '',
      note: row[4] || ''
    }))
    return Response.json({ success: true, data: inquiries })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const sheets = getGoogleSheets()
    const id = Date.now().toString()
    const date = formatPHDate()
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'inquiries',
      valueInputOption: 'RAW',
      requestBody: { values: [[
        id,
        body.contact_name || '',
        body.date || date,
        body.recorded_by || '',
        body.note || ''
      ]]}
    })
    return Response.json({ success: true, id })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function DELETE(request) {
  try {
    const { index } = await request.json()
    await deleteSheetRow('inquiries', index)
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}