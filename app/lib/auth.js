import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

function getSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET environment variable is required')
  return secret
}

export function signToken(payload, expiresIn = '365d') {
  return jwt.sign(payload, getSecret(), { expiresIn })
}

export function verifyToken(token) {
  return jwt.verify(token, getSecret())
}

// Reads the therapist's cookie, verifies it's a real unexpired badge,
// and returns the therapist's name from inside the badge itself —
// never from anything the request claims. Returns null if not logged in.
export async function getTherapistFromCookie() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('ptc_therapist_auth')?.value
    if (!token) return null
    const payload = verifyToken(token)
    if (payload.role !== 'therapist' || !payload.name) return null
    return payload.name
  } catch {
    return null
  }
}