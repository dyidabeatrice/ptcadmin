import { getSheetData, getSheetId, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'
import { setPfConfirmation } from '../../lib/pfConfirm'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const therapist = searchParams.get('therapist')
    
    const data = await getSheetData('pf_releases')
    const [, ...rows] = data
    const releases = rows.filter(r => r && r[0]).map((row, i) => ({
      index: i,
      id: row[0],
      therapist: row[1],
      month_key: row[2],
      period: row[3],
      sent_via: row[4],
      date_sent: row[5] || '',
      notes: row[6] || '',
      confirmed_at: row[7] || '',
      released: !!row[5]
    }))

    const filtered = therapist ? releases.filter(r => r.therapist === therapist) : releases
    return Response.json({ success: true, data: filtered })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const sheets = getGoogleSheets()

    // Check if release already exists for this therapist/month/period
    const data = await getSheetData('pf_releases')
    const [, ...rows] = data
    const existing = rows.findIndex(r => 
      r && r[1] === body.therapist && 
      r[2] === body.month_key && 
      String(r[3]) === String(body.period)
    )

    if (existing !== -1) {
      // Update existing
      const sheetRow = existing + 2
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `pf_releases!E${sheetRow}:G${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[body.sent_via, body.date_sent, body.notes || '']] }
      })
    } else {
      // Create new
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'pf_releases',
        valueInputOption: 'RAW',
        requestBody: { values: [[
          Date.now().toString(),
          body.therapist,
          body.month_key,
          body.period,
          body.sent_via,
          body.date_sent,
          body.notes || ''
        ]]}
      })
    }

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function PATCH(request) {
  try {
    const { action, therapist, month_key, period, confirmed } = await request.json()
    if (action !== 'confirm') return Response.json({ success: false, error: 'Unknown action' })
    if (!therapist || !month_key || !period) return Response.json({ success: false, error: 'Missing fields' })
    await setPfConfirmation(therapist, month_key, period, confirmed)
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}