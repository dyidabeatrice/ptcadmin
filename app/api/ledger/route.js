import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'
import { RATES } from '../../lib/constants'
import { parsePHDate } from '../../lib/dates'

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
      if (sessionId && !['attendance','cancellation','credit_transfer','advance','refund','ie_report'].includes(row[8])) {
        paymentMap[sessionId] = {
          payment_id: row[0],
          amount: parseFloat(row[4] || 0),
          mop: row[5] || '',
          session_type: row[6] || '',
          date: row[7] || '',
          payment_type: row[8] || '',
          reference: row[9] || '',
          verified_by: row[10] || '',
          comments: row[11] || '',
          custom_cut: row[12] !== undefined && row[12] !== '' ? parseFloat(row[12]) : null,
          custom_center: row[13] !== undefined && row[13] !== '' ? parseFloat(row[13]) : null
        }
      }
    })

    // Get all week sheets
    const weekSheets = spreadsheet.data.sheets
      .map(s => s.properties.title)
      .filter(t => t.startsWith('week_'))
      .sort()

    // Collect all Present/Cancelled sessions — fetch all weeks in parallel instead of one at a time
    const allSessions = []
    const weekDataResults = await Promise.all(weekSheets.map(weekKey => getSheetData(weekKey)))

    weekSheets.forEach((weekKey, weekIdx) => {
      const data = weekDataResults[weekIdx]
      const [, ...rows] = data
      rows.filter(r => r && r[0] && (r[8] === 'Present' || r[8] === 'Cancelled')).forEach(row => {
        const sessionId = row[0]
        const therapistInfo = therapistMap[row[2]]
        const payment = paymentMap[sessionId]
        const sessionType = payment?.session_type || row[7] || 'Regular'
        const recordedAmount = payment ? payment.amount : parseFloat(row[11] || 0)
        const comments = payment?.comments || ''
        const rates = calcRates(
          sessionType,
          therapistInfo?.level || 'JUNIOR 1',
          recordedAmount,
          therapistInfo?.is_intern || false,
          comments
        )
        const total = rates.total
        const therapistCut = payment?.custom_cut !== null && payment?.custom_cut !== undefined ? payment.custom_cut : rates.therapistCut
        const center = payment?.custom_center !== null && payment?.custom_center !== undefined ? payment.custom_center : rates.center

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
    })

// Fetch IE reports from payments sheet
const ieReports = payRows.filter(r => r && r[0] && (r[8] === 'ie_report'))
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

// Fetch supervisor fees from payments sheet
const supervisorFees = payRows.filter(r => r && r[0] && r[8] === 'supervisor_fee')
supervisorFees.forEach(row => {
  const therapistName = row[2]
  const customCut = row[12] !== undefined && row[12] !== '' ? parseFloat(row[12]) : 0
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
    session_type: 'SUPERVISOR FEE',
    status: 'Present',
    is_paid: true,
    mop: row[5] || '',
    reference: row[9] || '',
    comments: row[11] || '',
    payment_id: row[0],
    total: 0,
    therapist_cut: customCut,
    center: 0,
    therapist_level: '',
    is_intern: false,
    is_ie_report: false
  })
})

    // Fetch paid document requests
    const reportData = await getSheetData('reports')
    const [, ...reportRows] = reportData
    reportRows.filter(r => r && r[0] && r[8] === 'Completed' && r[6] !== 'IE Report').forEach(row => {
      const therapistName = row[2]
      const therapistInfo = therapistMap[therapistName]
      const level = therapistInfo?.level || 'JUNIOR 1'
      const amount = parseFloat(row[7] || 0)

      // Find matching payment record for date and mop
      const paymentRecord = payRows.find(p => p && p[3] === `DOC-${row[0]}`)
      const payDate = row[13] || (paymentRecord ? paymentRecord[7] : row[4])
      const mop = paymentRecord ? paymentRecord[5] : ''
      const reference = paymentRecord ? paymentRecord[9] : ''
      const rates = calcRates(row[6], level, amount, '')

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
        total: rates.total || amount,
        therapist_cut: rates.therapistCut || 0,
        center: rates.center || 0,
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

      const d = parsePHDate(s.date)
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
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}