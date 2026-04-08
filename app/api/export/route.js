import { getSheetData, SPREADSHEET_ID } from '../../lib/sheets'
import * as XLSX from 'xlsx'

const RATES = {
  'OT SESSION':     { full: 1200, levels: { 'JUNIOR 1': 830, 'JUNIOR 2': 850, 'JUNIOR 3': 900, 'SENIOR 1': 850, 'SENIOR 2': 900 } },
  'OT-IE':          { full: 2800, levels: { 'JUNIOR 1': 800, 'JUNIOR 2': 800, 'JUNIOR 3': 800, 'SENIOR 1': 850, 'SENIOR 2': 850 } },
  'OT-FE':          { full: 1500, levels: { 'JUNIOR 1': 830, 'JUNIOR 2': 850, 'JUNIOR 3': 900, 'SENIOR 1': 850, 'SENIOR 2': 900 } },
  'SPECIALIZED OT TX': { full: 1700, levels: { 'JUNIOR 1': 1300, 'JUNIOR 2': 1300, 'JUNIOR 3': 1300, 'SENIOR 1': 1300, 'SENIOR 2': 1300 } },
  'PR':             { full: 750,  levels: { 'JUNIOR 1': 450, 'JUNIOR 2': 450, 'JUNIOR 3': 450, 'SENIOR 1': 450, 'SENIOR 2': 450 } },
  'PR-RUSHED':      { full: 1000, levels: { 'JUNIOR 1': 600, 'JUNIOR 2': 600, 'JUNIOR 3': 600, 'SENIOR 1': 600, 'SENIOR 2': 600 } },
  'IE REPORT':      { full: 0,    levels: { 'JUNIOR 1': 800, 'JUNIOR 2': 800, 'JUNIOR 3': 800, 'SENIOR 1': 850, 'SENIOR 2': 850 } },
  'ST SESSION':     { full: 1300, levels: { 'JUNIOR 1': 830, 'JUNIOR 2': 850, 'JUNIOR 3': 900, 'SENIOR 1': 850, 'SENIOR 2': 900 } },
  'ST-IE':          { full: 2800, levels: { 'JUNIOR 1': 800, 'JUNIOR 2': 800, 'JUNIOR 3': 800, 'SENIOR 1': 850, 'SENIOR 2': 850 } },
  'ST-FE':          { full: 1500, levels: { 'JUNIOR 1': 830, 'JUNIOR 2': 850, 'JUNIOR 3': 900, 'SENIOR 1': 850, 'SENIOR 2': 900 } },
  'SPECIALIZED ST TX': { full: 1700, levels: { 'JUNIOR 1': 1300, 'JUNIOR 2': 1300, 'JUNIOR 3': 1300, 'SENIOR 1': 1300, 'SENIOR 2': 1300 } },
  'IE REPORT':      { full: 0,    levels: { 'JUNIOR 1': 800, 'JUNIOR 2': 800, 'JUNIOR 3': 800, 'SENIOR 1': 850, 'SENIOR 2': 850 } },
  'PT SESSION':     { full: 900,  levels: { 'JUNIOR 1': 525, 'JUNIOR 2': 525, 'JUNIOR 3': 525, 'SENIOR 1': 525, 'SENIOR 2': 525 } },
  'PT-IE':          { full: 2800, levels: { 'JUNIOR 1': 800, 'JUNIOR 2': 800, 'JUNIOR 3': 800, 'SENIOR 1': 850, 'SENIOR 2': 850 } },
  'PT FE':          { full: 1500, levels: { 'JUNIOR 1': 525, 'JUNIOR 2': 525, 'JUNIOR 3': 525, 'SENIOR 1': 525, 'SENIOR 2': 525 } },
  'SPED SESSION':   { full: 900,  levels: { 'JUNIOR 1': 600, 'JUNIOR 2': 600, 'JUNIOR 3': 600, 'SENIOR 1': 600, 'SENIOR 2': 600 } },
  'SPED IE':        { full: 1500, levels: { 'JUNIOR 1': 600, 'JUNIOR 2': 600, 'JUNIOR 3': 600, 'SENIOR 1': 600, 'SENIOR 2': 600 } },
  'SPED FE':        { full: 1500, levels: { 'JUNIOR 1': 525, 'JUNIOR 2': 525, 'JUNIOR 3': 525, 'SENIOR 1': 525, 'SENIOR 2': 525 } },
  'PLAYSCHOOL':     { full: 750,  levels: { 'JUNIOR 1': 525, 'JUNIOR 2': 525, 'JUNIOR 3': 525, 'SENIOR 1': 525, 'SENIOR 2': 525 } },
  'PR-INTERN':      { full: 300,  levels: { 'JUNIOR 1': 0, 'JUNIOR 2': 0, 'JUNIOR 3': 0, 'SENIOR 1': 0, 'SENIOR 2': 0 } }
}

