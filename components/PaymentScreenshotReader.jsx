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
      if (text.match(/012220028786|BDO\s*Unibank|012220028786/i)) {
        mop = 'BDO'
      } else if (text.match(/00231000\s*9113|0023\s*1000\s*9113|UnionBank|Union Bank/i)) {
        mop = 'Union Bank'
      }

      // Extract transfer amount (not total which includes fees)
      let amount = null
      const transferAmountMatch = text.match(/Transfer\s*[Aa]mount[\s\S]*?PHP\s*([\d,]+\.?\d*)/i) ||
                                  text.match(/Transfer\s*[Aa]mount\s+([\d,]+\.?\d*)/i)
      if (transferAmountMatch) {
        amount = parseFloat(transferAmountMatch[1].replace(/,/g, ''))
      } else {
        // Fallback to any PHP amount
        const amountMatch = text.match(/PHP\s*([\d,]+\.?\d*)/i)
        if (amountMatch) amount = parseFloat(amountMatch[1].replace(/,/g, ''))
      }

      // Extract reference number — try multiple field names
        const refPatterns = [
        /Transaction\s*Ref\.?\s*[Nn]o\.?\s*\n?\s*([A-Z0-9\-]+)/,  // ← move to top
        /Ref(?:erence)?\s*[Nn]o\.?\s*\n?\s*([A-Z0-9\-]+)/,
        /Reference\s*[Nn]umber\s*\n?\s*([A-Z0-9\-]+)/,
        /Confirmation\s*[Nn]o\.?\s*\n?\s*([0-9]+)/,               // ← move to bottom
        /InstaPay\s*Invoice\s*[Nn]o\.?\s*\n?\s*([0-9]+)/,
        /Ref\s*[Nn]o\.\s+([0-9]{10,})/,
        /Reference\s*Number\s+([0-9]+)/,
        /Transaction\s*Ref\.\s*No\.\s+([0-9]+)/,
        /(UB[0-9]{6,})/,
        /(PC-[A-Z0-9\-]+)/,
        ]
      let reference = null
      for (const pattern of refPatterns) {
        const match = text.match(pattern)
        if (match) { reference = match[1].trim(); break }
      }

      const confidence = amount && reference && mop ? 'high' :
                         amount && mop ? 'medium' : 'low'

      if (confidence === 'low') {
        setError('Could not read image clearly — please fill in manually.')
        return
      }

      if (confidence === 'medium') {
        setError('Partially read — please verify and fill in any missing fields.')
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
      {error && (
        <div style={{ marginTop: '6px', fontSize: '12px', color: '#633806',
          background: '#FAEEDA', padding: '6px 10px', borderRadius: '6px', border: '1px solid #EF9F27' }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  )
}
