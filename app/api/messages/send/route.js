import { sendTaggedMessage } from '../../../lib/messenger'

export async function POST(request) {
  try {
    const body = await request.json()

    if (body.action === 'send_reminder') {
      const { psid, client_name, therapist, date, time_start, specialty } = body

      const message = `Good day! This is a friendly reminder that ${client_name} has a ${specialty} session tomorrow, ${date} at ${time_start} with T. ${therapist}. Please confirm attendance:`

      const quickReplies = [
        {
          content_type: 'text',
          title: '✓ YES',
          payload: 'CONFIRM_YES'
        },
        {
          content_type: 'text',
          title: '✗ NO',
          payload: 'CONFIRM_NO'
        }
      ]

      const result = await sendTaggedMessage(psid, message, quickReplies)

      if (result.error) {
        return Response.json({ success: false, error: result.error.message })
      }

      return Response.json({ success: true, message_id: result.message_id })
    }

    if (body.action === 'send_absence') {
      const { psid, client_name, therapist, date, time_start } = body

      const message = `Good day! We regret to inform you that ${client_name}'s session on ${date} at ${time_start} will not push through due to ${therapist}'s absence. We will get in touch regarding rescheduling. We apologize for the inconvenience.`

      const result = await sendTaggedMessage(psid, message)

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