import { getSheetData, getSheetId, getGoogleSheets, SPREADSHEET_ID } from '../../../lib/sheets'

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sheets = getGoogleSheets()
    const data = await getSheetData('messages')
    const [, ...rows] = data
    const sheetId = await getSheetId('messages')

    // Only sent session_reminder messages — leave drafts and other types alone
    const toDelete = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r && r[3] === 'session_reminder' && r[5] === 'sent')
      .map(({ i }) => i)
      .reverse() // delete bottom-up so earlier indices stay valid

    for (const i of toDelete) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [{ deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: i + 1, endIndex: i + 2 }
        }}]}
      })
    }

    return Response.json({ success: true, deleted: toDelete.length })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}