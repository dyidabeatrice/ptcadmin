import { getSheetData } from '../../../lib/sheets'

export async function POST(request) {
  try {
    const { name, pin } = await request.json()
    const data = await getSheetData('therapists')
    const [, ...rows] = data
    
    const therapistRow = rows.find(r => r && r[1] === name && r[7] === String(pin))
    
    if (!therapistRow) {
      return Response.json({ success: false, error: 'Incorrect name or PIN' })
    }

    return Response.json({ success: true, name })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function GET(request) {
  try {
    const data = await getSheetData('therapists')
    const [, ...rows] = data
    const names = [...new Set(rows.filter(r => r && r[1]).map(r => r[1]))].sort()
    return Response.json({ success: true, names })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}