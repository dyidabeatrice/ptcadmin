export async function GET() {
  const PAGE_TOKEN = process.env.META_PAGE_ACCESS_TOKEN
  const PAGE_ID = process.env.META_PAGE_ID

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${PAGE_ID}/messages?access_token=${PAGE_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: '4801456173302861' },
        message: {
          text: 'Good day! This is a friendly reminder that your child has an OT session tomorrow at 9:00 AM with ABI. Please confirm attendance:',
          quick_replies: [
            {
              content_type: 'text',
              title: '✓ Yes, we\'ll be there',
              payload: 'CONFIRM_YES'
            },
            {
              content_type: 'text',
              title: '✗ Sorry, we can\'t make it',
              payload: 'CONFIRM_NO'
            }
          ]
        }
      })
    }
  )

  const text = await res.text()
  return Response.json({ status: res.status, raw: text })
}