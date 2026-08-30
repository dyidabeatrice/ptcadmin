import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { getSheetData } from '../../../lib/sheets'
import { signToken } from '../../../lib/auth'

export async function POST(request) {
  try {
    const { email, password } = await request.json()
    const normalizedEmail = (email || '').trim().toLowerCase()

    const data = await getSheetData('parent_accounts')
    const [, ...rows] = data
    const accountRow = rows.find(r => r && r[1]?.toLowerCase() === normalizedEmail)

    if (!accountRow) {
      return Response.json({ success: false, error: 'Incorrect email or password' })
    }

    const passwordHash = accountRow[2]
    const passwordMatches = await bcrypt.compare(password || '', passwordHash)
    if (!passwordMatches) {
      return Response.json({ success: false, error: 'Incorrect email or password' })
    }

    if (accountRow[3] === 'rejected') {
      return Response.json({ success: false, error: 'This account is not active. Please contact the clinic.' })
    }
    if (accountRow[3] === 'deleted') {
      return Response.json({ success: false, error: 'This account has been deleted.' })
    }

    const token = signToken({ role: 'parent', id: accountRow[0], email: normalizedEmail })
    const cookieStore = await cookies()
    cookieStore.set('ptc_parent_auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })

    return Response.json({ success: true, status: accountRow[3] })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('ptc_parent_auth')
  return Response.json({ success: true })
}