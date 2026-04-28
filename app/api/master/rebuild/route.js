import { getSheetData, getSheetId, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'

export async function POST() {
  try {
    const sheets = getGoogleSheets()

    const clientData = await getSheetData('clients')
    const [, ...clientRows] = clientData

    const activeClients = clientRows.filter(r => r && r[0] && r[8] !== 'inactive')

    const newRows = []
    activeClients.forEach(row => {
      const name = row[1]
      const scheduleStr = row[7] || ''
      if (!scheduleStr) return

      const slots = scheduleStr.split(';').map(s => {
        const [therapist, day, time_start, time_end] = s.split('|')
        return { therapist, day, time_start, time_end }
      }).filter(s => s.therapist && s.day && s.time_start && s.time_end)

      slots.forEach((s, i) => {
        newRows.push([
          Date.now().toString() + Math.random().toString(36).slice(2) + i,
          name, s.therapist, s.day, s.time_start, s.time_end
        ])
      })
    })

    const sheetId = await getSheetId('masterschedule')

    // Clear all data except header
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          updateCells: {
            range: {
              sheetId,
              startRowIndex: 1
            },
            fields: 'userEnteredValue'
          }
        }]
      }
    })

    // Write new rows
    if (newRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'masterschedule',
        valueInputOption: 'RAW',
        requestBody: { values: newRows }
      })
    }

    return Response.json({ success: true, rebuilt: newRows.length })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}