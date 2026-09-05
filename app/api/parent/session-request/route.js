import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../../lib/sheets'
import { formatPHDateTime } from '../../../lib/dates'
import { getParentFromCookie } from '../../../lib/auth'

export async function POST(request) {
  try {
    const parent = await getParentFromCookie()
    if (!parent) return Response.json({ success: false, error: 'Not logged in' }, { status: 401 })

    const body = await request.json()
    const { client_name, session_id, week_key, action } = body
    if (!client_name || !session_id || !week_key || !['confirm', 'cancel'].includes(action)) {
      return Response.json({ success: false, error: 'Invalid request' })
    }

    // Confirm this parent account actually has this child linked
    const accountsData = await getSheetData('parent_accounts')
    const [, ...accountRows] = accountsData
    const accountRow = accountRows.find(r => r && r[0] === parent.id)
    if (!accountRow || accountRow[3] !== 'active') {
      return Response.json({ success: false, error: 'Account not active' })
    }
    const linkedClients = (accountRow[5] || '').split(';').map(s => s.trim())
    if (!linkedClients.includes(client_name)) {
      return Response.json({ success: false, error: 'Not authorized for this client' })
    }

    // Re-check the session is genuinely still Pencil, server-side — never trust the client's claim
    const weekData = await getSheetData(week_key)
    const [, ...weekRows] = weekData
    const sessionRow = weekRows.find(r => r && r[0] === session_id)
    if (!sessionRow || sessionRow[8] !== 'Pencil') {
      return Response.json({ success: false, error: 'This session is no longer available for a request' })
    }

    // Don't allow a duplicate request while one's already sitting there
    const existingData = await getSheetData('parent_session_requests')
    const [, ...existingRows] = existingData
    const alreadyExists = existingRows.some(r => r && r[3] === session_id)
    if (alreadyExists) {
      return Response.json({ success: false, error: 'A request for this session has already been submitted' })
    }

    const sheets = getGoogleSheets()
    const id = Date.now().toString() + Math.random().toString(36).slice(2)
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'parent_session_requests',
      valueInputOption: 'RAW',
      requestBody: { values: [[
        id, parent.id, client_name, session_id, week_key, action, formatPHDateTime(), 'pending'
      ]]}
    })

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}