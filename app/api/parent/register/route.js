import bcrypt from 'bcryptjs'
import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../../lib/sheets'
import { formatPHDate } from '../../../lib/dates'

export async function POST(request) {
  try {
    const body = await request.json()
    const email = (body.email || '').trim().toLowerCase()
    const password = body.password || ''
    const children = (body.children || []).map(c => c.trim()).filter(Boolean)

    if (!email || !email.includes('@')) {
      return Response.json({ success: false, error: 'Please enter a valid email address' })
    }
    if (password.length < 8) {
      return Response.json({ success: false, error: 'Password must be at least 8 characters' })
    }
    if (children.length === 0) {
      return Response.json({ success: false, error: 'Please enter at least one child\'s name' })
    }

    // Check for an existing account with this email
    const data = await getSheetData('parent_accounts')
    const [, ...rows] = data
    const existing = rows.find(r => r && r[1]?.toLowerCase() === email)
    if (existing) {
      return Response.json({ success: false, error: 'An account with this email already exists. Please log in instead.' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const id = Date.now().toString() + Math.random().toString(36).slice(2)

    const sheets = getGoogleSheets()
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'parent_accounts',
      valueInputOption: 'RAW',
      requestBody: { values: [[
        id,
        email,
        passwordHash,
        'pending',
        children.join('; '),
        '', // linked_clients — filled in when staff approves
        formatPHDate()
      ]]}
    })

    return Response.json({ success: true, id })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}