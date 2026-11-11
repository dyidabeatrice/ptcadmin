import { cookies } from 'next/headers'
import { getSheetData, getGoogleSheets, SPREADSHEET_ID, deleteSheetRow, findRowIndexById } from '../../lib/sheets'
import { formatPHDate } from '../../lib/dates'

// Sheet tab: doc_requests
// A id | B client_name | C fb_name | D type | E birthday | F address | G diagnosis | H status | I requested_date | J released_date

const TYPES = ['Quotation', 'Receipt', 'Certificate']
const STATUSES = ['requested', 'preparing', 'released']
const COLS = { fb_name: 'C', type: 'D', birthday: 'E', address: 'F', diagnosis: 'G', status: 'H' }

async function isAuthed() {
  const store = await cookies()
  return store.get('ptc_auth')?.value === 'authenticated'
}
const denied = () => Response.json({ success: false, error: 'Not signed in' }, { status: 401 })

export async function GET() {
  try {
    if (!(await isAuthed())) return denied()
    const data = await getSheetData('doc_requests')
    const [, ...rows] = data
    const items = rows.filter(r => r && r[0]).map(row => ({
      id: row[0],
      client_name: row[1] || '',
      fb_name: row[2] || '',
      type: row[3] || '',
      birthday: row[4] || '',
      address: row[5] || '',
      diagnosis: row[6] || '',
      status: STATUSES.includes(row[7]) ? row[7] : 'requested',
      requested_date: row[8] || '',
      released_date: row[9] || ''
    })).reverse() // newest first
    return Response.json({ success: true, data: items })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function POST(request) {
  try {
    if (!(await isAuthed())) return denied()
    const body = await request.json()
    const client = (body.client_name || '').trim()
    if (!client) return Response.json({ success: false, error: 'Client name is required' })
    const type = TYPES.includes(body.type) ? body.type : 'Quotation'

    const sheets = getGoogleSheets()
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'doc_requests',
      valueInputOption: 'RAW',
      requestBody: { values: [[
        Date.now().toString() + Math.random().toString(36).slice(2, 6),
        client,
        (body.fb_name || '').trim(),
        type,
        body.birthday || '',
        (body.address || '').trim(),
        (body.diagnosis || '').trim(),
        'requested',
        formatPHDate(),
        ''
      ]]}
    })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function PATCH(request) {
  try {
    if (!(await isAuthed())) return denied()
    const { id, field, value } = await request.json()
    if (!COLS[field]) return Response.json({ success: false, error: 'Unknown field' })
    if (field === 'status' && !STATUSES.includes(value)) return Response.json({ success: false, error: 'Unknown status' })
    if (field === 'type' && !TYPES.includes(value)) return Response.json({ success: false, error: 'Unknown type' })

    const index = await findRowIndexById('doc_requests', id)
    if (index === -1) return Response.json({ success: false, error: 'Request not found' })
    const row = index + 2

    const data = [{ range: `doc_requests!${COLS[field]}${row}`, values: [[value ?? '']] }]
    if (field === 'status') {
      data.push({ range: `doc_requests!J${row}`, values: [[value === 'released' ? formatPHDate() : '']] })
    }
    const sheets = getGoogleSheets()
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { valueInputOption: 'RAW', data }
    })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function DELETE(request) {
  try {
    if (!(await isAuthed())) return denied()
    const { id } = await request.json()
    const index = await findRowIndexById('doc_requests', id)
    if (index === -1) return Response.json({ success: false, error: 'Request not found' })
    await deleteSheetRow('doc_requests', index)
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}