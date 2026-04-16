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
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res(reader.result.split(',')[1])
        reader.onerror = rej
        reader.readAsDataURL(file)
      })
      const response = await fetch('/api/extract-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mediaType: file.type })
      })
      const json = await response.json()
      if (!json.success) throw new Error(json.error)
      if (json.data.confidence === 'low') {
        setError('Could not read image clearly — please fill in manually.')
        return
      }
      onExtract(json.data)
    } catch (err) {
      setError('Could not read image — please fill in manually.')
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