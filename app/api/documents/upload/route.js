import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../../lib/sheets'
import { formatPHDate } from '../../../lib/dates'
import { buildEmailHTML, sendClinicEmail } from '../../../lib/email'
import { getTherapistFromCookie } from '../../../lib/auth'

export async function POST(request) {
  try {
    const loggedInTherapist = await getTherapistFromCookie()
    if (!loggedInTherapist) {
      return Response.json({ success: false, error: 'You must be logged in as a therapist to upload reports.' })
    }

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

    if (therapistName !== loggedInTherapist) {
      return Response.json({ success: false, error: 'This report is not assigned to you, so you cannot upload it.' })
    }
    const parentEmail = reportRow[3]
    const docType = reportRow[6]
    const delivery = reportRow[11] || 'soft'
    const therapistData = await getSheetData('therapists')
    const [, ...therapistRows] = therapistData
    const therapistRow = therapistRows.find(r => r && r[1] === therapistName)
    const therapistEmail = therapistRow?.[7] || ''
    const therapistSpecialty = therapistRow?.[2] || 'therapy'

    // Convert file to buffer for email attachment
    const buffer = Buffer.from(await file.arrayBuffer())

    const now = formatPHDate()

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
    const secretaryEmail = process.env.SECRETARY_PRINT_EMAIL
    if (docType === 'IE Report') {
      await sendClinicEmail({
        to: [process.env.GMAIL_USER, secretaryEmail].filter(Boolean).join(', '),
        bcc: therapistEmail,
        subject: `IE Report Submitted — ${clientName} by ${therapistName}`,
        html: buildEmailHTML({
          title: 'IE Report Submitted',
          bodyHTML: `
            <p><strong>${therapistName}</strong> has submitted the IE Report for <strong>${clientName}</strong>.</p>
            <p style="color: #666; font-size: 13px;">Uploaded: ${now}</p>
            <p style="color: #666; font-size: 13px; margin-top: 20px;">— Potentials Therapy Center</p>
          `
        }),
        attachments: [{
          filename: `${clientName}_IE_Report_${now}.pdf`,
          content: buffer,
          contentType: 'application/pdf'
        }]
      })

        // Check if submission is within deadline
        const deadlineStr = reportRow[5]
        const isWithinDeadline = deadlineStr ? new Date() <= new Date(deadlineStr) : true

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
            reference: '',
            custom_cut: isWithinDeadline ? null : 0,
            custom_center: isWithinDeadline ? null : 800
          })
        })

        return Response.json({ success: true })
    }

      const deliveryTypes = (delivery || 'soft').split(',')

if (deliveryTypes.includes('soft') && parentEmail) {
        const docMonth = new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'long', year: 'numeric' })
        await sendClinicEmail({
          to: parentEmail.split(',').map(e => e.trim()).join(', '),
          bcc: therapistEmail,
          subject: `${clientName} ${therapistSpecialty} ${docType} (${docMonth})`,
          html: buildEmailHTML({
            title: 'Document Ready',
            bodyHTML: `
              <p>Good day!</p>
              <p>Attached are your child's ${therapistSpecialty} ${docType} prepared by your child's assigned therapist.</p>
              <p>If you have any questions or concerns regarding the report, please do not hesitate to let us know.</p>
              <p>Thank you!</p>
              <p>Best regards,<br/>PTC Admin</p>
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
              <p style="font-size: 13px; color: #555;">
                <strong>POTENTIALS THERAPY CENTER</strong><br/>
                📍 Unit 2A, MIC Building, Bukidnon Street, Brgy. Ramon Magsaysay, Bago Bantay, Quezon City (Near SM North Annex)<br/>
                📞 09752419349<br/>
                📧 potentialstherapycenter@gmail.com<br/>
                🖥️ <a href="https://facebook.com/potentialstherapycenter" style="color: #0f4c81;">facebook.com/potentialstherapycenter</a><br/>
                🌐 <a href="https://potentialstherapycenter.com" style="color: #0f4c81;">potentialstherapycenter.com</a>
              </p>
            `
          }),
          attachments: [{
            filename: `${clientName}_${docType}_${now}.pdf`,
            content: buffer,
            contentType: 'application/pdf'
          }]
        })
      }
    if (deliveryTypes.includes('hard')) {
      // Send to secretary for printing
      const secretaryEmail = process.env.SECRETARY_PRINT_EMAIL
      if (secretaryEmail) {
        await sendClinicEmail({
          to: secretaryEmail,
          subject: `[PRINT] ${docType} — ${clientName}`,
          html: buildEmailHTML({
            title: 'Print Request',
            bodyHTML: `
              <p>Please print the attached document for <strong>${clientName}</strong>.</p>
              <p>Document type: <strong>${docType}</strong></p>
              <p>Prepared by: <strong>T. ${therapistName}</strong></p>
            `
          }),
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