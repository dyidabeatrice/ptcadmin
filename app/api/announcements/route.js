import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'

export async function GET() {
  try {
    const data = await getSheetData('announcements')
    const [, ...rows] = data
    const announcements = {}
    rows.filter(r => r && r[0]).forEach((row, i) => {
      announcements[row[0]] = {
        index: i,
        value: row[1] || '',
        start_date: row[2] || '',
        end_date: row[3] || ''
      }
    })
    return Response.json({ success: true, data: announcements })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json()
    const sheets = getGoogleSheets()
    const data = await getSheetData('announcements')
    const [, ...rows] = data
    const rowIndex = rows.findIndex(r => r && r[0] === body.key)
    if (rowIndex === -1) return Response.json({ success: false, error: 'Key not found' })
    const sheetRow = rowIndex + 2

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `announcements!B${sheetRow}:D${sheetRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[body.value || '', body.start_date || '', body.end_date || '']] }
    })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}