import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../../lib/sheets'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
})

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const reportId = formData.get('report_id')

    if (!file || !reportId) return Response.json({ success: false, error: 'Missing file or report_id' })
    if (file.type !== 'application/pdf') return Response.json({ success: false, error: 'Only PDF files are allowed' })

    // Get report details
    const data = await getSheetData('reports')
    const [, ...rows] = data
    const index = rows.findIndex(r => r && r[0] === reportId)
    if (index === -1) return Response.json({ success: false, error: 'Report not found' })

    const reportRow = rows[index]
    const clientName = reportRow[1]
    const therapistName = reportRow[2]
    const parentEmail = reportRow[3]
    const docType = reportRow[6]
    const delivery = reportRow[11] || 'soft'

    // Convert file to buffer for email attachment
    const buffer = Buffer.from(await file.arrayBuffer())

    const now = new Date().toLocaleDateString('en-US', {
      timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric'
    })

    // Mark as uploaded in sheet
    const sheets = getGoogleSheets()
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `reports!M${index + 2}:N${index + 2}`,
      valueInputOption: 'RAW',
      requestBody: { values: [['uploaded', now]] }
    })

    // Update status to Completed
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `reports!I${index + 2}`,
      valueInputOption: 'RAW',
      requestBody: { values: [['Completed']] }
    })

    // IE Report — send to clinic Gmail
    if (docType === 'IE Report') {
      await transporter.sendMail({
        from: `Potentials Therapy Center <${process.env.GMAIL_USER}>`,
        to: process.env.GMAIL_USER,
        subject: `IE Report Submitted — ${clientName} by ${therapistName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0f4c81; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="color: white; margin: 0;">IE Report Submitted</h2>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
              <p><strong>${therapistName}</strong> has submitted the IE Report for <strong>${clientName}</strong>.</p>
              <p style="color: #666; font-size: 13px;">Uploaded: ${now}</p>
              <p style="color: #666; font-size: 13px; margin-top: 20px;">— Potentials Therapy Center</p>
            </div>
          </div>
        `,
        attachments: [{
          filename: `${clientName}_IE_Report_${now}.pdf`,
          content: buffer,
          contentType: 'application/pdf'
        }]
      })

      // Log IE report payment entry for therapist ledger
      await fetch(`${process.env.NEXT_PUBLIC_URL}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log',
          client_name: clientName,
          therapist: therapistName,
          session_id: `IE-REPORT-${Date.now()}`,
          amount: 0,
          mop: 'N/A',
          session_type: 'IE REPORT',
          date: now,
          payment_type: 'ie_report',
          reference: ''
        })
      })

      return Response.json({ success: true })
    }

    if (delivery === 'soft' && parentEmail) {
      // Send email to parent with PDF attached
      await transporter.sendMail({
        from: `Potentials Therapy Center <${process.env.GMAIL_USER}>`,
        to: parentEmail,
        subject: `${docType} — ${clientName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0f4c81; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="color: white; margin: 0;">Document Ready</h2>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
              <p>Hello!</p>
              <p>Please find attached the <strong>${docType}</strong> for <strong>${clientName}</strong> prepared by <strong>${therapistName}</strong>.</p>
              <p style="color: #666; font-size: 13px; margin-top: 20px;">— Potentials Therapy Center</p>
            </div>
          </div>
        `,
        attachments: [{
          filename: `${clientName}_${docType}_${now}.pdf`,
          content: buffer,
          contentType: 'application/pdf'
        }]
      })
    } else if (delivery === 'hard') {
      // Send to secretary for printing
      const secretaryEmail = process.env.SECRETARY_PRINT_EMAIL
      if (secretaryEmail) {
        await transporter.sendMail({
          from: `Potentials Therapy Center <${process.env.GMAIL_USER}>`,
          to: secretaryEmail,
          subject: `[PRINT] ${docType} — ${clientName}`,
          html: `
            <div style="font-family: sans-serif;">
              <p>Please print the attached document for <strong>${clientName}</strong>.</p>
              <p>Document type: <strong>${docType}</strong></p>
              <p>Prepared by: <strong>${therapistName}</strong></p>
            </div>
          `,
          attachments: [{
            filename: `${clientName}_${docType}_${now}.pdf`,
            content: buffer,
            contentType: 'application/pdf'
          }]
        })
      }
    }

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}