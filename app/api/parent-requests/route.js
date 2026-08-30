import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'
import { buildEmailHTML, sendClinicEmail } from '../../lib/email'

export async function GET() {
  try {
    const data = await getSheetData('parent_accounts')
    const [, ...rows] = data
    const accounts = rows.filter(r => r && r[0]).map((row, i) => ({
      index: i,
      id: row[0],
      email: row[1],
      status: row[3] || 'pending',
      requested_children: row[4] || '',
      linked_clients: row[5] || '',
      created_at: row[6] || '',
      pending_additional_children: row[7] || ''
    }))
    return Response.json({ success: true, data: accounts })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json()
    const sheets = getGoogleSheets()
    const data = await getSheetData('parent_accounts')
    const [, ...rows] = data
    const rowIndex = rows.findIndex(r => r && r[0] === body.id)
    if (rowIndex === -1) return Response.json({ success: false, error: 'Account not found' })
    const sheetRow = rowIndex + 2

    if (body.action === 'approve') {
      const linkedClients = (body.linked_clients || []).join('; ')
      if (!linkedClients) return Response.json({ success: false, error: 'Please link at least one child before approving' })
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `parent_accounts!D${sheetRow}:F${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [['active', rows[rowIndex][4] || '', linkedClients]] }
      })

      const parentEmail = rows[rowIndex][1]
      const loginUrl = `${process.env.NEXT_PUBLIC_URL || 'https://potentialstherapycenter.com'}/parent/login`
      try {
        await sendClinicEmail({
          to: parentEmail,
          subject: 'Your Potentials Therapy Center account is ready',
          html: buildEmailHTML({
            title: 'Account Verified ✓',
            bodyHTML: `
              <p>Good news! Your parent account has been verified and linked to <strong>${linkedClients}</strong>.</p>
              <p>You can now log in to view your child's upcoming and past sessions, attendance, and payment history.</p>
              <p style="margin: 20px 0;"><a href="${loginUrl}" style="color: #0f4c81; font-weight: 500;">Log in to your account →</a></p>
              <p style="color: #666; font-size: 13px; margin-top: 20px;">— Potentials Therapy Center</p>
            `
          })
        })
      } catch (emailError) {
        console.error('Failed to send parent approval email:', emailError.message)
        // Don't fail the whole approval just because the email didn't send
      }

      return Response.json({ success: true })
    }

    if (body.action === 'reject') {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `parent_accounts!D${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [['rejected']] }
      })
      return Response.json({ success: true })
    }

    if (body.action === 'approve_additional') {
      const newClients = (body.linked_clients || []).join('; ')
      if (!newClients) return Response.json({ success: false, error: 'Please link at least one child' })
      const existingLinked = rows[rowIndex][5] || ''
      const combined = existingLinked ? `${existingLinked}; ${newClients}` : newClients
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `parent_accounts!F${sheetRow}:H${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[combined, rows[rowIndex][6] || '', '']] }
      })

      const parentEmail = rows[rowIndex][1]
      const loginUrl = `${process.env.NEXT_PUBLIC_URL || 'https://potentialstherapycenter.com'}/parent/login`
      try {
        await sendClinicEmail({
          to: parentEmail,
          subject: 'A child was added to your Potentials Therapy Center account',
          html: buildEmailHTML({
            title: 'Child Linked ✓',
            bodyHTML: `
              <p><strong>${newClients}</strong> has been linked to your account.</p>
              <p>Log in to view their schedule alongside your other children.</p>
              <p style="margin: 20px 0;"><a href="${loginUrl}" style="color: #0f4c81; font-weight: 500;">Log in to your account →</a></p>
              <p style="color: #666; font-size: 13px; margin-top: 20px;">— Potentials Therapy Center</p>
            `
          })
        })
      } catch (emailError) {
        console.error('Failed to send additional-child email:', emailError.message)
      }

      return Response.json({ success: true })
    }

    if (body.action === 'reject_additional') {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `parent_accounts!H${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [['']] }
      })
      return Response.json({ success: true })
    }

    return Response.json({ success: false, error: 'Unknown action' })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}