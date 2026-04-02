import { getSheetData, getSheetId, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'
import { getMondayOf, getWeekKey, getWeekDates, getWeekLabel } from '../weeks/route'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

const RATES = {
  OT:   { 'OT Session': 1200, 'Initial Evaluation': 2800, 'IEP': 1800, 'Specialized': 0, 'Cancellation Fee': 0 },
  ST:   { 'ST Session': 1300, 'Initial Evaluation': 2800, 'IEP': 1800, 'Specialized': 0, 'Cancellation Fee': 0 },
  PT:   { 'PT Session': 900,  'Initial Evaluation': 2800, 'IEP': 1800, 'Specialized': 0, 'Cancellation Fee': 0 },
  SPED: { 'SPED Tutorial': 900, 'IEP': 1800, 'Specialized': 0, 'Cancellation Fee': 0 },
}

function getSpecialty(name) {
  const n = name?.toUpperCase() || ''
  if (n.includes('ST') || n.includes('KIRSTINE') || n.includes('ZALEEN') || n.includes('BERNA') || n.includes('JEIA') || n.includes('COLEEN') || n.includes('FAITH') || n.includes('DIANE') || n.includes('PATRICIA') || n.includes('JEWEL') || n.includes('MABY') || n.includes('YSA') || n.includes('NICCO') || n.includes('PRECIOUS') || n.includes('MYNIEL')) return 'ST'
  if (n.includes('PT') || n.includes('MONICE')) return 'PT'
  if (n.includes('SPED') || n.includes('DIANE ROXAS') || n.includes('DES')) return 'SPED'
  return 'OT'
}

function getSessionType(therapistName) {
  const specialty = getSpecialty(therapistName)
  if (specialty === 'ST') return 'ST Session'
  if (specialty === 'PT') return 'PT Session'
  if (specialty === 'SPED') return 'SPED Tutorial'
  return 'OT Session'
}

function getRate(therapistName, sessionType) {
  const specialty = getSpecialty(therapistName)
  return RATES[specialty]?.[sessionType] ?? 0
}

async function getWeekSheet(weekKey) {
  try {
    const data = await getSheetData(weekKey)
    const [, ...rows] = data
    return rows.filter(r => r && r[0]).map((row, i) => ({
      index: i,
      id: row[0], client_name: row[1], therapist: row[2],
      date: row[3], day: row[4], time_start: row[5], time_end: row[6],
      session_type: row[7] || 'OT Session', status: row[8] || 'Scheduled',
      payment: row[9] || 'Unpaid', mop: row[10] || '',
      amount: parseFloat(row[11] || 0), notes: row[12] || ''
    }))
  } catch {
    return []
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const weekKey = searchParams.get('week')
    if (!weekKey) return Response.json({ success: false, error: 'Week key required' })
    const sessions = await getWeekSheet(weekKey)
    return Response.json({ success: true, data: sessions })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const sheets = getGoogleSheets()

    if (body.action === 'add') {
      const weekKey = body.week_key
      const row = [
        Date.now().toString() + Math.random().toString(36).slice(2),
        body.client_name, body.therapist, body.date,
        body.day, body.time_start, body.time_end,
        getSessionType(body.therapist), 'Scheduled', 'Unpaid', '', '', ''
      ]
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: weekKey, valueInputOption: 'RAW',
        requestBody: { values: [row] }
      })
      return Response.json({ success: true })
    }

    return Response.json({ success: false, error: 'Unknown action' })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json()
    const sheets = getGoogleSheets()
    const weekKey = body.week_key
    const sheetRow = body.rowIndex + 2

    if (body.action === 'status') {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${weekKey}!I${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[body.status]] }
      })
      return Response.json({ success: true })
    }

    if (body.action === 'pay') {
      const amount = body.use_credit ? 0 : body.amount
      const mop = body.use_credit ? 'Credit' : body.mop
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${weekKey}!H${sheetRow}:L${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[
          body.session_type, 'Paid', mop, body.amount, ''
        ]]}
      })

      if (body.use_credit) {
        await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/credits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'apply_credit', client_name: body.client_name, amount: body.amount })
        })
      }

      await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_outstanding', client_name: body.client_name, amount: body.amount })
      })

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'payments', valueInputOption: 'RAW',
        requestBody: { values: [[
          Date.now().toString(), body.client_name, body.therapist,
          body.session_id, body.amount, mop,
          body.session_type, body.date, 'session'
        ]]}
      })

      return Response.json({ success: true })
    }

    if (body.action === 'unpay') {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${weekKey}!H${sheetRow}:L${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [['OT Session', 'Unpaid', '', 0, '']] }
      })

      const payData = await getSheetData('payments')
      const [, ...payRows] = payData
      const payIndex = payRows.findIndex(r => r && r[3] === body.session_id)
      if (payIndex !== -1) {
        const sheetId = await getSheetId('payments')
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: { requests: [{ deleteDimension: {
            range: { sheetId, dimension: 'ROWS', startIndex: payIndex + 1, endIndex: payIndex + 2 }
          }}]}
        })
      }

      await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_outstanding', client_name: body.client_name, amount: body.amount })
      })

      return Response.json({ success: true })
    }

    if (body.action === 'absent_paid') {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${weekKey}!I${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [['Absent']] }
      })
      await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'absent_credit', client_name: body.client_name, amount: body.amount })
      })
      return Response.json({ success: true })
    }

    if (body.action === 'reschedule') {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${weekKey}!C${sheetRow}:G${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[
          body.therapist, body.date, body.day, body.time_start, body.time_end
        ]]}
      })
      return Response.json({ success: true })
    }

    if (body.action === 'edit') {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${weekKey}!B${sheetRow}:M${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[
          body.client_name, body.therapist, body.date,
          body.day, body.time_start, body.time_end,
          body.session_type, body.status, body.payment,
          body.mop, body.amount, body.notes || ''
        ]]}
      })
      return Response.json({ success: true })
    }

    if (body.action === 'holiday') {
      const sessions = await getWeekSheet(weekKey)
      const daySessions = sessions.filter(s => s.day === body.day && s.status !== 'Cancelled')
      for (const s of daySessions) {
        const row = s.index + 2
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${weekKey}!I${row}`,
          valueInputOption: 'RAW',
          requestBody: { values: [['Cancelled']] }
        })
      }
      return Response.json({ success: true, cancelled: daySessions.length })
    }

    if (body.action === 'therapist_absent') {
      const sessions = await getWeekSheet(weekKey)
      const therapistSessions = sessions.filter(s => s.therapist === body.therapist && s.day === body.day && s.status !== 'Cancelled')
      for (const s of therapistSessions) {
        const row = s.index + 2
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${weekKey}!I${row}`,
          valueInputOption: 'RAW',
          requestBody: { values: [['Cancelled']] }
        })
      }
      return Response.json({ success: true, cancelled: therapistSessions.length })
    }

    if (body.action === 'therapist_undo_absent') {
      const sessions = await getWeekSheet(weekKey)
      const therapistSessions = sessions.filter(s => s.therapist === body.therapist && s.day === body.day && s.status === 'Cancelled')
      for (const s of therapistSessions) {
        const row = s.index + 2
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${weekKey}!I${row}`,
          valueInputOption: 'RAW',
          requestBody: { values: [['Scheduled']] }
        })
      }
      return Response.json({ success: true })
    }

    return Response.json({ success: false, error: 'Unknown action' })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function DELETE(request) {
  try {
    const { rowIndex, week_key } = await request.json()
    const sheets = getGoogleSheets()
    const sheetId = await getSheetId(week_key)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ deleteDimension: {
        range: { sheetId, dimension: 'ROWS', startIndex: rowIndex + 1, endIndex: rowIndex + 2 }
      }}]}
    })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}