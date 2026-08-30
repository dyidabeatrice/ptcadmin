import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../../lib/sheets'
import { parsePHDate } from '../../../lib/dates'
import { getParentFromCookie } from '../../../lib/auth'

async function getWeekSheets() {
  const sheets = getGoogleSheets()
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  return res.data.sheets.map(s => s.properties.title).filter(t => t.startsWith('week_')).sort()
}

export async function GET() {
  try {
    const parent = await getParentFromCookie()
    if (!parent) return Response.json({ success: false, error: 'Not logged in' }, { status: 401 })

    const accountsData = await getSheetData('parent_accounts')
    const [, ...accountRows] = accountsData
    const accountRow = accountRows.find(r => r && r[0] === parent.id)
    if (!accountRow) return Response.json({ success: false, error: 'Account not found' })

    const status = accountRow[3] || 'pending'
    if (status !== 'active') {
      return Response.json({ success: true, status, children: [] })
    }

    const linkedClientNames = (accountRow[5] || '').split(';').map(s => s.trim()).filter(Boolean)
    if (linkedClientNames.length === 0) {
      return Response.json({ success: true, status, children: [] })
    }

    // Determine which week sheets to even bother fetching: anything whose
    // Saturday falls on/after 30 days ago — this naturally covers "past 30
    // days" through "all future scheduled weeks" in one filter.
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    today.setHours(0, 0, 0, 0)
    const cutoff = new Date(today)
    cutoff.setDate(cutoff.getDate() - 30)

    const weekSheets = await getWeekSheets()
    const relevantWeeks = weekSheets.filter(weekKey => {
      const parts = weekKey.replace('week_', '').split('_')
      const monday = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`)
      const saturday = new Date(monday)
      saturday.setDate(monday.getDate() + 5)
      return saturday >= cutoff
    })

    const weekDataResults = await Promise.all(relevantWeeks.map(wk => getSheetData(wk)))
    const allSessionsByClient = {}
    linkedClientNames.forEach(name => { allSessionsByClient[name] = [] })

    relevantWeeks.forEach((weekKey, idx) => {
      const [, ...rows] = weekDataResults[idx]
      rows.filter(r => r && r[0] && linkedClientNames.includes(r[1])).forEach(row => {
        allSessionsByClient[row[1]].push({
          id: row[0],
          date: row[3],
          day: row[4],
          time_start: row[5],
          time_end: row[6],
          session_type: row[7] || 'Regular',
          status: row[8] || 'Pencil',
          payment: row[9] || 'Unpaid'
        })
      })
    })

    // Client balances
    const clientsData = await getSheetData('clients')
    const [, ...clientRows] = clientsData

    const children = linkedClientNames.map(name => {
      const clientRow = clientRows.find(r => r && r[1] === name)
      const sessions = allSessionsByClient[name] || []

      const upcoming = []
      const past = []
      sessions.forEach(s => {
        const d = parsePHDate(s.date)
        if (!d) return
        if (d >= today) upcoming.push(s)
        else past.push(s)
      })

      const parseTime = t => {
        if (!t) return 0
        const [time, period] = t.split(' ')
        let [h, m] = time.split(':').map(Number)
        if (period === 'PM' && h !== 12) h += 12
        if (period === 'AM' && h === 12) h = 0
        return h * 60 + m
      }
      upcoming.sort((a, b) => (parsePHDate(a.date) - parsePHDate(b.date)) || (parseTime(a.time_start) - parseTime(b.time_start)))
      past.sort((a, b) => (parsePHDate(b.date) - parsePHDate(a.date)) || (parseTime(b.time_start) - parseTime(a.time_start)))

      return {
        name,
        credit_balance: parseFloat(clientRow?.[9] || 0),
        outstanding_balance: parseFloat(clientRow?.[10] || 0),
        upcoming,
        past
      }
    })

    return Response.json({ success: true, status, children })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}