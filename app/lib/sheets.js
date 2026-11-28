import { google } from 'googleapis'

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
  ],
})

export const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

// One shared client per server instance, instead of a new one on every call.
const sheetsClient = google.sheets({ version: 'v4', auth })
const driveClient = google.drive({ version: 'v3', auth })

export function getGoogleSheets() {
  return sheetsClient
}

export function getGoogleDrive() {
  return driveClient
}

export async function getSheetData(sheetName) {
  const response = await sheetsClient.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  })
  return response.data.values || []
}

// ---- Tab list + tab IDs ----
// Asks Google only for each tab's title and ID, not the full spreadsheet
// metadata (formatting, grid sizes, etc. for every week tab).
// Tab IDs never change for a given tab, so they're remembered for a few
// minutes. A missing title always triggers a fresh lookup, so newly created
// week tabs are found right away.
const SHEET_ID_TTL_MS = 5 * 60 * 1000
let sheetIdCache = null // { byTitle: Map(lowercaseTitle -> sheetId), at: timestamp }

async function fetchSheetProperties() {
  const res = await sheetsClient.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: 'sheets.properties(sheetId,title)',
  })
  const props = (res.data.sheets || []).map(s => s.properties)
  sheetIdCache = {
    byTitle: new Map(props.map(p => [p.title.toLowerCase(), p.sheetId])),
    at: Date.now(),
  }
  return props
}

// Returns every tab title in the spreadsheet, e.g. ['clients', 'payments', 'week_2026_11_23', ...]
export async function listSheetTitles() {
  const props = await fetchSheetProperties()
  return props.map(p => p.title)
}

export async function getSheetId(sheetName) {
  const key = sheetName.toLowerCase()
  const fresh = sheetIdCache && Date.now() - sheetIdCache.at < SHEET_ID_TTL_MS
  if (fresh && sheetIdCache.byTitle.has(key)) return sheetIdCache.byTitle.get(key)

  await fetchSheetProperties()
  if (!sheetIdCache.byTitle.has(key)) throw new Error(`Sheet "${sheetName}" not found`)
  return sheetIdCache.byTitle.get(key)
}

// ---- Row deletion ----
// rowIndex is the 0-based data row (the index used in your mapped objects,
// NOT counting the header row).
export async function deleteSheetRow(sheetName, rowIndex) {
  return deleteSheetRows(sheetName, [rowIndex])
}

// Deletes several rows in ONE request. Rows are deleted bottom-up so
// earlier deletions don't shift the positions of later ones.
export async function deleteSheetRows(sheetName, rowIndexes) {
  if (!rowIndexes || rowIndexes.length === 0) return
  const sheetId = await getSheetId(sheetName)
  const requests = [...new Set(rowIndexes)]
    .sort((a, b) => b - a)
    .map(i => ({ deleteDimension: {
      range: { sheetId, dimension: 'ROWS', startIndex: i + 1, endIndex: i + 2 }
    }}))
  await sheetsClient.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests },
  })
}

// Finds the 0-based data row index of the row whose first column (id) matches the given id.
// Returns -1 if not found, matching Array.findIndex behavior.
export async function findRowIndexById(sheetName, id) {
  const data = await getSheetData(sheetName)
  const [, ...rows] = data
  return rows.findIndex(r => r && r[0] === id)
}