function parsePaymentDate(dateStr) {
  if (!dateStr) return null
  const months = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 }
  const parts = dateStr.replace(',', '').split(' ')
  if (parts.length !== 3) return null
  const month = months[parts[0]]
  const day = parseInt(parts[1])
  const year = parseInt(parts[2])
  if (month === undefined || isNaN(day) || isNaN(year)) return null
  return new Date(year, month, day)
}

function getTherapistCut(sessionType, level, comments) {
  const normalizedType = sessionType?.toUpperCase().trim()
  const rate = RATES[normalizedType]
  if (!rate) return 0
  const cut = rate.levels[level] || 0
  const hasDeduction = comments?.includes('-5%')
  return hasDeduction ? Math.round(cut * 0.95) : cut
}

function getTotal(sessionType, recordedAmount) {
  const normalizedType = sessionType?.toUpperCase().trim()
  if (normalizedType === 'IE REPORT') return 0
  return recordedAmount || RATES[normalizedType]?.full || 0
}

function getCenter(sessionType, total, therapistCut, comments) {
  const normalizedType = sessionType?.toUpperCase().trim()
  if (normalizedType === 'IE REPORT') return 0
  return total - therapistCut
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // format: 2026-04
    if (!month) return Response.json({ success: false, error: 'Month required' })

    const [year, monthNum] = month.split('-').map(Number)

    const [paymentData, therapistData] = await Promise.all([
      getSheetData('payments'),
      getSheetData('therapists')
    ])

    const [, ...payRows] = paymentData
    const [, ...therapistRows] = therapistData

    // Build therapist map with level and intern status
    const therapistMap = {}
    therapistRows.filter(r => r && r[0]).forEach(row => {
      const name = row[1]
      if (!therapistMap[name]) {
        therapistMap[name] = {
          name, specialty: row[2] || 'OT',
          is_intern: row[3] === 'TRUE',
          level: row[8] || 'JUNIOR 1',
          email: row[7] || ''
        }
      }
    })

    // Filter payments for the selected month
    const monthPayments = payRows.filter(r => {
      if (!r || !r[0]) return false
      const d = parsePaymentDate(r[7])
      if (!d) return false
      return d.getFullYear() === year && d.getMonth() + 1 === monthNum
    }).map(row => ({
      id: row[0], client_name: row[1], therapist: row[2],
      session_id: row[3], amount: parseFloat(row[4] || 0),
      mop: row[5] || '', session_type: row[6] || '',
      date: row[7] || '', payment_type: row[8] || 'session',
      reference: row[9] || '', comments: row[10] || ''
    }))

    // Create workbook
    const wb = XLSX.utils.book_new()

    // RATES sheet
    const ratesData = [
      ['SERVICE', 'FULL AMOUNT', 'JUNIOR 1', 'JUNIOR 2', 'JUNIOR 3', 'SENIOR 1', 'SENIOR 2'],
      ...Object.entries(RATES).map(([service, data]) => [
        service, data.full,
        data.levels['JUNIOR 1'], data.levels['JUNIOR 2'], data.levels['JUNIOR 3'],
        data.levels['SENIOR 1'], data.levels['SENIOR 2']
      ])
    ]
    const ratesSheet = XLSX.utils.aoa_to_sheet(ratesData)
    ratesSheet['!cols'] = [{ wch: 20 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ratesSheet, 'RATES')

    // Remove attendance records that have been paid (avoid double counting)
    const paidSessionIds = new Set(
      monthPayments.filter(p => p.payment_type === 'session').map(p => p.session_id)
    )
    const deduped = monthPayments.filter(p =>
      !(p.payment_type === 'attendance' && paidSessionIds.has(p.session_id))
    )

    const byTherapist = {}
    deduped.forEach(p => {
      if (!p.therapist) return
      if (!byTherapist[p.therapist]) byTherapist[p.therapist] = []
      byTherapist[p.therapist].push(p)
    })

    // Separate regular and intern therapists
    const regularTherapists = {}
    const internTherapists = { OT: [], ST: [], PT: [] }

    Object.entries(byTherapist).forEach(([name, payments]) => {
      const t = therapistMap[name]
      if (!t) return
      if (t.is_intern) {
        const specialty = t.specialty || 'OT'
        if (internTherapists[specialty]) {
          internTherapists[specialty].push(...payments.map(p => ({ ...p, therapistInfo: t })))
        }
      } else {
        regularTherapists[name] = { payments, info: t }
      }
    })

    const monthName = new Date(year, monthNum - 1).toLocaleString('en-PH', { month: 'long' })
    const headers = ['DATE', 'CLIENT NAME', 'SESSION TYPE', 'MOP', 'REFERENCE NO.', 'TOTAL', 'THERAPIST', 'CENTER', 'COMMENTS']

    // Regular therapist sheets
    Object.entries(regularTherapists).sort(([a], [b]) => a.localeCompare(b)).forEach(([name, { payments, info }]) => {
      const sheetData = [
        [`${name} — ${monthName} ${year}`],
        ['Level:', info.level],
        [],
        headers,
        ...payments.map((p, idx) => {
          const row = idx + 5
          return [
            p.date,
            p.client_name,
            p.session_type,
            p.mop,
            p.reference,
            { f: `IF(C${row}="IE REPORT",0,IFERROR(VLOOKUP(C${row},RATES!$A:$B,2,FALSE),E${row}))` },
            { f: `IFERROR(VLOOKUP(C${row},RATES!$A:$G,MATCH($B$2,RATES!$C$1:$G$1,0)+2,FALSE),0)*IF(I${row}=-5%,0.95,1)` },
            { f: `IF(OR(C${row}="OT-IE", C${row}="ST-IE", C${row}="PT-IE", C${row}="SPED IE"),C${row}-(G${row}*2),IF(C${row}="IE REPORT",0,F${row}-G${row}))` },
            p.comments
          ]
        }),
        [],
        ['TOTALS', '', '', '', '',
          { f: `SUM(F5:F${payments.length + 4})` },
          { f: `SUM(G5:G${payments.length + 4})` },
          { f: `SUM(H5:H${payments.length + 4})` },
          ''
        ]
      ]
      const ws = XLSX.utils.aoa_to_sheet(sheetData)
      ws['!cols'] = [{ wch: 14 }, { wch: 24 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 20 }]
      XLSX.utils.book_append_sheet(wb, ws, name.substring(0, 31))
    })

    // Intern sheets
    Object.entries(internTherapists).forEach(([specialty, payments]) => {
      if (payments.length === 0) return
      const sheetData = [
        [`${specialty} INTERNS — ${monthName} ${year}`],
        [],
        headers,
        ...payments.map(p => {
          const total = p.amount || 0
          return [p.date, p.client_name, p.session_type, p.mop, p.reference, total, 0, total, p.comments]

        }),
        [],
        ['TOTALS', '', '', '', '',
          { f: `SUM(F4:F${payments.length + 3})` },
          0,
          { f: `SUM(H4:H${payments.length + 3})` },
          ''
        ]
      ]
      const ws = XLSX.utils.aoa_to_sheet(sheetData)
      ws['!cols'] = [{ wch: 14 }, { wch: 24 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 20 }]
      XLSX.utils.book_append_sheet(wb, ws, `${specialty} INTERNS`)
    })

    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="PTC_Payments_${monthName}_${year}.xlsx"`
      }
    })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}