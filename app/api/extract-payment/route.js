import Tesseract from 'tesseract.js'
import { Buffer } from 'buffer'

export async function POST(request) {
  try {
    const { image, mediaType } = await request.json()

    // Convert base64 to buffer
    const buffer = Buffer.from(image, 'base64')

    // Run OCR
    const { data: { text } } = await Tesseract.recognize(buffer, 'eng', {
      logger: () => {}
    })

    // Extract amount
    const amountMatch = text.match(/PHP\s*([\d,]+\.?\d*)/i)
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null

    // Extract reference number
    const refPatterns = [
      /Reference\s*[Nn]o\.?\s*\n?\s*([A-Z0-9\-]+)/,  // BDO: Reference no. PC-NDBMOB-...
      /Reference\s*[Nn]umber\s*\n?\s*([A-Z0-9\-]+)/,  // UnionBank: Reference Number UB260488
      /Ref\s*[Nn]o\.?\s*:?\s*([A-Z0-9\-]+)/,
    ]
    let reference = null
    for (const pattern of refPatterns) {
      const match = text.match(pattern)
      if (match) { reference = match[1].trim(); break }
    }

    // Detect bank
    let mop = null
    if (text.match(/UnionBank|Union Bank|0023\s*1000\s*9113/i)) {
      mop = 'Union Bank'
    } else if (text.match(/BDO|012220028786|PC-NDBMOB|NDBMOB/i)) {
      mop = 'BDO'
    }

    // Determine confidence
    const confidence = amount && reference && mop ? 'high' : amount && reference ? 'medium' : 'low'

    return Response.json({ success: true, data: { amount, reference, mop, confidence } })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}