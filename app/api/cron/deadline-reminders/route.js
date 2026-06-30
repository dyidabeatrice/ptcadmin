import { getSheetData } from '../../../lib/sheets'
import { buildEmailHTML, sendClinicEmail } from '../../../lib/email'

export async function GET(request) {
  try {
    // Verify cron secret to prevent unauthorized calls
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    today.setHours(0, 0, 0, 0)

    const reportsData = await getSheetData('reports')
    const [, ...rows] = reportsData
    const therapistData = await getSheetData('therapists')
    const [, ...therapistRows] = therapistData

    const therapistMap = {}
    therapistRows.filter(r => r && r[0]).forEach(row => {
      therapistMap[row[1]] = { email: row[7] || '' }
    })

    let reminded = 0

    for (const row of rows) {
      if (!row || !row[0]) continue
      const status = row[8]
      const fileUrl = row[12] || ''
      const deadline = row[5]

      // Only check Ready for Release with no upload yet
      if (status !== 'Ready for Release' || fileUrl) continue
      if (!deadline) continue

      const deadlineDate = new Date(deadline)
      deadlineDate.setHours(0, 0, 0, 0)
      const daysLeft = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24))

      if (daysLeft !== 3 && daysLeft !== 1) continue

      const therapistName = row[2]
      const therapistEmail = therapistMap[therapistName]?.email
      if (!therapistEmail) continue

      const clientName = row[1]
      const docType = row[6]
      const urgency = daysLeft === 1 ? '⚠️ Due Tomorrow' : '📅 Due in 3 Days'

      await sendClinicEmail({
        to: therapistEmail,
        subject: `${urgency} — ${docType} for ${clientName}`,
        html: buildEmailHTML({
          title: urgency,
          headerColor: daysLeft === 1 ? '#E24B4A' : '#0f4c81',
          bodyHTML: `
            <p>Hi ${therapistName},</p>
            <p>This is a reminder that the <strong>${docType}</strong> for <strong>${clientName}</strong> is due in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>.</p>
            <p>The client has already paid — please log in to the <a href="${process.env.NEXT_PUBLIC_URL}/therapist/login" style="color: #0f4c81; font-weight: 500;">therapist portal</a> to upload the report.</p>
            <p style="color: #666; font-size: 13px;">Deadline: <strong>${deadline}</strong></p>
            <p style="color: #666; font-size: 13px; margin-top: 20px;">— Potentials Therapy Center</p>
          `
        })
      })
      reminded++
    }

    return Response.json({ success: true, reminded })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}
