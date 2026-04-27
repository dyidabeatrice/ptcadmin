import { getSheetData, getSheetId, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'

export async function GET() {
  try {
    const data = await getSheetData('tasks')
    const [, ...rows] = data
    const tasks = rows.filter(r => r && r[0]).map(row => ({
      id: row[0],
      type: row[1] || 'other',
      client_name: row[2] || '',
      therapist: row[3] || '',
      notes: row[4] || '',
      created_at: row[5] || ''
    }))
    return Response.json({ success: true, data: tasks })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const sheets = getGoogleSheets()
    const id = Date.now().toString()
    const now = new Date().toLocaleDateString('en-US', {
      timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric'
    })
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'tasks',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          id,
          body.type || 'other',
          body.client_name || '',
          body.therapist || '',
          body.notes || '',
          now
        ]]
      }
    })
    return Response.json({ success: true, id })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json()
    const sheets = getGoogleSheets()
    const data = await getSheetData('tasks')
    const [, ...rows] = data
    const index = rows.findIndex(r => r && r[0] === id)
    if (index === -1) return Response.json({ success: false, error: 'Not found' })
    const sheetId = await getSheetId('tasks')
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ deleteDimension: {
        range: { sheetId, dimension: 'ROWS', startIndex: index + 1, endIndex: index + 2 }
      }}]}
    })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}