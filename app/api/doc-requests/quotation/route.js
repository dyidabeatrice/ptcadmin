import { cookies } from 'next/headers'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { QUOTATION_TEMPLATE_BASE64 } from '../../../lib/quotationTemplate'

async function isAuthed() {
  const store = await cookies()
  return store.get('ptc_auth')?.value === 'authenticated'
}

const peso = n => '₱' + Number(n || 0).toLocaleString('en-US')
const clean = v => String(v ?? '').trim()

export async function POST(request) {
  try {
    if (!(await isAuthed())) return Response.json({ success: false, error: 'Not signed in' }, { status: 401 })
    const body = await request.json()

    const months = Math.round(Number(body.months))
    if (!Number.isFinite(months) || months < 1 || months > 36) {
      return Response.json({ success: false, error: 'Please enter the number of months (1 to 36)' }, { status: 400 })
    }
    const rawServices = Array.isArray(body.services) ? body.services : []
    const services = []
    for (const s of rawServices) {
      const fee = Number(s.fee), spw = Number(s.spw), wpm = Number(s.wpm)
      if (!clean(s.service)) continue
      if (![fee, spw, wpm].every(Number.isFinite) || fee < 0 || spw < 1 || wpm < 1) {
        return Response.json({ success: false, error: `Please check the numbers for ${clean(s.service)}` }, { status: 400 })
      }
      // Initial Evaluation is a single session: always 1 x 1 x 1
      const isIE = clean(s.service) === 'Initial Evaluation'
      const rSpw = isIE ? 1 : spw, rWpm = isIE ? 1 : wpm, rMonths = isIE ? 1 : months
      services.push({
        service: clean(s.service),
        fee: peso(fee),
        spw: rSpw,
        wpm: rWpm,
        months: rMonths,
        amount: peso(fee * rSpw * rWpm * rMonths),
        raw: fee * rSpw * rWpm * rMonths
      })
    }
    if (services.length === 0) return Response.json({ success: false, error: 'Add at least one service' }, { status: 400 })

    const name = clean(body.name)
    if (!name) return Response.json({ success: false, error: 'Name is required' }, { status: 400 })

    const data = {
      date: new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric' }),
      name,
      address: clean(body.address),
      agesex: [clean(body.age_text), clean(body.sex)].filter(Boolean).join(' / '),
      diagnosis: clean(body.diagnosis),
      months,
      months_label: months === 1 ? '1 month' : `${months} months`,
      services: services.map(({ raw, ...rest }) => rest),
      grand_total: peso(services.reduce((sum, s) => sum + s.raw, 0)),
      prepared_by: clean(body.prepared_by)
    }

    const zip = new PizZip(Buffer.from(QUOTATION_TEMPLATE_BASE64, 'base64'))
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
    doc.render(data)
    const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })

    const safe = name.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'Client'
    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="PTC_Quotation_${safe}.docx"`
      }
    })
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}