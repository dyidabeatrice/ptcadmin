import { cookies } from 'next/headers'
import { getSheetData } from '../../../lib/sheets'
import { signToken } from '../../../lib/auth'

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

    const token = signToken({ role: 'therapist', name })

    const cookieStore = await cookies()
    cookieStore.set('ptc_therapist_auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })

    return Response.json({ success: true, name, role: 'therapist' })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('ptc_therapist_auth')
  return Response.json({ success: true })
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