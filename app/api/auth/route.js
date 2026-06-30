import { cookies } from 'next/headers'
import { signToken } from '../../lib/auth'

const STAFF_PASSWORD = process.env.STAFF_PASSWORD

export async function POST(request) {
  try {
    const { password } = await request.json()
    
    if (password === STAFF_PASSWORD) {
      const cookieStore = await cookies()
      cookieStore.set('ptc_auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
      const token = signToken({ role: 'admin' })
      return Response.json({ success: true, role: 'admin', token })
    }
    return Response.json({ success: false })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('ptc_auth')
  return Response.json({ success: true })
}