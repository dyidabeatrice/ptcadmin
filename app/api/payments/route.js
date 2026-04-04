import { getSheetData, getSheetId, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)

    if (searchParams.get('action') === 'outstanding') {
      const sheets = getGoogleSheets()
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
      const weekSheets = spreadsheet.data.sheets
        .map(s => s.properties.title)
        .filter(t => t.startsWith('week_'))
        .sort()

      const unpaid = []
      for (const weekKey of weekSheets) {
        const data = await getSheetData(weekKey)
        const [, ...rows] = data
        rows.filter(r => r && r[0] && r[9] === 'Unpaid' && (r[8] === 'Present' || r[8] === 'Cancelled')).forEach(row => {
          unpaid.push({
            week_key: weekKey,
            index: rows.indexOf(row),
            id: row[0], client_name: row[1], therapist: row[2],
            date: row[3], day: row[4], time_start: row[5], time_end: row[6],
            session_type: row[7] || 'Regular', status: row[8],
            amount: parseFloat(row[11] || 0)
          })
        })
      }

      return Response.json({ success: true, data: unpaid })
    }

    const data = await getSheetData('payments')
    const [, ...rows] = data
    if (!rows || rows.length === 0) return Response.json({ success: true, data: [] })
    const payments = rows.filter(r => r && r[0]).map((row, i) => ({
      index: i,
      id: row[0], client_name: row[1], therapist: row[2],
      session_id: row[3], amount: row[4], mop: row[5],
      session_type: row[6], date: row[7],
      payment_type: row[8] || 'session'
    }))
    return Response.json({ success: true, data: payments })
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
      range: 'payments', valueInputOption: 'RAW',
      requestBody: { values: [[
        Date.now().toString(),
        body.client_name, body.therapist || '',
        body.session_id || '', body.amount,
        body.mop, body.session_type || '',
        body.date, body.payment_type || 'session'
      ]]}
    })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function DELETE(request) {
  try {
    const { session_id } = await request.json()
    const sheets = getGoogleSheets()
    const data = await getSheetData('payments')
    const [, ...rows] = data
    const rowIndex = rows.findIndex(r => r && r[3] === session_id)
    if (rowIndex === -1) return Response.json({ success: false, error: 'Payment not found' })
    const sheetId = await getSheetId('payments')
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