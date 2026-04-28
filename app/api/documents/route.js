import { getSheetData, getSheetId, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
})

async function updateClientOutstanding(clientName, delta) {
  const sheets = getGoogleSheets()
  const data = await getSheetData('clients')
  const [, ...rows] = data
  const index = rows.findIndex(r => r && r[1] === clientName)
  if (index === -1) return
  const current = parseFloat(rows[index][10] || 0)
  const newVal = Math.max(0, current + delta)
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `clients!K${index + 2}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[newVal]] }
  })
}

async function sendTherapistEmail(therapistEmail, therapistName, clientName, docType, deadline, notes) {
  if (!therapistEmail) return
  await transporter.sendMail({
    from: `Potentials Therapy Center <${process.env.GMAIL_USER}>`,
    to: therapistEmail,
    subject: `Document Request — ${docType} for ${clientName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0f4c81; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">Document Request</h2>
        </div>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
          <p>Hi ${therapistName},</p>
          <p>A document request has been logged for your client:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px; color: #666; width: 40%;">Client</td><td style="padding: 8px; font-weight: 500;">${clientName}</td></tr>
            <tr style="background: white;"><td style="padding: 8px; color: #666;">Document type</td><td style="padding: 8px; font-weight: 500;">${docType}</td></tr>
            <tr><td style="padding: 8px; color: #666;">Deadline</td><td style="padding: 8px; font-weight: 500; color: #E24B4A;">${deadline}</td></tr>
            ${notes ? `<tr style="background: white;"><td style="padding: 8px; color: #666;">Notes</td><td style="padding: 8px;">${notes}</td></tr>` : ''}
          </table>
          <p style="color: #666; font-size: 13px;">Please prepare this document by the deadline. If you have any questions, please contact the clinic secretary.</p>
          <p style="color: #666; font-size: 13px; margin-top: 20px;">— Potentials Therapy Center</p>
        </div>
      </div>
    `
  })
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const data = await getSheetData('reports')
    const [, ...rows] = data
    if (!rows || rows.length === 0) return Response.json({ success: true, data: [] })
    const reports = rows.filter(r => r && r[0]).map((row, i) => ({
      index: i,
      id: row[0], client_name: row[1], therapist: row[2],
      email: row[3] || '', request_date: row[4] || '',
      deadline: row[5] || '', doc_type: row[6] || '',
      amount: parseFloat(row[7] || 0), status: row[8] || 'Outstanding',
      notes: row[9] || '', email_sent: row[10] === 'true'
    }))
    return Response.json({ success: true, data: reports })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const sheets = getGoogleSheets()

    if (body.action === 'add') {
      const id = Date.now().toString()
      const requestDate = new Date().toLocaleDateString('en-PH', {
        timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric'
      })

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'reports', valueInputOption: 'RAW',
        requestBody: { values: [[
          id, body.client_name, body.therapist,
          body.email || '', requestDate, body.deadline,
          body.doc_type, body.amount || 0,
          'Outstanding', body.notes || ''
        ]]}
      })

      // Add to outstanding if has fee
      if (body.amount > 0) {
        await fetch(`${process.env.NEXT_PUBLIC_URL}/api/credits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add_outstanding',
            client_name: body.client_name,
            amount: body.amount
          })
        })
      }

      return Response.json({ success: true, id })
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
    const sheetRow = body.index + 2

    if (body.action === 'status') {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `reports!I${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[body.status]] }
      })
      return Response.json({ success: true })
    }

    if (body.action === 'pay') {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `reports!H${sheetRow}:I${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[body.amount, 'Ready for Release']] }
      })
      if (body.amount > 0) {
        await fetch(`${process.env.NEXT_PUBLIC_URL}/api/credits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'clear_outstanding',
            client_name: body.client_name,
            amount: body.amount
          })
        })
      }
      return Response.json({ success: true })
    }

    if (body.action === 'send_email') {
      const data = await getSheetData('reports')
      const [, ...rows] = data
      const row = rows[body.index]
      if (!row) return Response.json({ success: false, error: 'Row not found' })

      try {
        await sendTherapistEmail(
          body.therapist_email,
          row[2],
          row[1],
          row[6],
          row[5],
          row[9]
        )
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `reports!K${sheetRow}`,
          valueInputOption: 'RAW',
          requestBody: { values: [['true']] }
        })
        return Response.json({ success: true })
      } catch (err) {
        return Response.json({ success: false, error: err.message })
      }
    }

    return Response.json({ success: false, error: 'Unknown action' })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function DELETE(request) {
  try {
    const { index } = await request.json()
    const sheets = getGoogleSheets()
    const sheetId = await getSheetId('reports')
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
