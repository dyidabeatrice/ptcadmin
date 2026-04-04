import { getSheetData, getSheetId, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'

async function getWeekSheet(weekKey) {
  try {
    const data = await getSheetData(weekKey)
    const [, ...rows] = data
    return rows.filter(r => r && r[0]).map((row, i) => ({
      index: i,
      id: row[0], client_name: row[1], therapist: row[2],
      date: row[3], day: row[4], time_start: row[5], time_end: row[6],
      session_type: row[7] || '', status: row[8] || 'Pencil',
      payment: row[9] || 'Unpaid', mop: row[10] || '',
      amount: parseFloat(row[11] || 0), notes: row[12] || ''
    }))
  } catch {
    return []
  }
}

function getPHTDate() {
  return new Date().toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric', month: 'short', day: 'numeric'
  })
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
    const weekKey = body.week_key

    if (body.action === 'add') {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: weekKey, valueInputOption: 'RAW',
        requestBody: { values: [[
          Date.now().toString() + Math.random().toString(36).slice(2),
          body.client_name, body.therapist, body.date,
          body.day, body.time_start, body.time_end,
          '', 'Pencil', 'Unpaid', '', '', ''
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
    const weekKey = body.week_key
    const sheetRow = body.rowIndex + 2

    if (body.action === 'status') {
      const sessions = await getWeekSheet(weekKey)
      const session = sessions.find(s => s.index === body.rowIndex)
      const oldStatus = session?.status
      const newStatus = body.status
      const isPaid = session?.payment === 'Paid'

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${weekKey}!I${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[newStatus]] }
      })

      const nowOwes = !isPaid && (newStatus === 'Present' || newStatus === 'Cancelled')
      const wasOwing = !isPaid && (oldStatus === 'Present' || oldStatus === 'Cancelled')

      if (nowOwes && !wasOwing && session?.client_name) {
        const rate = session.amount || 0
        if (rate > 0) {
          await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/credits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'add_outstanding', client_name: session.client_name, amount: rate })
          })
        }
      }

      if (wasOwing && !nowOwes && session?.client_name) {
        const rate = session.amount || 0
        if (rate > 0) {
          await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/credits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'clear_outstanding', client_name: session.client_name, amount: rate })
          })
        }
      }

      return Response.json({ success: true })
    }

    if (body.action === 'pay') {
      const mop = body.use_credit ? 'Credit' : body.split ? 'Split' : body.mop

      // Update session type
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${weekKey}!H${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[body.session_type]] }
      })

      // Update payment status
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${weekKey}!J${sheetRow}:L${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [['Paid', mop, body.amount]] }
      })

      // Auto-confirm if still Pencil
      const sessions = await getWeekSheet(weekKey)
      const session = sessions.find(s => s.index === body.rowIndex)
      if (session?.status === 'Pencil') {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${weekKey}!I${sheetRow}`,
          valueInputOption: 'RAW',
          requestBody: { values: [['Scheduled']] }
        })
      }

      // Handle credit deduction
      if (body.use_credit || body.split) {
        const creditAmount = body.split ? body.split_credit : body.amount
        await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/credits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'apply_credit', client_name: body.client_name, amount: creditAmount, credit_balance: body.credit_balance })
        })
      }

      // Clear outstanding
      await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_outstanding', client_name: body.client_name, amount: body.amount })
      })

      // Log to payments sheet
      const paymentId = Date.now().toString() + Math.random().toString(36).slice(2)
      const payDate = getPHTDate()
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'payments',
        valueInputOption: 'RAW',
        requestBody: { values: [[
          paymentId,
          body.client_name,
          body.therapist,
          body.session_id || body.rowIndex.toString(),
          body.amount,
          mop,
          body.session_type || 'Regular',
          payDate,
          'session'
        ]]}
      })

      return Response.json({ success: true })
    }

    if (body.action === 'unpay') {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${weekKey}!J${sheetRow}:L${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [['Unpaid', '', body.amount || 0]] }
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

      // Add back to outstanding if Present or Cancelled
      const unpaidSessions = await getWeekSheet(weekKey)
      const unpaidSession = unpaidSessions.find(s => s.index === body.rowIndex)
      if (unpaidSession && (unpaidSession.status === 'Present' || unpaidSession.status === 'Cancelled')) {
        const rate = unpaidSession.amount || body.amount || 0
        if (rate > 0) {
          await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/credits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'add_outstanding', client_name: body.client_name, amount: rate })
          })
        }
      }

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
          body.therapist, body.date, body.day,
          body.time_start, body.time_end
        ]]}
      })
      return Response.json({ success: true })
    }

    if (body.action === 'holiday') {
      const sessions = await getWeekSheet(weekKey)
      const daySessions = sessions.filter(s => s.day === body.day && s.status !== 'Cancelled')
      for (const s of daySessions) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${weekKey}!I${s.index + 2}`,
          valueInputOption: 'RAW',
          requestBody: { values: [['Cancelled']] }
        })
      }
      return Response.json({ success: true, cancelled: daySessions.length })
    }

    if (body.action === 'therapist_absent') {
      const sessions = await getWeekSheet(weekKey)
      const therapistSessions = sessions.filter(s =>
        s.therapist === body.therapist &&
        s.day === body.day &&
        s.status !== 'Cancelled'
      )
      for (const s of therapistSessions) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${weekKey}!I${s.index + 2}`,
          valueInputOption: 'RAW',
          requestBody: { values: [['Cancelled']] }
        })
      }
      return Response.json({ success: true, cancelled: therapistSessions.length })
    }

    if (body.action === 'therapist_undo_absent') {
      const sessions = await getWeekSheet(weekKey)
      const therapistSessions = sessions.filter(s =>
        s.therapist === body.therapist &&
        s.day === body.day &&
        s.status === 'Cancelled'
      )
      for (const s of therapistSessions) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${weekKey}!I${s.index + 2}`,
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
