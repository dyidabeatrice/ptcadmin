import { getSheetData, getSheetsData, listSheetTitles, getGoogleSheets, SPREADSHEET_ID, deleteSheetRows, findRowIndexById, updateRanges } from '../../lib/sheets'

// Finds the row whose first column matches `id` and writes the given cells on it,
// all in one request. writes: [[columns, rowValues], ...] e.g. [['F', [mop]], ['M:N', [cut, center]]]
// Returns false when no row has that id.
async function updateRowById(sheetName, id, writes) {
  const index = await findRowIndexById(sheetName, id)
  if (index === -1) return false
  const sheetRow = index + 2
  await updateRanges(writes.map(([cols, values]) => {
    const [from, to] = cols.split(':')
    const range = to ? `${sheetName}!${from}${sheetRow}:${to}${sheetRow}` : `${sheetName}!${from}${sheetRow}`
    return { range, values: [values] }
  }))
  return true
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)

    if (searchParams.get('action') === 'outstanding') {
      const weekSheets = (await listSheetTitles())
        .filter(t => t.startsWith('week_'))
        .sort()

      // Sessions written off via the "clear outstanding before June" cleanup —
      // still genuinely Unpaid in their week sheet, but excluded from these
      // views since the debt itself was forgiven.
      let writtenOffIds = new Set()
      try {
        const writtenOffData = await getSheetData('written_off_sessions')
        const [, ...writtenOffRows] = writtenOffData
        writtenOffIds = new Set(writtenOffRows.filter(r => r && r[2]).map(r => r[2]))
      } catch {
        // Tab doesn't exist yet or is empty — treat as nothing written off
      }

      // All week tabs in one request (was one request per week, one after another)
      const weekData = await getSheetsData(weekSheets)

      const unpaid = []
      weekSheets.forEach((weekKey, w) => {
        const [, ...rows] = weekData[w]
        rows.forEach((row, index) => {
          if (!(row && row[0] && row[9] === 'Unpaid' && (row[8] === 'Present' || row[8] === 'Cancelled') && !writtenOffIds.has(row[0]))) return
          unpaid.push({
            week_key: weekKey,
            index,
            id: row[0], client_name: row[1], therapist: row[2],
            date: row[3], day: row[4], time_start: row[5], time_end: row[6],
            session_type: row[7] || 'Regular', status: row[8],
            amount: parseFloat(row[11] || 0)
          })
        })
      })

      // Also include outstanding document fees
      const reportData = await getSheetData('reports')
      const [, ...reportRows] = reportData
      reportRows.forEach((row, index) => {
        if (!(row && row[0] && row[8] === 'Outstanding' && parseFloat(row[7] || 0) > 0)) return
        unpaid.push({
          week_key: null,
          index,
          id: row[0], client_name: row[1], therapist: row[2],
          date: row[4], day: '', time_start: '', time_end: '',
          session_type: row[6], status: 'Outstanding',
          amount: parseFloat(row[7] || 0),
          is_document: true
        })
      })

      return Response.json({ success: true, data: unpaid })
    }

    if (searchParams.get('action') === 'pending') {
      const data = await getSheetData('pending_payments')
      const [, ...rows] = data
      const pending = rows
        .filter(r => r && r[0])
        .map(row => ({
          id: row[0], psid: row[1], client_name: row[2],
          drive_file_id: row[3], image_url: row[4],
          received_at: row[5], status: row[6],
          sender_name: row[7] || '', notes: row[8] || ''
        }))
      return Response.json({ success: true, data: pending })
    }

    const data = await getSheetData('payments')
    const [, ...rows] = data
    if (!rows || rows.length === 0) return Response.json({ success: true, data: [] })
    let payments = rows.filter(r => r && r[0]).map((row, i) => ({
      index: i,
      id: row[0], client_name: row[1], therapist: row[2],
      session_id: row[3], amount: row[4], mop: row[5],
      session_type: row[6], date: row[7],
      payment_type: row[8] || 'session',
      reference: row[9] || '',
      verified_by: row[10] || '',
      comments: row[11] || '',
      payment_timeliness: row[14] || '',
      actual_payment_date: row[15] || '',
    }))

    // Optional server-side filters — avoids sending the whole sheet across
    // the wire when the caller only needs one client's or one session's rows.
    const clientFilter = searchParams.get('client')
    const typeFilter = searchParams.get('type')
    const sessionIdFilter = searchParams.get('session_id')
    if (clientFilter) payments = payments.filter(p => p.client_name === clientFilter)
    if (typeFilter) payments = payments.filter(p => p.payment_type === typeFilter)
    if (sessionIdFilter) payments = payments.filter(p => p.session_id === sessionIdFilter)

    return Response.json({ success: true, data: payments })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const sheets = getGoogleSheets()

    if (body.action === 'log') {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'payments', valueInputOption: 'RAW',
        requestBody: { values: [[
          Date.now().toString() + Math.random().toString(36).slice(2),
          body.client_name, body.therapist || '',
          body.session_id, body.amount, body.mop,
          body.session_type, body.date,
          body.payment_type || 'document',
          body.reference || '',
          '',                                    // K: verified_by
          '',                                    // L: comments
          body.custom_cut ?? '',                 // M: custom_cut
          body.custom_center ?? ''               // N: custom_center
        ]]}
      })
      return Response.json({ success: true })
    }

    return Response.json({ success: false, error: 'Unknown action' })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

