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
    const body = await request.json()
    const { reportId, clientName, docType, parentEmail, fileUrl } = body

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
            <p>The <strong>${docType}</strong> for <strong>${clientName}</strong> is now ready.</p>
            <div style="margin: 20px 0;">
              <a href="${fileUrl}" style="background: #0f4c81; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                Download Document
              </a>
            </div>
            <p style="color: #666; font-size: 13px;">If the button above doesn't work, copy and paste this link: ${fileUrl}</p>
            <p style="color: #666; font-size: 13px; margin-top: 20px;">— Potentials Therapy Center</p>
          </div>
        </div>
      `
    })

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}