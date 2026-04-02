import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'

async function getClientRow(clientName) {
  const data = await getSheetData('clients')
  const [, ...rows] = data
  const index = rows.findIndex(r => r && r[1] === clientName)
  if (index === -1) return null
  return { index, row: rows[index] }
}

async function updateClientBalances(clientName, creditDelta, outstandingDelta) {
  const sheets = getGoogleSheets()
  const result = await getClientRow(clientName)
  if (!result) return

  const { index, row } = result
  const currentCredit = parseFloat(row[9] || 0)
  const currentOutstanding = parseFloat(row[10] || 0)
  const newCredit = Math.max(0, currentCredit + creditDelta)
  const newOutstanding = Math.max(0, currentOutstanding + outstandingDelta)
  const sheetRow = index + 2

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `clients!J${sheetRow}:K${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[newCredit, newOutstanding]] }
  })

  return { newCredit, newOutstanding }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientName = searchParams.get('client')

    if (clientName) {
      const result = await getClientRow(clientName)
      if (!result) return Response.json({ success: false, error: 'Client not found' })
      return Response.json({
        success: true,
        credit_balance: parseFloat(result.row[9] || 0),
        outstanding_balance: parseFloat(result.row[10] || 0)
      })
    }

    const data = await getSheetData('clients')
    const [, ...rows] = data
    const clients = rows
      .filter(r => r && r[0] && r[8] !== 'inactive')
      .filter(r => parseFloat(r[9] || 0) > 0 || parseFloat(r[10] || 0) > 0)
      .map((row, i) => ({
        index: i,
        name: row[1],
        credit_balance: parseFloat(row[9] || 0),
        outstanding_balance: parseFloat(row[10] || 0)
      }))

    return Response.json({ success: true, data: clients })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const sheets = getGoogleSheets()

    if (body.action === 'add_credit') {
      const result = await updateClientBalances(body.client_name, body.amount, 0)
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'payments',
        valueInputOption: 'RAW',
        requestBody: { values: [[
          Date.now().toString(),
          body.client_name, '',
          'ADVANCE-' + Date.now(),
          body.amount, body.mop,
          'Advance', body.date,
          'advance'
        ]]}
      })
      return Response.json({ success: true, ...result })
    }

    if (body.action === 'apply_credit') {
      const result = await updateClientBalances(body.client_name, -body.amount, -body.amount)
      return Response.json({ success: true, ...result })
    }

    if (body.action === 'add_outstanding') {
      const result = await updateClientBalances(body.client_name, 0, body.amount)
      return Response.json({ success: true, ...result })
    }

    if (body.action === 'clear_outstanding') {
      const result = await updateClientBalances(body.client_name, 0, -body.amount)
      return Response.json({ success: true, ...result })
    }

    if (body.action === 'absent_credit') {
      const result = await updateClientBalances(body.client_name, body.amount, 0)
      return Response.json({ success: true, ...result })
    }

    if (body.action === 'refund') {
      const result = await updateClientBalances(body.client_name, -body.amount, 0)
      return Response.json({ success: true, ...result })
    }

    return Response.json({ success: false, error: 'Unknown action' })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}