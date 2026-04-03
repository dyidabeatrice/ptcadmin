const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN

async function sendMessengerMessage(recipientId, message, quickReplies = null) {
  const body = {
    recipient: { id: recipientId },
    message: quickReplies ? {
      text: message,
      quick_replies: quickReplies
    } : { text: message }
  }

  const res = await fetch(
    `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  )
  return await res.json()
}

export async function POST(request) {
  try {
    const body = await request.json()

    if (body.action === 'send_reminder') {
      const { psid, client_name, therapist, date, time_start, specialty } = body

      const message = `Good day! This is a friendly reminder that ${client_name} has a ${specialty} session tomorrow, ${date} at ${time_start} with ${therapist}. Please confirm attendance:`

      const quickReplies = [
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

      const result = await sendMessengerMessage(psid, message, quickReplies)

      if (result.error) {
        return Response.json({ success: false, error: result.error.message })
      }

      return Response.json({ success: true, message_id: result.message_id })
    }

    if (body.action === 'send_absence') {
      const { psid, client_name, therapist, date, time_start } = body

      const message = `Good day! We regret to inform you that ${client_name}'s session on ${date} at ${time_start} will not push through due to ${therapist}'s absence. We will get in touch regarding rescheduling. We apologize for the inconvenience.`

      const result = await sendMessengerMessage(psid, message)

      if (result.error) {
        return Response.json({ success: false, error: result.error.message })
      }

      return Response.json({ success: true })
    }

    return Response.json({ success: false, error: 'Unknown action' })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}