import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../../lib/sheets'
import { formatPHDateTime } from '../../../lib/dates'
import { getParentFromCookie } from '../../../lib/auth'
import { uploadPaymentScreenshot } from '../../../lib/driveUpload'

export async function POST(request) {
  try {
    const parent = await getParentFromCookie()
    if (!parent) return Response.json({ success: false, error: 'Not logged in' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file')
    const notes = formData.get('notes') || ''

    if (!file) return Response.json({ success: false, error: 'Please choose a file' })
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      return Response.json({ success: false, error: 'Please upload a JPG or PNG image' })
    }
    if (file.size > 8 * 1024 * 1024) {
      return Response.json({ success: false, error: 'File is too large (max 8MB)' })
    }

    // Confirm this parent account is actually active/linked, and get a
    // display name for "sender" so staff can tell who sent it.
    const accountsData = await getSheetData('parent_accounts')
    const [, ...accountRows] = accountsData
    const accountRow = accountRows.find(r => r && r[0] === parent.id)
    if (!accountRow || accountRow[3] !== 'active') {
      return Response.json({ success: false, error: 'Account not active' })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `payment-${parent.id}-${Date.now()}.${file.type === 'image/png' ? 'png' : 'jpg'}`
    const { imageUrl } = await uploadPaymentScreenshot(buffer, filename, file.type)

    const sheets = getGoogleSheets()
    const id = Date.now().toString() + Math.random().toString(36).slice(2)
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'pending_payments',
      valueInputOption: 'RAW',
      requestBody: { values: [[
        id,
        '', // psid — not applicable, this came from the website not Messenger
        '', // client_name — left blank, staff picks the right client(s) when processing (payment may cover multiple)
        '', // drive_file_id — not used for this path
        imageUrl,
        formatPHDateTime(),
        'pending',
        `Parent (${accountRow[1]})`, // sender_name — shows the parent's email so staff know who sent it
        notes
      ]]}
    })

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}