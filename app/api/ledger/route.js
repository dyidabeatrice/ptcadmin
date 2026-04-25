import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'

const RATES = {
  'OT SESSION':        { full: 1200, levels: { 'JUNIOR 1': 830, 'JUNIOR 2': 850, 'JUNIOR 3': 900, 'SENIOR 1': 850, 'SENIOR 2': 900 } },
  'OT-IE':             { full: 2800, levels: { 'JUNIOR 1': 800, 'JUNIOR 2': 800, 'JUNIOR 3': 800, 'SENIOR 1': 850, 'SENIOR 2': 850 } },
  'OT-FE':             { full: 1500, levels: { 'JUNIOR 1': 830, 'JUNIOR 2': 850, 'JUNIOR 3': 900, 'SENIOR 1': 850, 'SENIOR 2': 900 } },
  'SPECIALIZED OT TX': { full: 1700, levels: { 'JUNIOR 1': 1300, 'JUNIOR 2': 1300, 'JUNIOR 3': 1300, 'SENIOR 1': 1300, 'SENIOR 2': 1300 } },
  'ST SESSION':        { full: 1300, levels: { 'JUNIOR 1': 830, 'JUNIOR 2': 850, 'JUNIOR 3': 900, 'SENIOR 1': 850, 'SENIOR 2': 900 } },
  'ST-IE':             { full: 2800, levels: { 'JUNIOR 1': 800, 'JUNIOR 2': 800, 'JUNIOR 3': 800, 'SENIOR 1': 850, 'SENIOR 2': 850 } },
  'ST-FE':             { full: 1500, levels: { 'JUNIOR 1': 830, 'JUNIOR 2': 850, 'JUNIOR 3': 900, 'SENIOR 1': 850, 'SENIOR 2': 900 } },
  'SPECIALIZED ST TX': { full: 1700, levels: { 'JUNIOR 1': 1300, 'JUNIOR 2': 1300, 'JUNIOR 3': 1300, 'SENIOR 1': 1300, 'SENIOR 2': 1300 } },
  'PT SESSION':        { full: 900,  levels: { 'JUNIOR 1': 525, 'JUNIOR 2': 525, 'JUNIOR 3': 525, 'SENIOR 1': 525, 'SENIOR 2': 525 } },
  'PT-IE':             { full: 2800, levels: { 'JUNIOR 1': 800, 'JUNIOR 2': 800, 'JUNIOR 3': 800, 'SENIOR 1': 850, 'SENIOR 2': 850 } },
  'PT FE':             { full: 1500, levels: { 'JUNIOR 1': 525, 'JUNIOR 2': 525, 'JUNIOR 3': 525, 'SENIOR 1': 525, 'SENIOR 2': 525 } },
  'SPED SESSION':      { full: 900,  levels: { 'JUNIOR 1': 600, 'JUNIOR 2': 600, 'JUNIOR 3': 600, 'SENIOR 1': 600, 'SENIOR 2': 600 } },
  'SPED IE':           { full: 1500, levels: { 'JUNIOR 1': 600, 'JUNIOR 2': 600, 'JUNIOR 3': 600, 'SENIOR 1': 600, 'SENIOR 2': 600 } },
  'SPED FE':           { full: 1500, levels: { 'JUNIOR 1': 525, 'JUNIOR 2': 525, 'JUNIOR 3': 525, 'SENIOR 1': 525, 'SENIOR 2': 525 } },
  'PLAYSCHOOL':        { full: 750,  levels: { 'JUNIOR 1': 525, 'JUNIOR 2': 525, 'JUNIOR 3': 525, 'SENIOR 1': 525, 'SENIOR 2': 525 } },
  'PR':                { full: 750,  levels: { 'JUNIOR 1': 450, 'JUNIOR 2': 450, 'JUNIOR 3': 450, 'SENIOR 1': 450, 'SENIOR 2': 450 } },
  'PR-RUSHED':         { full: 1000, levels: { 'JUNIOR 1': 600, 'JUNIOR 2': 600, 'JUNIOR 3': 600, 'SENIOR 1': 600, 'SENIOR 2': 600 } },
  'IE REPORT':         { full: 0,    levels: { 'JUNIOR 1': 800, 'JUNIOR 2': 800, 'JUNIOR 3': 800, 'SENIOR 1': 850, 'SENIOR 2': 850 } },
  'Cancellation Fee':  { full: 0,    levels: { 'JUNIOR 1': 0, 'JUNIOR 2': 0, 'JUNIOR 3': 0, 'SENIOR 1': 0, 'SENIOR 2': 0 } },
  'OT INTERN SESSION': { full: 600, levels: { 'JUNIOR 1': 360, 'JUNIOR 2': 360, 'JUNIOR 3': 360, 'SENIOR 1': 360, 'SENIOR 2': 360 } },
  'OT INTERN IE':      { full: 800, levels: { 'JUNIOR 1': 460, 'JUNIOR 2': 460, 'JUNIOR 3': 460, 'SENIOR 1': 460, 'SENIOR 2': 460 } },
  'ST INTERN SESSION': { full: 600, levels: { 'JUNIOR 1': 360, 'JUNIOR 2': 360, 'JUNIOR 3': 360, 'SENIOR 1': 360, 'SENIOR 2': 360 } },
  'ST INTERN IE':      { full: 800, levels: { 'JUNIOR 1': 460, 'JUNIOR 2': 460, 'JUNIOR 3': 460, 'SENIOR 1': 460, 'SENIOR 2': 460 } },
  'PR INTERN':         { full: 300, levels: { 'JUNIOR 1': 200, 'JUNIOR 2': 200, 'JUNIOR 3': 200, 'SENIOR 1': 200, 'SENIOR 2': 200 } },
}

