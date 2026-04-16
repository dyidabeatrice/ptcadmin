import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request) {
  try {
    const { image, mediaType } = await request.json()

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image }
          },
          {
            type: 'text',
            text: `This is a screenshot of a bank transfer payment. Extract the following and respond ONLY with a JSON object, no other text:
{
  "amount": <number or null>,
  "reference": "<reference/confirmation number or null>",
  "mop": "<BDO, Union Bank, or Cash or null>",
  "confidence": "<high, medium, or low>"
}

For mop: look for bank name, logo color (BDO=blue, UnionBank=orange/red). If unclear set to null.
For amount: return as number only, no currency symbols.
For reference: look for confirmation number, reference number, transaction ID.`
          }
        ]
      }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()
    const data = JSON.parse(clean)
    return Response.json({ success: true, data })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}