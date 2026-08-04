export async function POST(request) {
  try {
    const { password } = await request.json()
    const correct = password === process.env.SUMMARY_PASSWORD
    return Response.json({ success: correct })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}