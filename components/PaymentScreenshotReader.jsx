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

      console.log('OCR text:', text) // for debugging

      // Extract amount
      const amountMatch = text.match(/PHP\s*([\d,]+\.?\d*)/i) ||
                          text.match(/([\d,]+\.00)\s*$/m)
      const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null

      // Extract reference
      const refPatterns = [
        /Reference\s*[Nn]o\.?\s*\n?\s*([A-Z0-9\-]+)/,
        /Reference\s*[Nn]umber\s*\n?\s*([A-Z0-9\-]+)/,
        /Ref\s*[Nn]o\.?\s*:?\s*([A-Z0-9\-]+)/,
        /^(UB[0-9]+)/m,
        /^(PC-[A-Z0-9\-]+)/m,
      ]
      let reference = null
      for (const pattern of refPatterns) {
        const match = text.match(pattern)
        if (match) { reference = match[1].trim(); break }
      }

      // Detect bank
      let mop = null
      if (text.match(/UnionBank|Union Bank|0023\s*1000\s*9113|UB[0-9]{6}|Thank you for using/i)) {
        mop = 'Union Bank'
      } else if (text.match(/BDO|012220028786|PC-NDBMOB|NDBMOB|Sent!/i)) {
        mop = 'BDO'
      }

      const confidence = amount && reference && mop ? 'high' : amount && reference ? 'medium' : 'low'

      if (confidence === 'low') {
        setError('Could not read image clearly — please fill in manually.')
        return
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
        <div style={{ marginTop: '6px', fontSize: '12px', color: '#791F1F',
          background: '#FCEBEB', padding: '6px 10px', borderRadius: '6px', border: '1px solid #F09595' }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  )
}