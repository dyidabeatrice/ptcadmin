export async function GET() {
  const PAGE_TOKEN = process.env.META_PAGE_ACCESS_TOKEN
  const PAGE_ID = process.env.META_PAGE_ID

  return Response.json({
    page_id: PAGE_ID,
    token_start: PAGE_TOKEN?.substring(0, 20),
    token_length: PAGE_TOKEN?.length
  })
}