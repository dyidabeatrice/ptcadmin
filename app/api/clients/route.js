import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'

async function syncToMaster(sheets, clientName, scheduleStr, isInactive) {
  const { getSheetId } = await import('../../lib/sheets')
  const masterData = await getSheetData('masterschedule')
  const [, ...masterRows] = masterData
  const sheetId = await getSheetId('masterschedule')

  const rowsToDelete = []
  masterRows.forEach((row, i) => {
    if (row && row[1] === clientName) rowsToDelete.push(i + 1)
  })

  for (let i = rowsToDelete.length - 1; i >= 0; i--) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ deleteDimension: {
        range: { sheetId, dimension: 'ROWS', startIndex: rowsToDelete[i], endIndex: rowsToDelete[i] + 1 }
      }}]}
    })
  }

  if (!isInactive && scheduleStr) {
    const slots = scheduleStr.split(';').map(s => {
      const [therapist, day, time_start, time_end] = s.split('|')
      return { therapist, day, time_start, time_end }
    }).filter(s => s.therapist && s.day && s.time_start && s.time_end)

    if (slots.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'masterschedule', valueInputOption: 'RAW',
        requestBody: { values: slots.map((s, i) => [
          Date.now().toString() + i + Math.random().toString(36).slice(2),
          clientName, s.therapist, s.day, s.time_start, s.time_end
        ])}
      })
    }
  }
}

export async function GET() {
  try {
    const data = await getSheetData('clients')
    const [, ...rows] = data
    const clients = rows.filter(r => r && r[0]).map((row, i) => ({
      index: i,
      id: row[0],
      name: row[1],
      birthdate: row[2] || '',
      fb_account: row[3] || '',
      phone: row[4] || '',
      address: row[5] || '',
      notes: row[6] || '',
      schedule: row[7] || '',
      status: row[8] || 'active'
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
    const id = Date.now().toString()

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'clients', valueInputOption: 'RAW',
      requestBody: { values: [[
        id,
        body.name || '',
        body.birthdate || '',
        body.fb_account || '',
        body.phone || '',
        body.address || '',
        body.notes || '',
        body.schedule || '',
        'active'
      ]]}
    })

    if (body.schedule) {
      await syncToMaster(sheets, body.name, body.schedule, false)
    }

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json()
    const sheets = getGoogleSheets()
    const sheetRow = body.index + 2

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `clients!B${sheetRow}:I${sheetRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[
        body.name || '',
        body.birthdate || '',
        body.fb_account || '',
        body.phone || '',
        body.address || '',
        body.notes || '',
        body.schedule || '',
        body.status || 'active'
      ]]}
    })

    await syncToMaster(sheets, body.name, body.schedule, body.status === 'inactive')

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}