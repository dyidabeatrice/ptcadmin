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
  'PT SESSION':     { full: 900,  levels: { 'JUNIOR 1': 525, 'JUNIOR 2': 525, 'JUNIOR 3': 525, 'SENIOR 1': 525, 'SENIOR 2': 525 } },
  'PT-IE':          { full: 2800, levels: { 'JUNIOR 1': 800, 'JUNIOR 2': 800, 'JUNIOR 3': 800, 'SENIOR 1': 850, 'SENIOR 2': 850 } },
  'PT FE':          { full: 1500, levels: { 'JUNIOR 1': 525, 'JUNIOR 2': 525, 'JUNIOR 3': 525, 'SENIOR 1': 525, 'SENIOR 2': 525 } },
  'SPED SESSION':   { full: 900,  levels: { 'JUNIOR 1': 600, 'JUNIOR 2': 600, 'JUNIOR 3': 600, 'SENIOR 1': 600, 'SENIOR 2': 600 } },
  'SPED IE':        { full: 1500, levels: { 'JUNIOR 1': 600, 'JUNIOR 2': 600, 'JUNIOR 3': 600, 'SENIOR 1': 600, 'SENIOR 2': 600 } },
  'SPED FE':        { full: 1500, levels: { 'JUNIOR 1': 525, 'JUNIOR 2': 525, 'JUNIOR 3': 525, 'SENIOR 1': 525, 'SENIOR 2': 525 } },
  'PLAYSCHOOL':     { full: 750,  levels: { 'JUNIOR 1': 525, 'JUNIOR 2': 525, 'JUNIOR 3': 525, 'SENIOR 1': 525, 'SENIOR 2': 525 } },
  'PR-INTERN':      { full: 300,  levels: { 'JUNIOR 1': 0, 'JUNIOR 2': 0, 'JUNIOR 3': 0, 'SENIOR 1': 0, 'SENIOR 2': 0 } },
  'OT INTERN SESSION': { full: 600, levels: { 'JUNIOR 1': 360, 'JUNIOR 2': 360, 'JUNIOR 3': 360, 'SENIOR 1': 360, 'SENIOR 2': 360 } },
  'OT INTERN IE':   { full: 800, levels: { 'JUNIOR 1': 460, 'JUNIOR 2': 460, 'JUNIOR 3': 460, 'SENIOR 1': 460, 'SENIOR 2': 460 } },
  'ST INTERN SESSION': { full: 600, levels: { 'JUNIOR 1': 360, 'JUNIOR 2': 360, 'JUNIOR 3': 360, 'SENIOR 1': 360, 'SENIOR 2': 360 } },
  'ST INTERN IE':   { full: 800, levels: { 'JUNIOR 1': 460, 'JUNIOR 2': 460, 'JUNIOR 3': 460, 'SENIOR 1': 460, 'SENIOR 2': 460 } },
  'PR INTERN':      { full: 300, levels: { 'JUNIOR 1': 200, 'JUNIOR 2': 200, 'JUNIOR 3': 200, 'SENIOR 1': 200, 'SENIOR 2': 200 } },
}

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
      const parseDate = (d) => {
        if (!d) return new Date(0)
        const months = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 }
        const p = d.replace(',','').split(' ')
        return p.length !== 3 ? new Date(0) : new Date(parseInt(p[2]), months[p[0]], parseInt(p[1]))
      }
      allSessions.sort((a, b) => parseDate(a.date) - parseDate(b.date))

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