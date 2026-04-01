import { getSheetData, getSheetId, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'

export async function GET() {
  try {
    const data = await getSheetData('blocked')
    const [, ...rows] = data
    if (!rows || rows.length === 0) return Response.json({ success: true, data: [] })
    const blocked = rows.filter(r => r && r[0]).map((row, i) => ({
      index: i,
      id: row[0], therapist: row[1],
      day: row[2], time_start: row[3], time_end: row[4]
    }))
    return Response.json({ success: true, data: blocked })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const sheets = getGoogleSheets()
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'blocked', valueInputOption: 'RAW',
      requestBody: { values: [[
        Date.now().toString(),
        body.therapist, body.day,
        body.time_start, body.time_end
      ]]}
    })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function DELETE(request) {
  try {
    const { rowIndex } = await request.json()
    const sheets = getGoogleSheets()
    const sheetId = await getSheetId('blocked')
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