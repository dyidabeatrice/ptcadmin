import { cookies } from 'next/headers'
import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../../lib/sheets'
import { getParentFromCookie } from '../../../lib/auth'

export async function POST() {
  try {
    const parent = await getParentFromCookie()
    if (!parent) return Response.json({ success: false, error: 'Not logged in' }, { status: 401 })

    const data = await getSheetData('parent_accounts')
    const [, ...rows] = data
    const rowIndex = rows.findIndex(r => r && r[0] === parent.id)
    if (rowIndex === -1) return Response.json({ success: false, error: 'Account not found' })

    const sheets = getGoogleSheets()
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `parent_accounts!D${rowIndex + 2}`,
      valueInputOption: 'RAW',
      requestBody: { values: [['deleted']] }
    })

    const cookieStore = await cookies()
    cookieStore.delete('ptc_parent_auth')

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}