function parseDate(dateStr) {
  if (!dateStr) return null
  const months = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 }
  const parts = dateStr.replace(',', '').split(' ')
  if (parts.length !== 3) return null
  return new Date(parseInt(parts[2]), months[parts[0]], parseInt(parts[1]))
}

function calcRates(sessionType, level, recordedAmount, isIntern, comments) {
  const type = sessionType?.toUpperCase().trim()

  if (isIntern) {
    const isIE = type === 'OT-IE' || type === 'ST-IE' || type === 'PT-IE' || type === 'SPED IE'
    const total = isIE ? 800 : (recordedAmount || 600)
    return { total, therapistCut: 0, center: total }
  }

  if (type === 'Custom Amount') {
    return { total: recordedAmount || 0, therapistCut: null, center: null }
  }

  const rate = RATES[sessionType?.trim()]
  if (!rate) return { total: recordedAmount || 0, therapistCut: 0, center: recordedAmount || 0 }

  const total = type === 'IE REPORT' ? 0 : (recordedAmount || rate.full)
  const cut = rate.levels[level] || 0
  const hasDeduction = comments?.includes('-5%')
  const therapistCut = hasDeduction ? Math.round(cut * 0.95) : cut

  const isIESession = ['OT-IE','ST-IE','PT-IE','SPED IE'].includes(sessionType?.trim())
  const center = isIESession ? total - (therapistCut * 2) : total - therapistCut

  return { total, therapistCut, center }
}

