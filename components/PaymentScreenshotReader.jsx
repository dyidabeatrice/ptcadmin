'use client'
import { useState, useRef } from 'react'

export default function PaymentScreenshotReader({ onExtract }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setLoading(true)
    try {
      const Tesseract = (await import('tesseract.js')).default
      const { data: { text } } = await Tesseract.recognize(file, 'eng', { logger: () => {} })

      console.log('OCR text:', text)

      // Detect bank by destination account number or bank name
      let mop = null
      if (text.match(/0122\s*2\s*0+\s*2\s*8786|BDO\s*Unibank|012220028786/i)) {
        mop = 'BDO'
      } else if (text.match(/00231000\s*9113|0023\s*1000\s*9113|UnionBank|Union Bank of the Philippines/i)) {
        mop = 'Union Bank'
      }

      // Extract transfer amount (not total which includes fees)
      let amount = null
      const transferAmountMatch =
        text.match(/Transfer\s*[Aa]mount[\s\S]{0,20}?PHP\s*([\d,]+\.?\d*)/i) ||
        text.match(/Transfer\s*[Aa]mount[\s\n\r]+PHP\s*([\d,]+\.?\d*)/i) ||
        text.match(/Transfer\s*[Aa]mount[\s\n\r]+([\d,]+\.?\d*)/i) ||
        text.match(/^Amount[\s\n\r]+PHP\s*([\d,]+\.?\d*)/im) ||
        text.match(/Amount[\s\n\r]+PHP\s*([\d,]+\.?\d*)/i) ||
        text.match(/[-−]\s*[$₱£P]\s*([\d,]+\.?\d*)/) ||
        text.match(/[$₱£P]\s*([\d,]+\.?\d*)/)
      if (transferAmountMatch) {
        amount = parseFloat(transferAmountMatch[1].replace(/,/g, ''))
      } else {
        const amountMatch = text.match(/PHP\s*([\d,]+\.?\d*)/i)
        if (amountMatch) amount = parseFloat(amountMatch[1].replace(/,/g, ''))
      }

      // Extract reference number — ordered by priority
      const refPatterns = [
        // Highest priority — specific reference fields
        /Reference\s*ID\s+([A-Z0-9]+(?:\s+[A-Z0-9]+){0,3})/i,          // Maya: AE81 A78D D1D9
        /Reference\s*No\.?\s+([A-Z0-9\-]+)/i,                        // CIMB: ENT2026...
        /Ref:\s*([A-Z0-9\-]+)/i,                                      // Security Bank: IPX-...
        /Transaction\s*Ref\.?\s*[Nn]o\.?\s*[\n\r]+\s*([A-Z0-9\-]+)/i,
        /Reference\s*[Nn]umber\s*[\n\r]+\s*([A-Z0-9\-]+)/i,          // MariBank: 371667
        /Ref\s*No\.?\s+([0-9]{10,})/i,                               // GCash: 6028479254695
        /IPS\s*Reference\s*[Nn]o\.?\s+[*]+([0-9]+)/i,                // CIMB IPS ref
        /InstaPay\s*Reference\s*[Nn]umber\s*[\n\r]+\s*([0-9]+)/i,    // InstaPay ref number
        /InstaPay\s*Ref\.?\s*[Nn]o\.?\s+([0-9]+)/i,                  // Maya: 152441
        /Confirmation\s*[Nn]o\.?\s+([0-9]+)/i,                       // BPI confirmation
        /Transaction\s*Ref\.?\s*[Nn]o\.?\s+([0-9]+)/i,               // BPI transaction ref
        // Specific formats
        /(IPX-[A-Z0-9\-]+)/i,
        /(ENT[0-9]+)/i,
        /(PC-[A-Z0-9\-]+)/i,
        /(UB[0-9]{4,})/i,
      ]
      let reference = null
      for (const pattern of refPatterns) {
        const match = text.match(pattern)
        if (match) {
          reference = match[1].trim().replace(/\s+/g, ' ')
          break
        }
      }

      const confidence = amount && reference && mop ? 'high' :
                         amount && mop ? 'medium' : 'low'

      if (confidence === 'low') {
        setError('Could not read image clearly — please fill in manually.')
        return
      }

      if (confidence === 'medium') {
        setError('Partially read — amount and bank detected. Please enter reference number manually.')
      }

      onExtract({ amount, reference, mop })
    } catch (err) {
      setError('Could not read image — please fill in manually.')
      console.error(err)
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div style={{ marginBottom: '12px' }}>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile}
        style={{ display: 'none' }} id="screenshot-upload" />
      <label htmlFor="screenshot-upload" style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '7px 14px', borderRadius: '8px', border: '1px solid #B5D4F4',
        background: '#E6F1FB', color: '#0C447C', cursor: loading ? 'wait' : 'pointer',
        fontSize: '12px', fontWeight: '500'
      }}>
        {loading ? '⏳ Reading...' : '📷 Upload payment screenshot'}
      </label>
      <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
        Tip: Use screenshots with dark text on white background for best results
      </div>
      {error && (
        <div style={{ marginTop: '6px', fontSize: '12px', color: '#633806',
          background: '#FAEEDA', padding: '6px 10px', borderRadius: '6px', border: '1px solid #EF9F27' }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  )
}