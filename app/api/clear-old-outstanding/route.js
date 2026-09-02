import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'
import { formatPHDateTime } from '../../lib/dates'
import { parsePHDate } from '../../lib/dates'

async function getClientRow(sheets, clientName) {
  const data = await getSheetData('clients')
  const [, ...rows] = data
  const index = rows.findIndex(r => r && r[1] === clientName)
  if (index === -1) return null
  return { index, row: rows[index] }
}

const ARCHIVE_SPREADSHEET_ID = process.env.ARCHIVE_SPREADSHEET_ID
const CUTOFF = new Date(2026, 5, 1) // June 1, 2026

export async function POST() {
  try {
    const sheets = getGoogleSheets()
    const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
    const weekSheets = res.data.sheets.map(s => s.properties.title).filter(t => t.startsWith('week_'))

    const toClear = [] // { client_name, session_id, week_key, session_date, amount }

    for (const weekKey of weekSheets) {
      const data = await getSheetData(weekKey)
      const [, ...rows] = data
      rows.forEach(row => {
        if (!row || !row[0]) return
        const status = row[8]
        const payment = row[9]
        if (payment !== 'Unpaid' || (status !== 'Present' && status !== 'Cancelled')) return
        const d = parsePHDate(row[3])
        if (!d || d >= CUTOFF) return
        toClear.push({
          client_name: row[1],
          session_id: row[0],
          week_key: weekKey,
          session_date: row[3],
          amount: parseFloat(row[11] || 0)
        })
      })
    }

    if (toClear.length === 0) {
      return Response.json({ success: true, cleared: 0, clients: 0 })
    }

    const now = formatPHDateTime()
    const logRows = toClear.map(s => [
      Date.now().toString() + Math.random().toString(36).slice(2),
      s.client_name, s.session_id, s.week_key, s.session_date, s.amount, now
    ])

    // Write the active exclusion list (main spreadsheet — used to filter By Client/By Day going forward)
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'written_off_sessions',
      valueInputOption: 'RAW',
      requestBody: { values: logRows }
    })

    // Copy the same record to the Archive spreadsheet as a permanent backup
    if (ARCHIVE_SPREADSHEET_ID) {
      try {
        await sheets.spreadsheets.values.append({
          spreadsheetId: ARCHIVE_SPREADSHEET_ID,
          range: 'cleared_outstanding_log',
          valueInputOption: 'RAW',
          requestBody: { values: logRows }
        })
      } catch (archiveError) {
        console.error('Failed to write to archive log (continuing anyway):', archiveError.message)
      }
    }

    // Reduce each affected client's outstanding_balance by their total cleared amount
    const byClient = {}
    toClear.forEach(s => {
      byClient[s.client_name] = (byClient[s.client_name] || 0) + s.amount
    })

    const notFound = []
    for (const [clientName, amount] of Object.entries(byClient)) {
      if (amount <= 0) continue
      const result = await getClientRow(sheets, clientName)
      if (!result) { notFound.push(clientName); continue }
      const currentOutstanding = parseFloat(result.row[10] || 0)
      const newOutstanding = Math.max(0, currentOutstanding - amount)
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `clients!K${result.index + 2}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[newOutstanding]] }
      })
    }

    return Response.json({ success: true, cleared: toClear.length, clients: Object.keys(byClient).length, not_found: notFound })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}