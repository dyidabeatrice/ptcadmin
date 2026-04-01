import { getSheetData, getSheetId, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function getWeekDates() {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  const weekDates = {}
  DAYS.forEach((day, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    weekDates[day] = d.toLocaleDateString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric'
    })
  })
  return weekDates
}

export async function GET() {
  try {
    const data = await getSheetData('sessions')
    const [, ...rows] = data
    if (!rows || rows.length === 0) return Response.json({ success: true, data: [] })
    const sessions = rows.filter(r => r && r[0]).map((row, i) => ({
      index: i,
      id: row[0], client_name: row[1], therapist: row[2],
      date: row[3], day: row[4], time_start: row[5], time_end: row[6],
      session_type: row[7] || 'Regular', status: row[8] || 'Scheduled',
      payment: row[9] || 'Unpaid', mop: row[10] || ''
    }))
    return Response.json({ success: true, data: sessions })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const sheets = getGoogleSheets()

    if (body.action === 'generate') {
      const weekDates = getWeekDates()
      const weekDateValues = Object.values(weekDates)

      const masterData = await getSheetData('masterschedule')
      const [, ...masterRows] = masterData
      if (!masterRows || masterRows.length === 0)
        return Response.json({ success: false, error: 'Master schedule is empty — add clients first' })

      const existingData = await getSheetData('sessions')
      const [, ...existingRows] = existingData
      const existingKeys = new Set(
        existingRows
          .filter(r => r && r[3] && weekDateValues.includes(r[3]))
          .map(r => `${r[1]}|${r[2]}|${r[4]}|${r[5]}`)
      )

      const master = masterRows.filter(r => r && r[0]).map(row => ({
        client_name: row[1], therapist: row[2],
        day: row[3]?.trim(), time_start: row[4], time_end: row[5]
      }))

      const newRows = master
        .filter(m => weekDates[m.day])
        .filter(m => !existingKeys.has(`${m.client_name}|${m.therapist}|${m.day}|${m.time_start}`))
        .map(m => [
          Date.now().toString() + Math.random().toString(36).slice(2),
          m.client_name, m.therapist, weekDates[m.day],
          m.day, m.time_start, m.time_end,
          'Regular', 'Scheduled', 'Unpaid', ''
        ])

      if (newRows.length === 0)
        return Response.json({ success: true, generated: 0, message: 'All sessions already exist for this week' })

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'sessions', valueInputOption: 'RAW',
        requestBody: { values: newRows }
      })
      return Response.json({ success: true, generated: newRows.length })
    }

    if (body.action === 'add') {
      const weekDates = getWeekDates()
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'sessions', valueInputOption: 'RAW',
        requestBody: { values: [[
          Date.now().toString() + Math.random().toString(36).slice(2),
          body.client_name, body.therapist,
          weekDates[body.day] || '', body.day,
          body.time_start, body.time_end,
          'Regular', 'Scheduled', 'Unpaid', ''
        ]]}
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
    const sheetRow = body.rowIndex + 2

    if (body.action === 'edit') {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `sessions!B${sheetRow}:K${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[
          body.client_name, body.therapist, body.date,
          body.day, body.time_start, body.time_end,
          body.session_type || 'Regular',
          body.status, body.payment, body.mop || ''
        ]]}
      })
      return Response.json({ success: true })
    }

    if (body.action === 'pay') {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `sessions!H${sheetRow}:K${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[
          body.session_type, body.status,
          'Paid', body.mop
        ]]}
      })
      const sheets2 = getGoogleSheets()
      await sheets2.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'payments', valueInputOption: 'RAW',
        requestBody: { values: [[
          Date.now().toString(),
          body.client_name, body.therapist,
          body.session_id, body.amount,
          body.mop, body.session_type, body.date
        ]]}
      })
      return Response.json({ success: true })
    }

    if (body.action === 'unpay') {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `sessions!J${sheetRow}:K${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [['Unpaid', '']] }
      })
      const payData = await getSheetData('payments')
      const [, ...payRows] = payData
      const payIndex = payRows.findIndex(r => r && r[3] === body.session_id)
      if (payIndex !== -1) {
        const paySheetId = await getSheetId('payments')
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: { requests: [{ deleteDimension: {
            range: { sheetId: paySheetId, dimension: 'ROWS', startIndex: payIndex + 1, endIndex: payIndex + 2 }
          }}]}
        })
      }
      return Response.json({ success: true })
    }

    const col = body.field === 'status' ? 'I' : 'J'
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `sessions!${col}${sheetRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[body.value]] }
    })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function DELETE(request) {
  try {
    const { rowIndex } = await request.json()
    const sheets = getGoogleSheets()
    const sheetId = await getSheetId('sessions')
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