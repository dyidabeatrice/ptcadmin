import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request) {
  try {
    const { image, mediaType } = await request.json()

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
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
            text: `This is a screenshot of a bank transfer payment to Potentials Therapy Center.
Extract the following and respond ONLY with a JSON object, no other text, no markdown:
{
  "amount": <number only, no currency symbols>,
  "reference": "<reference number>",
  "mop": "<BDO or Union Bank>",
  "confidence": "<high, medium, or low>"
}

Rules:
- If you see account number 012220028786 or BDO anywhere → mop is "BDO"
- If you see account number 0023100091 or 0023 1000 9113 or UnionBank or Union Bank anywhere → mop is "Union Bank"
- Amount: extract the PHP amount as a plain number only (e.g. 1300 not "PHP 1,300.00")
- Reference: look for "Reference no.", "Reference Number", "Ref No", or transaction ID field
- confidence: set to "high" if all three fields are clearly visible, "medium" if one is unclear, "low" if image is unreadable`
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