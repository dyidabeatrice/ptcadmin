export async function GET() {
  const PAGE_TOKEN = process.env.META_PAGE_ACCESS_TOKEN
  const PAGE_ID = process.env.META_PAGE_ID

  const res = await fetch(
    `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: '4801456173302861' },
        messaging_type: "UTILITY",
        message: {
          template: {
            name: "ptc_appointment_reminder",
            language: { code: "en" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: "Ida" },
                  { type: "text", text: "June 5 at 10am" }
                ]
              }
            ]
          }
        }
      })
    }
  )

  const text = await res.text()
  return Response.json({ 
    status: res.status, 
    raw: text,
    page_id: PAGE_ID,
    token_preview: PAGE_TOKEN?.substring(0, 30)
  })
}