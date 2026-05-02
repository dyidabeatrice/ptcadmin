import { getSheetData, getSheetId, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'

async function syncToMaster(sheets, clientName, scheduleStr, isInactive) {
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

function similarity(a, b) {
  a = a.toLowerCase().trim()
  b = b.toLowerCase().trim()
  if (a === b) return 1
  const longer = a.length > b.length ? a : b
  const shorter = a.length > b.length ? b : a
  if (longer.length === 0) return 1
  const costs = []
  for (let i = 0; i <= shorter.length; i++) costs[i] = i
  for (let i = 1; i <= longer.length; i++) {
    let prev = i
    for (let j = 1; j <= shorter.length; j++) {
      const val = longer[i-1] === shorter[j-1] ? costs[j-1] : Math.min(costs[j-1], costs[j], prev) + 1
      costs[j-1] = prev
      prev = val
    }
    costs[shorter.length] = prev
  }
  return (longer.length - costs[shorter.length]) / longer.length
}

export async function GET() {
  try {
    const data = await getSheetData('clients')
    const [, ...rows] = data
    const clients = rows.filter(r => r && r[0]).map((row, i) => ({
      index: i,
      id: row[0], name: row[1], birthdate: row[2] || '',
      fb_account: row[3] || '', phone: row[4] || '',
      address: row[5] || '', notes: row[6] || '',
      schedule: row[7] || '', status: row[8] || 'active',
      credit_balance: parseFloat(row[9] || 0),
      outstanding_balance: parseFloat(row[10] || 0),
      psid: row[11] || ''
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

    if (body.action === 'check_duplicate') {
      const data = await getSheetData('clients')
      const [, ...rows] = data
      const existing = rows.filter(r => r && r[0]).map(r => ({ name: r[1], schedule: r[7] || '' }))
      const name = body.name?.trim()
      const exactMatch = existing.find(c => c.name.toLowerCase() === name.toLowerCase())
      const similarMatches = existing
        .filter(c => c.name.toLowerCase() !== name.toLowerCase())
        .filter(c => similarity(c.name, name) >= 0.7)
        .map(c => ({ name: c.name, similarity: Math.round(similarity(c.name, name) * 100) }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3);
      return Response.json({ success: true, exact_match: exactMatch || null, similar_matches: similarMatches })
    }

    if (body.action === 'merge') {
      const { keep_id, keep_index, delete_index, delete_name, merged } = body

      // Step 1 — delete duplicate FIRST before index shifts
      const clientSheetId = await getSheetId('clients')
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [{ deleteDimension: {
          range: { sheetId: clientSheetId, dimension: 'ROWS', startIndex: delete_index + 1, endIndex: delete_index + 2 }
        }}]}
      })

      // Step 2 — re-fetch to get correct index after deletion
      const freshData = await getSheetData('clients')
      const [, ...freshRows] = freshData
      const newKeepIndex = freshRows.findIndex(r => r && r[0] === keep_id)
      const keepRow = (newKeepIndex !== -1 ? newKeepIndex : 
        // if deleted row was before keeper, keeper shifted up by 1
        delete_index < keep_index ? keep_index : keep_index
      ) + 2

      // Step 3 — update keeper record
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `clients!B${keepRow}:K${keepRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[
          merged.name,
          merged.birthdate || '',
          merged.fb_account || '',
          merged.phone || '',
          merged.address || '',
          merged.notes || '',
          merged.schedule || '',
          'active',
          merged.credit_balance || 0,
          merged.outstanding_balance || 0
        ]]}
      })

      // Step 4 — clear ALL master entries for both names
      const masterData = await getSheetData('masterschedule')
      const [, ...masterRows] = masterData
      const masterSheetId = await getSheetId('masterschedule')

      const masterRowsToDelete = []
      masterRows.forEach((row, i) => {
        if (row && (row[1] === merged.name || row[1] === delete_name)) {
          masterRowsToDelete.push(i + 1)
        }
      })

      for (let i = masterRowsToDelete.length - 1; i >= 0; i--) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: { requests: [{ deleteDimension: {
            range: { sheetId: masterSheetId, dimension: 'ROWS', startIndex: masterRowsToDelete[i], endIndex: masterRowsToDelete[i] + 1 }
          }}]}
        })
      }

      // Step 5 — add merged schedule to master
      if (merged.schedule) {
        const slots = merged.schedule.split(';').map(s => {
          const [therapist, day, time_start, time_end] = s.split('|')
          return { therapist, day, time_start, time_end }
        }).filter(s => s.therapist && s.day && s.time_start && s.time_end)

        if (slots.length > 0) {
          await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'masterschedule', valueInputOption: 'RAW',
            requestBody: { values: slots.map((s, idx) => [
              Date.now().toString() + idx + Math.random().toString(36).slice(2),
              merged.name, s.therapist, s.day, s.time_start, s.time_end
            ])}
          })
        }
      }

      // Step 6 — update week sheets
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
      const weekSheets = spreadsheet.data.sheets
        .map(s => s.properties.title)
        .filter(t => t.startsWith('week_'))

      for (const weekKey of weekSheets) {
        const weekData = await getSheetData(weekKey)
        const [, ...weekRows] = weekData
        for (let i = 0; i < weekRows.length; i++) {
          if (weekRows[i] && weekRows[i][1] === delete_name) {
            await sheets.spreadsheets.values.update({
              spreadsheetId: SPREADSHEET_ID,
              range: `${weekKey}!B${i + 2}`,
              valueInputOption: 'RAW',
              requestBody: { values: [[merged.name]] }
            })
          }
        }
      }

      // Step 7 — update payments sheet
      const payData = await getSheetData('payments')
      const [, ...payRows] = payData
      for (let i = 0; i < payRows.length; i++) {
        if (payRows[i] && payRows[i][1] === delete_name) {
          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `payments!B${i + 2}`,
            valueInputOption: 'RAW',
            requestBody: { values: [[merged.name]] }
          })
        }
      }

      return Response.json({ success: true })
    }

    // Regular add
    const id = Date.now().toString()
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'clients', valueInputOption: 'RAW',
      requestBody: { values: [[
        id, body.name || '',
        body.birthdate || '',
        body.fb_account || '',
        body.phone || '',
        body.address || '',
        body.notes || '',
        body.schedule || '',
        'active', 0, 0
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
      range: `clients!B${sheetRow}:K${sheetRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[
        body.name || '',
        body.birthdate || '',
        body.fb_account || '',
        body.phone || '',
        body.address || '',
        body.notes || '',
        body.schedule || '',
        body.status || 'active',
        body.credit_balance || 0,
        body.outstanding_balance || 0
      ]]}
    })

    if (body.status === 'inactive') {
      await syncToMaster(sheets, body.name, '', true)
    }
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function DELETE(request) {
  try {
    const { index } = await request.json()
    const sheets = getGoogleSheets()
    const sheetId = await getSheetId('clients')
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ deleteDimension: {
        range: { sheetId, dimension: 'ROWS', startIndex: index + 1, endIndex: index + 2 }
      }}]}
    })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}