// payments columns: E amount · F mop · G session_type · J reference · K verified_by
// L comments · M custom_cut · N custom_center · O timeliness · P actual_payment_date
// Q cutoff_date_override · R cutoff_week_key
const notFound = (error = 'Not found') => Response.json({ success: false, error })
const ok = () => Response.json({ success: true })

export async function PATCH(request) {
  try {
    const body = await request.json()

    if (body.action === 'verify') {
      const found = await updateRowById('payments', body.id, [['K', [body.verified_by]]])
      return found ? ok() : notFound('Payment not found')
    }

    if (body.action === 'update_session_type') {
      const found = await updateRowById('payments', body.id, [['G', [body.session_type]]])
      return found ? ok() : notFound('Payment not found')
    }

    if (body.action === 'update_pending_notes') {
      const found = await updateRowById('pending_payments', body.id, [['I', [body.notes || '']]])
      return found ? ok() : notFound()
    }

    if (body.action === 'process_pending') {
      // Succeeds even when the row is already gone
      await updateRowById('pending_payments', body.id, [['G', ['processed']]])
      return ok()
    }

    if (body.action === 'update_mop') {
      const found = await updateRowById('payments', body.id, [
        ['F', [body.mop]],
        ['J', [body.reference || '']]
      ])
      return found ? ok() : notFound()
    }

    if (body.action === 'update_amounts') {
      const found = await updateRowById('payments', body.id, [
        ['E', [body.total || 0]],
        ['M:N', [body.custom_cut || '', body.custom_center || '']]
      ])
      return found ? ok() : notFound()
    }

    if (body.action === 'update_custom_amounts') {
      const found = await updateRowById('payments', body.id, [['M:N', [body.custom_cut ?? '', body.custom_center ?? '']]])
      return found ? ok() : notFound()
    }

    if (body.action === 'update_comments') {
      const found = await updateRowById('payments', body.id, [['L', [body.comments || '']]])
      return found ? ok() : notFound()
    }

    if (body.action === 'update_timeliness') {
      const found = await updateRowById('payments', body.id, [['O:P', [body.payment_timeliness || '', body.actual_payment_date || '']]])
      return found ? ok() : notFound()
    }

    if (body.action === 'update_cutoff_override') {
      const found = await updateRowById('payments', body.id, [['Q:R', [body.cutoff_date_override || '', body.cutoff_week_key || '']]])
      return found ? ok() : notFound()
    }

    return Response.json({ success: false, error: 'Unknown action' })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function DELETE(request) {
  try {
    const { session_id } = await request.json()
    const data = await getSheetData('payments')
    const [, ...rows] = data

    const toDelete = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r && (r[3] === session_id || r[3]?.includes(session_id)))
      .map(({ i }) => i)

    await deleteSheetRows('payments', toDelete)

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}