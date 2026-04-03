import { getSheetData, getSheetId, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'

export async function GET() {
  try {
    const data = await getSheetData('masterschedule')
    const [, ...rows] = data
    if (!rows || rows.length === 0) return Response.json({ success: true, data: [] })
    const master = rows.filter(r => r && r[0]).map((row, i) => ({
      index: i,
      id: row[0], client_name: row[1], therapist: row[2],
      day: row[3], time_start: row[4], time_end: row[5]
    }))
    return Response.json({ success: true, data: master }, {
      headers: { 'Cache-Control': 'no-store' }
    })
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
      range: 'masterschedule', valueInputOption: 'RAW',
      requestBody: { values: [[
        Date.now().toString(),
        body.client_name, body.therapist,
        body.day, body.time_start, body.time_end
      ]]}
    })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json()
    const sheets = getGoogleSheets()
    const sheetRow = body.rowIndex + 2
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `masterschedule!B${sheetRow}:F${sheetRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[
        body.client_name, body.therapist,
        body.day, body.time_start, body.time_end
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
    const sheetId = await getSheetId('masterschedule')
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