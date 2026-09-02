import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'

async function getWrittenOffIds() {
  try {
    const data = await getSheetData('written_off_sessions')
    const [, ...rows] = data
    return new Set(rows.filter(r => r && r[2]).map(r => r[2]))
  } catch {
    return new Set()
  }
}

async function computeTrueOutstanding() {
  const sheets = getGoogleSheets()
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const weekSheets = res.data.sheets.map(s => s.properties.title).filter(t => t.startsWith('week_'))
  const writtenOffIds = await getWrittenOffIds()

  const byClient = {}

  for (const weekKey of weekSheets) {
    const data = await getSheetData(weekKey)
    const [, ...rows] = data
    rows.forEach(row => {
      if (!row || !row[0]) return
      if (row[9] !== 'Unpaid' || (row[8] !== 'Present' && row[8] !== 'Cancelled')) return
      if (writtenOffIds.has(row[0])) return
      const clientName = row[1]
      const amount = parseFloat(row[11] || 0)
      byClient[clientName] = (byClient[clientName] || 0) + amount
    })
  }

  // Outstanding document fees
  try {
    const reportData = await getSheetData('reports')
    const [, ...reportRows] = reportData
    reportRows.forEach(row => {
      if (!row || !row[0]) return
      if (row[8] !== 'Outstanding') return
      const amount = parseFloat(row[7] || 0)
      if (amount <= 0) return
      const clientName = row[1]
      byClient[clientName] = (byClient[clientName] || 0) + amount
    })
  } catch {
    // reports tab issue — skip document fees rather than fail the whole recalc
  }

  return byClient
}

export async function GET() {
  try {
    const trueBalances = await computeTrueOutstanding()
    const clientsData = await getSheetData('clients')
    const [, ...clientRows] = clientsData

    const preview = clientRows.filter(r => r && r[0]).map(row => {
      const name = row[1]
      const current = parseFloat(row[10] || 0)
      const trueValue = trueBalances[name] || 0
      return { name, current, correct: trueValue, diff: trueValue - current }
    }).filter(p => p.current !== 0 || p.correct !== 0)
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))

    return Response.json({ success: true, preview })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function POST() {
  try {
    const trueBalances = await computeTrueOutstanding()
    const sheets = getGoogleSheets()
    const clientsData = await getSheetData('clients')
    const [, ...clientRows] = clientsData

    const data = []
    for (let i = 0; i < clientRows.length; i++) {
      const row = clientRows[i]
      if (!row || !row[0]) continue
      const name = row[1]
      const current = parseFloat(row[10] || 0)
      const trueValue = trueBalances[name] || 0
      if (current === trueValue) continue

      data.push({
        range: `clients!K${i + 2}`,
        values: [[trueValue]]
      })
    }

    if (data.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { valueInputOption: 'RAW', data }
      })
    }

    return Response.json({ success: true, updated: data.length })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}