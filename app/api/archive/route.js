import { getGoogleSheets, getSheetId, SPREADSHEET_ID } from '../../lib/sheets'

const ARCHIVE_SPREADSHEET_ID = process.env.ARCHIVE_SPREADSHEET_ID
const MONTHS_LIMIT = 18

async function getWeekSheetsOlderThanCutoff() {
  const sheets = getGoogleSheets()
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const weekSheets = res.data.sheets
    .map(s => s.properties.title)
    .filter(t => t.startsWith('week_'))
    .sort()

  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - MONTHS_LIMIT)

  return weekSheets.filter(key => {
    const parts = key.replace('week_', '').split('_')
    const monday = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`)
    return monday < cutoff
  })
}

export async function GET() {
  try {
    if (!ARCHIVE_SPREADSHEET_ID) {
      return Response.json({ success: false, error: 'ARCHIVE_SPREADSHEET_ID not configured' })
    }
    const toArchive = await getWeekSheetsOlderThanCutoff()
    return Response.json({ success: true, weeks: toArchive })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function POST(request) {
  try {
    if (!ARCHIVE_SPREADSHEET_ID) {
      return Response.json({ success: false, error: 'ARCHIVE_SPREADSHEET_ID not configured' })
    }
    const { week_key } = await request.json()
    if (!week_key || !week_key.startsWith('week_')) {
      return Response.json({ success: false, error: 'Invalid week key' })
    }

    const sheets = getGoogleSheets()
    const sourceSheetId = await getSheetId(week_key)
    if (sourceSheetId === undefined || sourceSheetId === null) {
      return Response.json({ success: false, error: `Sheet ${week_key} not found` })
    }

    // Step 1: copy the sheet into the Archive spreadsheet
    const copyRes = await sheets.spreadsheets.sheets.copyTo({
      spreadsheetId: SPREADSHEET_ID,
      sheetId: sourceSheetId,
      requestBody: { destinationSpreadsheetId: ARCHIVE_SPREADSHEET_ID }
    })
    const newSheetId = copyRes.data.sheetId
    if (newSheetId === undefined) {
      return Response.json({ success: false, error: 'Copy did not return a new sheet ID — aborting before delete' })
    }

    // Step 2: rename the copy in the Archive spreadsheet to match the original
    // (copyTo names it "Copy of week_...", so we clean that up)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: ARCHIVE_SPREADSHEET_ID,
      requestBody: {
        requests: [{
          updateSheetProperties: {
            properties: { sheetId: newSheetId, title: week_key },
            fields: 'title'
          }
        }]
      }
    })

    // Step 3: only now, having confirmed the copy succeeded, delete the original
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ deleteSheet: { sheetId: sourceSheetId } }] }
    })

    return Response.json({ success: true, archived: week_key })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}