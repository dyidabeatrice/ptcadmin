import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'

export async function GET() {
  try {
    const data = await getSheetData('level_history')
    const [, ...rows] = data
    const history = rows.filter(r => r && r[0]).map(row => ({
      id: row[0],
      therapist_name: row[1],
      level: row[2],
      effective_date: row[3]
    }))
    return Response.json({ success: true, data: history })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

const BASELINE_DATE = '2026-01-01' // safely before earliest real session/payment data (Apr 16, 2026)

export async function POST(request) {
  try {
    const body = await request.json()
    const sheets = getGoogleSheets()
    const rowsToAppend = []

    // If this therapist has no history yet, backfill a baseline entry first,
    // recording what their level was BEFORE this change — so past sessions
    // still resolve to the correct (old) level instead of falling through
    // to "current level."
    if (body.baseline_level) {
      const existing = await getSheetData('level_history')
      const [, ...existingRows] = existing
      const hasHistory = existingRows.some(r => r && r[1] === body.therapist_name)
      if (!hasHistory) {
        rowsToAppend.push([
          Date.now().toString() + '-base',
          body.therapist_name,
          body.baseline_level,
          BASELINE_DATE
        ])
      }
    }

    rowsToAppend.push([
      Date.now().toString(),
      body.therapist_name,
      body.level,
      body.effective_date
    ])

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'level_history',
      valueInputOption: 'RAW',
      requestBody: { values: rowsToAppend }
    })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}