import { getSheetData, getGoogleSheets, SPREADSHEET_ID, deleteSheetRow, findRowIndexById } from '../../lib/sheets'
import { formatPHDateTime } from '../../lib/dates'

export async function GET() {
  try {
    const data = await getSheetData('old_balances')
    const [, ...rows] = data
    const entries = rows.filter(r => r && r[0]).map(row => ({
      id: row[0],
      name: row[1] || '',
      amount: parseFloat(row[2] || 0),
      breakdown: row[3] || '',
      updates: (row[4] || '').split('\n').map(s => s.trim()).filter(Boolean),
      created_at: row[5] || ''
    }))
    return Response.json({ success: true, data: entries })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const name = (body.name || '').trim()
    const amount = Number(body.amount)
    if (!name) return Response.json({ success: false, error: 'Name is required' })
    if (!Number.isFinite(amount) || amount < 0) return Response.json({ success: false, error: 'Please enter a valid amount' })

    const sheets = getGoogleSheets()
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'old_balances',
      valueInputOption: 'RAW',
      requestBody: { values: [[
        Date.now().toString() + Math.random().toString(36).slice(2),
        name, amount, (body.breakdown || '').trim(), '', formatPHDateTime()
      ]]}
    })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json()
    const data = await getSheetData('old_balances')
    const [, ...rows] = data
    const idx = rows.findIndex(r => r && r[0] === body.id)
    if (idx === -1) return Response.json({ success: false, error: 'Not found' })
    const sheetRow = idx + 2
    const sheets = getGoogleSheets()

    if (body.action === 'add_update') {
      const text = (body.text || '').trim()
      if (!text) return Response.json({ success: false, error: 'Update is empty' })
      // Date is stamped here, in Manila time, and the new line is added on top of
      // whatever is in the sheet right now, so two people adding updates can't overwrite each other.
      const dateLabel = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' })
      const existing = rows[idx][4] || ''
      const line = `${dateLabel} — ${text}`
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `old_balances!E${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[existing ? `${line}\n${existing}` : line]] }
      })
      return Response.json({ success: true })
    }

    if (body.action === 'edit') {
      const name = (body.name || '').trim()
      const amount = Number(body.amount)
      if (!name) return Response.json({ success: false, error: 'Name is required' })
      if (!Number.isFinite(amount) || amount < 0) return Response.json({ success: false, error: 'Please enter a valid amount' })
      const updates = (body.updates || []).map(s => String(s).trim()).filter(Boolean).join('\n')
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `old_balances!B${sheetRow}:E${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[name, amount, (body.breakdown || '').trim(), updates]] }
      })
      return Response.json({ success: true })
    }

    return Response.json({ success: false, error: 'Unknown action' })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json()
    const rowIndex = await findRowIndexById('old_balances', id)
    if (rowIndex === -1) return Response.json({ success: false, error: 'Not found' })
    await deleteSheetRow('old_balances', rowIndex)
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}