import { getSheetData, getSheetId, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

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
      // Get therapist specialty to default session type and amount
      const therapistData = await getSheetData('therapists')
      const [, ...therapistRows] = therapistData
      const tRow = therapistRows.find(r => r && r[1] === body.therapist)
      const specialty = tRow?.[2] || 'OT'
      const isIntern = tRow?.[3] === 'TRUE'
      const defaultSessionType =
        specialty === 'ST' ? 'ST SESSION' :
        specialty === 'PT' ? 'PT SESSION' :
        specialty === 'SPED' ? 'SPED SESSION' : 'OT SESSION'
      const SPECIALTY_RATES = { OT: 1200, ST: 1300, PT: 900, SPED: 900 }
      const defaultAmount = isIntern ? 600 : (SPECIALTY_RATES[specialty] || 1200)

      const id = Date.now().toString() + Math.random().toString(36).slice(2)
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: weekKey,
        valueInputOption: 'RAW',
        requestBody: { values: [[
          id,
          body.client_name,
          body.therapist,
          body.date || '',
          body.day || '',
          body.time_start || '',
          body.time_end || '',
          defaultSessionType,
          'Pencil',
          'Unpaid',
          '',
          defaultAmount
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

    if (body.action === 'update_type') {
      const sessions = await getWeekSheet(weekKey)
      const session = sessions.find(s => s.index === body.rowIndex)
      const oldAmount = session?.amount || 0
      const newAmount = body.amount
      const sheetRow = body.rowIndex + 2

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${body.week_key}!H${sheetRow}:H${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[body.session_type]] }
      })
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${body.week_key}!L${sheetRow}:L${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[newAmount]] }
      })

      // Update attendance record in payments sheet
      const payData = await getSheetData('payments')
      const [, ...payRows] = payData
      const attendIndex = payRows.findIndex(r =>
        r && r[3] === session?.id && r[8] === 'attendance'
      )
      if (attendIndex !== -1) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `payments!E${attendIndex + 2}:G${attendIndex + 2}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[newAmount, 'UNPAID', body.session_type]] }
        })
      }

      // Update outstanding if unpaid + present/cancelled
      const needsOutstandingUpdate = session?.payment === 'Unpaid' &&
        (session?.status === 'Present' || session?.status === 'Cancelled')

      if (needsOutstandingUpdate && oldAmount !== newAmount && session?.client_name) {
        const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://potentialstherapycenter.com/'
        await fetch(`${baseUrl}/api/credits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'clear_outstanding', client_name: session.client_name, amount: oldAmount })
        })
        await fetch(`${baseUrl}/api/credits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add_outstanding', client_name: session.client_name, amount: newAmount })
        })
      }

      return Response.json({ success: true })
    }

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

    // If changing to Absent, delete attendance/cancellation records
    if ((newStatus === 'Absent' || newStatus === 'Pencil' || newStatus === 'Scheduled') && session?.id) {
      const payData = await getSheetData('payments')
      const [, ...payRows] = payData
      const sheetId = await getSheetId('payments')
      const toDelete = payRows
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => r && r[3] === session.id && (r[8] === 'attendance' || r[8] === 'cancellation'))
        .sort((a, b) => b.i - a.i)
      for (const { i } of toDelete) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: { requests: [{ deleteDimension: {
            range: { sheetId, dimension: 'ROWS', startIndex: i + 1, endIndex: i + 2 }
          }}]}
        })
      }
    } 

      const nowOwes = !isPaid && (newStatus === 'Present' || newStatus === 'Cancelled')
      const wasOwing = !isPaid && (oldStatus === 'Present' || oldStatus === 'Cancelled')

      if (nowOwes && !wasOwing && session?.client_name) {
        const rate = session.amount || 0
        if (rate > 0) {
          await fetch(`${process.env.NEXT_PUBLIC_URL}/api/credits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'add_outstanding', client_name: session.client_name, amount: rate })
          })
        }
      }

      if (wasOwing && !nowOwes && session?.client_name) {
        const rate = session.amount || 0
        if (rate > 0) {
          await fetch(`${process.env.NEXT_PUBLIC_URL}/api/credits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'clear_outstanding', client_name: session.client_name, amount: rate })
          })
        }
      }

      const payDate = new Date().toLocaleDateString('en-PH', {
        timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric'
      })

      // Log unpaid present sessions
      if (newStatus === 'Present' && oldStatus !== 'Present' && !isPaid) {
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: 'payments',
          valueInputOption: 'RAW',
          requestBody: { values: [[
            `ATTEND-${session?.id || Date.now()}`,
            session?.client_name || '',
            session?.therapist || '',
            session?.id || '',
            session?.amount || 0,
            'UNPAID',
            session?.session_type || '',
            session?.date || payDate,
            'attendance',
            ''
          ]]}
        })
      }

      // Log cancelled unpaid sessions
      if (newStatus === 'Cancelled' && oldStatus !== 'Cancelled' && !isPaid) {
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: 'payments',
          valueInputOption: 'RAW',
          requestBody: { values: [[
            `CANCEL-${session?.id || Date.now()}`,
            session?.client_name || '',
            session?.therapist || '',
            session?.id || '',
            session?.amount || 0,
            'UNPAID',
            session?.session_type || '',
            session?.date || payDate,
            'cancellation',
            ''
          ]]}
        })
      }

      return Response.json({ success: true })
    }
    
    if (body.action === 'pay') {
      const mop = body.use_credit ? 'Credit' : body.split ? 'Split' : body.mop
      const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://potentialstherapycenter.com/'

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${weekKey}!H${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[body.session_type]] }
      })

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

      // Log to payments sheet FIRST before any credits calls
      const payDate = new Date().toLocaleDateString('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric', month: 'short', day: 'numeric'
      })
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'payments',
        valueInputOption: 'RAW',
        requestBody: { values: [[
          Date.now().toString() + Math.random().toString(36).slice(2),
          body.client_name, body.therapist,
          body.session_id || `${weekKey}-${body.rowIndex}`,
          body.split ? body.split_cash : body.amount, mop,
          body.session_type || 'Regular',
          payDate,
          'session',
          body.reference || '',
          '', // col K — verified_by (empty, set later)
          body.custom_notes || '' // col L — comments/notes
        ]]}
      })

      // Auto-generate policies draft when IE session is paid and present
      const isIE =['OT-IE', 'ST-IE', 'PT-IE', 'SPED IE'].includes(body.session_type)
      const isPresent = session?.status === 'Present'
        if (isIE && isPresent) {
            const clientData = await getSheetData('clients')
            const [, ...clientRows] = clientData
            const client = clientRows.find(r => r && r[1] === body.client_name)
            const psid = client?.[11] || ''
            const policiesMessage = `Hello po! Thank you for completing ${body.client_name}'s evaluation at Potentials Therapy Center. Please expect our secretary to send you our clinic policies shortly. 😊`
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: 'messages',
                valueInputOption: 'RAW',
                requestBody: { values: [[
                    `POL-${Date.now()}`,
                    body.client_name,
                    psid,
                    'policies',
                    policiesMessage,
                    'draft',
                    new Date().toLocaleDateString('en-PH', {timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'}),
                    ''
                ]]}
            })
        }
      
      // Credits calls after — wrapped so they don't block the response
      try {
        if (body.use_credit || body.split) {
          const creditAmount = body.split ? body.split_credit : body.amount
          await fetch(`${baseUrl}/api/credits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'apply_credit', client_name: body.client_name, amount: creditAmount, credit_balance: body.credit_balance })
          })
        }
        await fetch(`${baseUrl}/api/credits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'clear_outstanding', client_name: body.client_name, amount: body.amount })
        })
      } catch (creditError) {
        console.error('Credit update failed:', creditError)
      }

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

      // Add back to outstanding if session is Present or Cancelled
      const unpaidSessions = await getWeekSheet(weekKey)
      const unpaidSession = unpaidSessions.find(s => s.index === body.rowIndex)
      if (unpaidSession && (unpaidSession.status === 'Present' || unpaidSession.status === 'Cancelled')) {
        const rate = unpaidSession.amount || 0
        if (rate > 0) {
          await fetch(`${process.env.NEXT_PUBLIC_URL || 'https://potentialstherapycenter.com/'}/api/credits`, {
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
      await fetch(`${process.env.NEXT_PUBLIC_URL || 'https://potentialstherapycenter.com/'}/api/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'absent_credit', client_name: body.client_name, amount: body.amount })
      })
      // Tag payment as absent_credit instead of deleting
      const payData = await getSheetData('payments')
      const [, ...payRows] = payData
      const payIndex = payRows.findIndex(r => r && r[3] === body.session_id)
      if (payIndex !== -1) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `payments!I${payIndex + 2}`,
          valueInputOption: 'RAW',
          requestBody: { values: [['credit_transfer']] }
        })
      }
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
      return Response.json({ success: true, cancelled: 0 })
    }

    if (body.action === 'therapist_absent') {
      const sheetId = await getSheetId('blocked')
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'blocked', valueInputOption: 'RAW',
        requestBody: { values: [[
          Date.now().toString(),
          body.therapist, body.day,
          '', '',
          'absent', `Absent ${body.week_key}`
        ]]}
      })
      return Response.json({ success: true })
    }

    if (body.action === 'therapist_undo_absent') {
      const blockedData = await getSheetData('blocked')
      const [, ...rows] = blockedData
      const absentIndex = rows.findIndex(r =>
        r && r[1] === body.therapist &&
        r[2] === body.day &&
        r[5] === 'absent' &&
        r[6]?.includes(body.week_key)
      )
      if (absentIndex !== -1) {
        const sheetId = await getSheetId('blocked')
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: { requests: [{ deleteDimension: {
            range: { sheetId, dimension: 'ROWS', startIndex: absentIndex + 1, endIndex: absentIndex + 2 }
          }}]}
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