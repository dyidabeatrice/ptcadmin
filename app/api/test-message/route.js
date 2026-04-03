export async function GET() {
  const PAGE_TOKEN = process.env.META_PAGE_ACCESS_TOKEN
  const PAGE_ID = process.env.META_PAGE_ID

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${PAGE_ID}/messages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: '4801456173302861' },
        message: { text: 'Test reminder from PTCAdmin!' },
        access_token: PAGE_TOKEN
      })
    }
  )

  const data = await res.json()
  return Response.json({ status: res.status, data })
}