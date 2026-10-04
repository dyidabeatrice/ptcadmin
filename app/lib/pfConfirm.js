import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from './sheets'
import { formatPHDate } from './dates'

// Marks (or unmarks) a therapist's cut as confirmed for a month/period.
// Lives on the same pf_releases row as the release info: if the row doesn't
// exist yet, it's created with the release fields blank.
export async function setPfConfirmation(therapist, monthKey, period, confirmed) {
  const sheets = getGoogleSheets()
  const data = await getSheetData('pf_releases')
  const [, ...rows] = data
  const idx = rows.findIndex(r => r && r[1] === therapist && r[2] === monthKey && String(r[3]) === String(period))
  const value = confirmed ? formatPHDate() : ''

  if (idx !== -1) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `pf_releases!H${idx + 2}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[value]] }
    })
    return
  }
  if (!confirmed) return
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'pf_releases',
    valueInputOption: 'RAW',
    requestBody: { values: [[
      Date.now().toString() + Math.random().toString(36).slice(2),
      therapist, monthKey, String(period), '', '', '', value
    ]]}
  })
}