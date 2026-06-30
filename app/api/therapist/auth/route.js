import { getSheetData } from '../../../lib/sheets'
import jwt from 'jsonwebtoken'

export async function POST(request) {
  try {
    const { name, pin } = await request.json()
    const data = await getSheetData('therapists')
    const [, ...rows] = data
    
    const therapistRow = rows.find(r => r && r[1] === name && String(r[9]) === String(pin))

    if (!therapistRow) {
      return Response.json({ success: false, error: 'Incorrect name or PIN' })
    }

    if (therapistRow[11] === 'TRUE') {
      return Response.json({ success: false, error: 'This account has been disabled. Please contact the clinic.' })
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required')
    }
    const token = jwt.sign(
      { role: 'therapist', name },
      process.env.JWT_SECRET,
      { expiresIn: '365d' }
    )
    return Response.json({ success: true, name, role: 'therapist', token })
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