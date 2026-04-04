import { google } from 'googleapis'

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

export async function getSheetData(sheetName) {
  const sheets = google.sheets({ version: 'v4', auth })
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    range: sheetName,
  })
  return response.data.values || []
}

export async function getSheetId(sheetName) {
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  })
  const sheet = res.data.sheets.find(
    s => s.properties.title.toLowerCase() === sheetName.toLowerCase()
  )
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found`)
  return sheet.properties.sheetId
}

export function getGoogleSheets() {
  return google.sheets({ version: 'v4', auth })
}

export const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

export function getPHTDate() {
  return new Date().toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

export function getPHTDateTime() {
  return new Date().toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  })
}
