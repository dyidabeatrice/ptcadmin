const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN

async function postToMessenger(body) {
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

// Simple text message, optionally with quick-reply buttons.
export function sendTextMessage(recipientId, text, quickReplies = null) {
  return postToMessenger({
    recipient: { id: recipientId },
    message: quickReplies ? { text, quick_replies: quickReplies } : { text }
  })
}

// Tagged message for reminders/updates outside the 24hr window (used by messages route)
export function sendTaggedMessage(recipientId, text, quickReplies = null) {
  return postToMessenger({
    messaging_type: 'MESSAGE_TAG',
    tag: 'CONFIRMED_EVENT_UPDATE',
    recipient: { id: recipientId },
    message: quickReplies ? { text, quick_replies: quickReplies } : { text }
  })
}

// Pre-approved message template (used by webhook for template-based sends)
export function sendTemplateMessage(recipientId, templateName, components = null) {
  const template = { name: templateName, language: { code: 'en' } }
  if (components) template.components = components
  return postToMessenger({
    recipient: { id: recipientId },
    messaging_type: 'UTILITY',
    message: { template }
  })
}