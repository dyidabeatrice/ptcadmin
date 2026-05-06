import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../../lib/sheets'
import { google } from 'googleapis'

async function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.file']
  })
  return google.drive({ version: 'v3', auth })
}

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const reportId = formData.get('report_id')
    const reportIndex = formData.get('report_index')

    if (!file || !reportId) return Response.json({ success: false, error: 'Missing file or report_id' })
    if (file.type !== 'application/pdf') return Response.json({ success: false, error: 'Only PDF files are allowed' })

    const drive = await getDriveClient()
    const folderId = process.env.GDRIVE_REPORTS_FOLDER_ID

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    const { Readable } = await import('stream')
    const stream = Readable.from(buffer)

    // Upload to Google Drive
    const driveRes = await drive.files.create({
      requestBody: {
        name: `${reportId}_${file.name}`,
        parents: [folderId],
      },
      media: {
        mimeType: 'application/pdf',
        body: stream
      },
      fields: 'id, webViewLink'
    })

    const fileUrl = driveRes.data.webViewLink
    const fileId = driveRes.data.id

    // Make file readable by anyone with link
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' }
    })

    // Update reports sheet with file_url and uploaded_at
    const sheets = getGoogleSheets()
    const data = await getSheetData('reports')
    const [, ...rows] = data
    const index = rows.findIndex(r => r && r[0] === reportId)
    if (index === -1) return Response.json({ success: false, error: 'Report not found' })

    const now = new Date().toLocaleDateString('en-US', {
      timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric'
    })

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `reports!M${index + 2}:N${index + 2}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[fileUrl, now]] }
    })

    // Check if client has paid — if yes, email parent
    const reportRow = rows[index]
    const clientName = reportRow[1]
    const docType = reportRow[6]
    const parentEmail = reportRow[3]
    const delivery = reportRow[11] || 'soft'

    if (delivery === 'soft' && parentEmail) {
      // Check payment status
      const payRes = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/payments`)
      const payJson = await payRes.json()
      if (payJson.success) {
        const paid = payJson.data.find(p => p.session_id === `DOC-${reportId}` && p.payment_type === 'document')
        if (paid) {
          // Send email to parent with file link
          await fetch(`${process.env.NEXT_PUBLIC_URL}/api/documents/notify-parent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reportId, clientName, docType, parentEmail, fileUrl })
          })
        }
      }
    }

    return Response.json({ success: true, file_url: fileUrl })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}