export async function GET() {
  try {
    const sheets = getGoogleSheets()

    // Fetch all data in parallel
    const [therapistData, paymentData, spreadsheet] = await Promise.all([
      getSheetData('therapists!A:I'),
      getSheetData('payments'),
      sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
    ])

    // Build therapist map
    const [, ...therapistRows] = therapistData
    const therapistMap = {}
    therapistRows.filter(r => r && r[0]).forEach(row => {
      const name = row[1]
      if (!therapistMap[name]) {
        therapistMap[name] = {
          name,
          specialty: row[2] || 'OT',
          is_intern: row[3] === 'TRUE',
          level: row[8] || 'JUNIOR 1'
        }
      }
    })

    // Build payment map keyed by session_id
    const [, ...payRows] = paymentData
    const paymentMap = {}
    payRows.filter(r => r && r[0]).forEach(row => {
      const sessionId = row[3]
      if (sessionId && !['attendance','cancellation','credit_transfer'].includes(row[8])) {
        paymentMap[sessionId] = {
          payment_id: row[0],
          amount: parseFloat(row[4] || 0),
          mop: row[5] || '',
          session_type: row[6] || '',
          date: row[7] || '',
          payment_type: row[8] || '',
          reference: row[9] || '',
          verified_by: row[10] || '',
          comments: row[11] || ''
        }
      }
    })

    // Get all week sheets
    const weekSheets = spreadsheet.data.sheets
      .map(s => s.properties.title)
      .filter(t => t.startsWith('week_'))
      .sort()

    // Collect all Present/Cancelled sessions
    const allSessions = []
    for (const weekKey of weekSheets) {
      const data = await getSheetData(weekKey)
      const [, ...rows] = data
      rows.filter(r => r && r[0] && (r[8] === 'Present' || r[8] === 'Cancelled')).forEach(row => {
        const sessionId = row[0]
        const therapistInfo = therapistMap[row[2]]
        const payment = paymentMap[sessionId]
        const sessionType = payment?.session_type || row[7] || 'Regular'
        const recordedAmount = payment ? payment.amount : parseFloat(row[11] || 0)
        const comments = payment?.comments || ''
        const { total, therapistCut, center } = calcRates(
          sessionType,
          therapistInfo?.level || 'JUNIOR 1',
          recordedAmount,
          therapistInfo?.is_intern || false,
          comments
        )

        allSessions.push({
          id: sessionId,
          week_key: weekKey,
          index: rows.indexOf(row),
          client_name: row[1],
          therapist: row[2],
          date: row[3],
          day: row[4],
          time_start: row[5],
          time_end: row[6],
          session_type: sessionType,
          status: row[8],
          is_paid: row[9] === 'Paid',
          mop: payment?.mop || '',
          reference: payment?.reference || '',
          comments: comments,
          payment_id: payment?.payment_id || '',
          total,
          therapist_cut: therapistCut,
          center,
          therapist_level: therapistInfo?.level || '',
          is_intern: therapistInfo?.is_intern || false
        })
      })
    }

// Fetch IE reports from payments sheet
const ieReports = payRows.filter(r => r && r[0] && r[8] === 'ie_report')
ieReports.forEach(row => {
  const therapistName = row[2]
  const therapistInfo = therapistMap[therapistName]
  const level = therapistInfo?.level || 'JUNIOR 1'
  const cut = RATES['IE REPORT']?.levels[level] || 800
  allSessions.push({
    id: row[0],
    week_key: null,
    index: null,
    client_name: row[1],
    therapist: therapistName,
    date: row[7],
    day: '',
    time_start: '',
    time_end: '',
    session_type: 'IE REPORT',
    status: 'Present',
    is_paid: true,
    mop: row[5] || '',
    reference: row[9] || '',
    comments: row[11] || '',
    payment_id: row[0],
    total: 0,
    therapist_cut: cut,
    center: 0,
    therapist_level: level,
    is_intern: false,
    is_ie_report: true
  })
})

    // Fetch paid document requests
    const reportData = await getSheetData('reports')
    const [, ...reportRows] = reportData
    reportRows.filter(r => r && r[0] && (r[8] === 'Ready for Release' || r[8] === 'Completed')).forEach(row => {
      const therapistName = row[2]
      const therapistInfo = therapistMap[therapistName]
      const level = therapistInfo?.level || 'JUNIOR 1'
      const amount = parseFloat(row[7] || 0)

      // Find matching payment record for date and mop
      const paymentRecord = payRows.find(p => p && p[3] === `DOC-${row[0]}`)
      const payDate = paymentRecord ? paymentRecord[7] : row[4]
      const mop = paymentRecord ? paymentRecord[5] : ''
      const reference = paymentRecord ? paymentRecord[9] : ''

      allSessions.push({
        id: `DOC-${row[0]}`,
        week_key: null,
        index: null,
        client_name: row[1],
        therapist: therapistName,
        date: payDate,
        day: '',
        time_start: '',
        time_end: '',
        session_type: row[6] || 'Document',
        status: 'Present',
        is_paid: true,
        mop,
        reference,
        comments: row[9] || '',
        payment_id: paymentRecord ? paymentRecord[0] : '',
        total: amount,
        therapist_cut: 0,
        center: amount,
        therapist_level: level,
        is_intern: false,
        is_document: true
      })
    })

    // Group by therapist → month → date
    const ledger = {}
    allSessions.forEach(s => {
    let therapist = s.therapist
    if (!therapist) return

    // Group all OT interns together, all ST interns together
    if (therapist.includes('OT INTERN')) therapist = 'OT INTERNS'
    else if (therapist.includes('ST INTERN')) therapist = 'ST INTERNS'

    if (!ledger[therapist]) ledger[therapist] = {}

      const d = parseDate(s.date)
      if (!d) return
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const monthLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

      if (!ledger[therapist][monthKey]) {
        ledger[therapist][monthKey] = { label: monthLabel, dates: {} }
      }

      const dateKey = s.date
      if (!ledger[therapist][monthKey].dates[dateKey]) {
        ledger[therapist][monthKey].dates[dateKey] = []
      }

      ledger[therapist][monthKey].dates[dateKey].push(s)
    })

    // Sort sessions within each date by time
    Object.values(ledger).forEach(months => {
      Object.values(months).forEach(month => {
        Object.values(month.dates).forEach(sessions => {
        sessions.sort((a, b) => {
          const toMin = t => {
            if (!t) return 0
            const [time, period] = t.split(' ')
            let [h, m] = time.split(':').map(Number)
            if (period === 'PM' && h !== 12) h += 12
            if (period === 'AM' && h === 12) h = 0
            return h * 60 + m
          }
          return toMin(a.time_start) - toMin(b.time_start)
        })
        })
      })
    })

    const allTherapists = Object.keys(therapistMap).sort()
    const regular = allTherapists.filter(t => !t.includes('INTERN'))
    const sorted = [...regular.sort(), 'OT INTERNS', 'ST INTERNS']

    return Response.json({ success: true, data: ledger, therapists: sorted })

    return Response.json({ success: true, data: ledger, therapists: sorted })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}