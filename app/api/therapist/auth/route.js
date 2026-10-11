import { cookies } from 'next/headers'
import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../../lib/sheets'
import { signToken } from '../../../lib/auth'

const MAX_FAILS = 5
const LOCK_MS = 15 * 60 * 1000
const GENERIC_ERROR = 'Incorrect name or PIN'

const norm = s => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase()

// login_attempts sheet: A key | B fails | C locked_until (ms timestamp)
async function getAttempt(key) {
  const data = await getSheetData('login_attempts')
  const [, ...rows] = data
  const idx = rows.findIndex(r => r && r[0] === key)
  if (idx === -1) return { idx: -1, fails: 0, lockedUntil: 0 }
  return { idx, fails: Number(rows[idx][1] || 0), lockedUntil: Number(rows[idx][2] || 0) }
}

async function saveAttempt(key, idx, fails, lockedUntil) {
  const sheets = getGoogleSheets()
  if (idx === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID, range: 'login_attempts', valueInputOption: 'RAW',
      requestBody: { values: [[key, fails, lockedUntil]] }
    })
  } else {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID, range: `login_attempts!A${idx + 2}:C${idx + 2}`, valueInputOption: 'RAW',
      requestBody: { values: [[key, fails, lockedUntil]] }
    })
  }
}

export async function POST(request) {
  try {
    const { name, pin } = await request.json()
    const typed = norm(name)
    if (!typed || !pin) return Response.json({ success: false, error: GENERIC_ERROR })

    // Locked? Same message as a wrong PIN, so nothing is revealed.
    const attempt = await getAttempt(typed)
    const now = Date.now()
    if (attempt.lockedUntil > now) return Response.json({ success: false, error: GENERIC_ERROR })
    // An expired lock starts fresh.
    const failsSoFar = attempt.lockedUntil && attempt.lockedUntil <= now ? 0 : attempt.fails

    const data = await getSheetData('therapists')
    const [header, ...rows] = data
    const aliasCol = (header || []).findIndex(h => String(h || '').trim().toLowerCase() === 'login_alias')

    // If a therapist has a login alias, ONLY the alias works at login (not their real name).
    const therapistRow = rows.find(r => {
      if (!r || !r[1]) return false
      const alias = aliasCol >= 0 ? norm(r[aliasCol]) : ''
      const loginName = alias || norm(r[1])
      return loginName === typed && String(r[9]) === String(pin)
    })

    if (!therapistRow) {
      const fails = failsSoFar + 1
      const lockedUntil = fails >= MAX_FAILS ? now + LOCK_MS : 0
      await saveAttempt(typed, attempt.idx, lockedUntil ? 0 : fails, lockedUntil)
      return Response.json({ success: false, error: GENERIC_ERROR })
    }

    if (therapistRow[11] === 'TRUE') {
      return Response.json({ success: false, error: 'This account has been disabled. Please contact the clinic.' })
    }

    if (attempt.idx !== -1 && (attempt.fails || attempt.lockedUntil)) await saveAttempt(typed, attempt.idx, 0, 0)

    // The session always carries the REAL name, so the dashboard, schedule and PF are unchanged.
    const realName = therapistRow[1]
    const token = signToken({ role: 'therapist', name: realName })

    const cookieStore = await cookies()
    cookieStore.set('ptc_therapist_auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })

    return Response.json({ success: true, name: realName, role: 'therapist' })
  } catch (error) {
    console.error('Therapist login error:', error)
    return Response.json({ success: false, error: 'Something went wrong. Please try again.' })
  }
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('ptc_therapist_auth')
  return Response.json({ success: true })
}

// The names list is intentionally gone: the login page no longer needs it,
// and nobody should be able to read therapist names from here.
export async function GET() {
  return new Response('Not found', { status: 404 })
}