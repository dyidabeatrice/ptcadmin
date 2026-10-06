import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'

export async function POST(request) {
  try {
    const { client_name, note } = await request.json()
    if (!client_name) return Response.json({ success: false, error: 'Client name is required' })

    const data = await getSheetData('clients')
    const [, ...rows] = data
    const idx = rows.findIndex(r => r && r[1] === client_name)
    if (idx === -1) return Response.json({ success: false, error: 'Client not found' })

    const sheets = getGoogleSheets()
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `clients!M${idx + 2}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[(note || '').trim()]] }
    })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}