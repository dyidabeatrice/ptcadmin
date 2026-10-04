import { getTherapistFromCookie } from '../../../lib/auth'
import { setPfConfirmation } from '../../../lib/pfConfirm'

export async function POST(request) {
  try {
    const therapist = await getTherapistFromCookie()
    if (!therapist) return Response.json({ success: false, error: 'Not logged in' }, { status: 401 })
    const { month_key, period, confirmed } = await request.json()
    if (!month_key || !period) return Response.json({ success: false, error: 'Missing fields' })
    await setPfConfirmation(therapist, month_key, period, confirmed !== false)
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}