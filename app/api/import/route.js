import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'

export async function GET() {
  try {
    const data = await getSheetData('import')
    const [, ...rows] = data
    if (!rows || rows.length === 0) return Response.json({ success: true, data: [] })
    const imports = rows.filter(r => r && r[0]).map((row, i) => ({
      index: i,
      client_name: row[0], therapist: row[1],
      day: row[2], time_start: row[3], time_end: row[4]
    }))
    return Response.json({ success: true, data: imports })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function POST() {
  try {
    const sheets = getGoogleSheets()

    const [importData, clientData, masterData] = await Promise.all([
      getSheetData('import'),
      getSheetData('clients'),
      getSheetData('masterschedule')
    ])

    const [, ...importRows] = importData
    const [, ...clientRows] = clientData
    const [, ...masterRows] = masterData

    const validRows = importRows.filter(r => r && r[0] && r[1] && r[2] && r[3] && r[4])

    const existingClients = new Set(clientRows.filter(r => r && r[0]).map(r => r[1]?.toLowerCase()))
    const existingMasterKeys = new Set(
      masterRows.filter(r => r && r[0]).map(r => `${r[1]}|${r[2]}|${r[3]}|${r[4]}`.toLowerCase())
    )

    const newClients = []
    const newMasterRows = []
    const skippedClients = []
    const skippedMaster = []

    const clientSchedules = {}
    validRows.forEach(row => {
      const name = row[0]?.trim()
      const therapist = row[1]?.trim()
      const day = row[2]?.trim()
      const time_start = row[3]?.trim()
      const time_end = row[4]?.trim()
      if (!clientSchedules[name]) clientSchedules[name] = []
      clientSchedules[name].push({ therapist, day, time_start, time_end })
    })

    for (const [name, slots] of Object.entries(clientSchedules)) {
      if (existingClients.has(name.toLowerCase())) {
        skippedClients.push(name)
      } else {
        const scheduleStr = slots.map(s => `${s.therapist}|${s.day}|${s.time_start}|${s.time_end}`).join(';')
        newClients.push([
          Date.now().toString() + Math.random().toString(36).slice(2),
          name, '', '', '', '', '', scheduleStr, '', 'active'
        ])
        existingClients.add(name.toLowerCase())
      }

      for (const slot of slots) {
        const key = `${name}|${slot.therapist}|${slot.day}|${slot.time_start}`.toLowerCase()
        if (existingMasterKeys.has(key)) {
          skippedMaster.push(`${name} - ${slot.therapist} ${slot.day} ${slot.time_start}`)
        } else {
          newMasterRows.push([
            Date.now().toString() + Math.random().toString(36).slice(2),
            name, slot.therapist, slot.day, slot.time_start, slot.time_end
          ])
          existingMasterKeys.add(key)
        }
      }
    }

    if (newClients.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'clients', valueInputOption: 'RAW',
        requestBody: { values: newClients }
      })
    }

    if (newMasterRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'masterschedule', valueInputOption: 'RAW',
        requestBody: { values: newMasterRows }
      })
    }

    return Response.json({
      success: true,
      imported_clients: newClients.length,
      imported_slots: newMasterRows.length,
      skipped_clients: skippedClients.length,
      skipped_slots: skippedMaster.length,
      skipped_client_names: skippedClients
    })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}