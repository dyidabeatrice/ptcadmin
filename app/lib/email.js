import nodemailer from 'nodemailer'

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
})

// Wraps inner HTML content in the standard navy-header card layout used across all clinic emails.
export function buildEmailHTML({ title, headerColor = '#0f4c81', bodyHTML }) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${headerColor}; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="color: white; margin: 0;">${title}</h2>
      </div>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
        ${bodyHTML}
      </div>
    </div>
  `
}

export function sendClinicEmail({ to, bcc, subject, html, attachments }) {
  return transporter.sendMail({
    from: `Potentials Therapy Center <${process.env.GMAIL_USER}>`,
    to,
    bcc,
    subject,
    html,
    attachments
  })
}