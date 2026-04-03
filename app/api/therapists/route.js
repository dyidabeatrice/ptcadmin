import { getSheetData } from '../../lib/sheets'
import { google } from 'googleapis'

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

async function getSheetId(sheets, sheetName) {
  const res = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  })
  const sheet = res.data.sheets.find(
    s => s.properties.title.toLowerCase() === sheetName.toLowerCase()
  )
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found`)
  return sheet.properties.sheetId
}

export async function GET() {
  try {
    const data = await getSheetData('therapists')
    const [, ...rows] = data
    if (!rows || rows.length === 0) return Response.json({ success: true, data: [] })
    const therapists = rows.filter(r => r && r[0]).map((row, i) => ({
      index: i,
      id: row[0], name: row[1], specialty: row[2],
      is_intern: row[3] === 'TRUE', day: row[4],
      time_start: row[5], time_end: row[6]
    }))
      return Response.json({ success: true, data: therapists }, {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const sheets = google.sheets({ version: 'v4', auth })
    const rows = body.days.map((d, i) => [
      Date.now().toString() + i,
      body.name, body.specialty,
      body.is_intern ? 'TRUE' : 'FALSE',
      d.day, d.time_start, d.time_end
    ])
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      range: 'therapists', valueInputOption: 'RAW',
      requestBody: { values: rows }
    })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json()
    const sheets = google.sheets({ version: 'v4', auth })
    const sheetRow = body.rowIndex + 2
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      range: `therapists!B${sheetRow}:G${sheetRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[
        body.name, body.specialty,
        body.is_intern ? 'TRUE' : 'FALSE',
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
    const sheets = google.sheets({ version: 'v4', auth })
    const sheetId = await getSheetId(sheets, 'therapists')
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      requestBody: { requests: [{ deleteDimension: {
        range: { sheetId, dimension: 'ROWS', startIndex: rowIndex + 1, endIndex: rowIndex + 2 }
      }}]}
    })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}