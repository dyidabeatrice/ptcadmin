import * as XLSX from 'xlsx'
import { RATES } from '../../lib/constants'
import { parsePHDate } from '../../lib/dates'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    if (!month) return Response.json({ success: false, error: 'Month required' })

    const [year, monthNum] = month.split('-').map(Number)
    const monthName = new Date(year, monthNum - 1).toLocaleString('en-PH', { month: 'long' })

    // Fetch ledger data — same as frontend
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://potentialstherapycenter.com'
    const ledgerRes = await fetch(`${baseUrl}/api/ledger`)
    const ledgerJson = await ledgerRes.json()
    if (!ledgerJson.success) return Response.json({ success: false, error: 'Failed to fetch ledger' })

    const ledger = ledgerJson.data
    const therapists = ledgerJson.therapists

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

    const headers = ['DATE', 'CLIENT NAME', 'TYPE OF SERVICE', 'MOP', 'REFERENCE NO.', 'TOTAL', 'THERAPIST CUT', 'CENTER', 'COMMENTS']

    // Group OT/ST interns
    const internSessions = { OT: [], ST: [] }
    const regularTherapists = therapists.filter(t => !t.includes('INTERNS'))

    for (const therapistName of therapists) {
      const therapistData = ledger[therapistName]
      if (!therapistData) continue

      // Filter sessions for the selected month
      const allSessions = []
      Object.entries(therapistData).forEach(([monthKey, monthData]) => {
        const [mYear, mMonth] = monthKey.split('-').map(Number)
        if (mYear !== year || mMonth !== monthNum) return
        Object.values(monthData.dates).forEach(sessions => {
          allSessions.push(...sessions)
        })
      })

      if (allSessions.length === 0) continue

      // Sort by date
      allSessions.sort((a, b) => (parsePHDate(a.date) || new Date(0)) - (parsePHDate(b.date) || new Date(0)))

      if (therapistName === 'OT INTERNS') {
        internSessions.OT.push(...allSessions)
        continue
      }
      if (therapistName === 'ST INTERNS') {
        internSessions.ST.push(...allSessions)
        continue
      }

      // Regular therapist sheet
      const rows = allSessions.map(s => [
        s.date,
        s.client_name,
        s.session_type,
        s.mop || '',
        s.reference || '',
        s.total || 0,
        s.therapist_cut || 0,
        s.center || 0,
        s.comments || ''
      ])

      const totalRow = allSessions.length + 5
      const sheetData = [
        [`${therapistName} — ${monthName} ${year}`],
        [],
        headers,
        ...rows,
        [],
        ['TOTALS', '', '', '', '',
          allSessions.reduce((sum, s) => sum + (s.total || 0), 0),
          allSessions.reduce((sum, s) => sum + (s.therapist_cut || 0), 0),
          allSessions.reduce((sum, s) => sum + (s.center || 0), 0),
          ''
        ]
      ]

      const ws = XLSX.utils.aoa_to_sheet(sheetData)
      ws['!cols'] = [{ wch: 14 }, { wch: 24 }, { wch: 20 }, { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 20 }]
      XLSX.utils.book_append_sheet(wb, ws, therapistName.substring(0, 31))
    }

    // Intern sheets
    for (const [specialty, sessions] of Object.entries(internSessions)) {
      if (sessions.length === 0) continue
      const rows = sessions.map(s => [
        s.date,
        s.client_name,
        s.session_type,
        s.mop || '',
        s.reference || '',
        s.total || 0,
        s.therapist_cut || 0,
        s.center || 0,
        s.comments || ''
      ])
      const sheetData = [
        [`${specialty} INTERNS — ${monthName} ${year}`],
        [],
        headers,
        ...rows,
        [],
        ['TOTALS', '', '', '', '',
          sessions.reduce((sum, s) => sum + (s.total || 0), 0),
          sessions.reduce((sum, s) => sum + (s.therapist_cut || 0), 0),
          sessions.reduce((sum, s) => sum + (s.center || 0), 0),
          ''
        ]
      ]
      const ws = XLSX.utils.aoa_to_sheet(sheetData)
      ws['!cols'] = [{ wch: 14 }, { wch: 24 }, { wch: 20 }, { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 20 }]
      XLSX.utils.book_append_sheet(wb, ws, `${specialty} INTERNS`)
    }

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