import { getSheetData, getSheetId, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'

async function syncClientSchedule(clientName, sheets) {
  const masterData = await getSheetData('masterschedule')
  const [, ...masterRows] = masterData
  const clientSlots = masterRows.filter(r => r && r[1] === clientName)
  
  const scheduleString = clientSlots
    .map(r => `${r[2]}|${r[3]}|${r[4]}|${r[5]}`)
    .join(';')

  const clientData = await getSheetData('clients')
  const [, ...clientRows] = clientData
  const clientIndex = clientRows.findIndex(r => r && r[1] === clientName)
  
  if (clientIndex === -1) return
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `clients!H${clientIndex + 2}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[scheduleString]] }
  })
}

export async function GET() {
  try {
    const data = await getSheetData('masterschedule')
    const [, ...rows] = data
    const master = rows.filter(r => r && r[0]).map((row, i) => ({
      index: i,
      id: row[0],
      client_name: row[1],
      therapist: row[2],
      day: row[3],
      time_start: row[4],
      time_end: row[5]
    }))
    return Response.json({ success: true, data: master })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const sheets = getGoogleSheets()
    const id = Date.now().toString()

    // If new client, create them first
    if (body.is_new_client && body.client_name) {
      const clientData = await getSheetData('clients')
      const [, ...clientRows] = clientData
      const exists = clientRows.some(r => r && r[1] === body.client_name)
      if (!exists) {
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: 'clients',
          valueInputOption: 'RAW',
          requestBody: { values: [[
            Date.now().toString(), // A: id
            body.client_name,      // B: name
            '',                    // C: birthdate
            '',                    // D: fb_account
            '',                    // E: phone
            '',                    // F: address
            '',                    // G: notes
            '',                    // H: schedule
            'active',              // I: status
            0,                     // J: credit_balance
            0,                     // K: outstanding_balance
            '',                    // L: psid
          ]]}
        })
      }
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'masterschedule',
      valueInputOption: 'RAW',
      requestBody: { values: [[
        id,
        body.client_name,
        body.therapist,
        body.day,
        body.time_start,
        body.time_end
      ]]}
    })

    await syncClientSchedule(body.client_name, sheets)
    return Response.json({ success: true, id })
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
      range: `masterschedule!B${sheetRow}:F${sheetRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[
        body.client_name,
        body.therapist,
        body.day,
        body.time_start,
        body.time_end
      ]]}
    })

    await syncClientSchedule(body.client_name, sheets)
    // If therapist or day changed, also sync old client name
    if (body.old_client_name && body.old_client_name !== body.client_name) {
      await syncClientSchedule(body.old_client_name, sheets)
    }
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json()
    const sheets = getGoogleSheets()
    const sheetId = await getSheetId('masterschedule')

    // Get client name before deleting
    const masterData = await getSheetData('masterschedule')
    const [, ...rows] = masterData
    const row = rows[body.index]
    const clientName = row?.[1]

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ deleteDimension: {
        range: { sheetId, dimension: 'ROWS', startIndex: body.index + 1, endIndex: body.index + 2 }
      }}]}
    })

    if (clientName) await syncClientSchedule(clientName, sheets)
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}