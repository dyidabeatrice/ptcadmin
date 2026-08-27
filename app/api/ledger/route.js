import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'
import { RATES, IE_SESSION_TYPES } from '../../lib/constants'
import { parsePHDate } from '../../lib/dates'
import { getTherapistFromCookie } from '../../lib/auth'

function calcRates(sessionType, level, recordedAmount, isIntern, comments) {
  const type = sessionType?.toUpperCase().trim()

  if (isIntern) {
    const isIE = IE_SESSION_TYPES.includes(type)
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

  const isIESession = IE_SESSION_TYPES.includes(sessionType?.trim())
  const center = isIESession ? total - (therapistCut * 2) : total - therapistCut

  return { total, therapistCut, center }
}

// Returns the level that was in effect for a therapist on a given date,
// based on level_history entries at or before that date. Falls back to
// their current `level` column value if no qualifying history exists —
// this covers all sessions predating this feature.
function resolveLevel(therapistName, sessionDateStr, levelHistoryByTherapist, fallbackLevel) {
  const history = levelHistoryByTherapist[therapistName]
  if (!history || history.length === 0) return fallbackLevel

  const sessionDate = parsePHDate(sessionDateStr)
  if (!sessionDate) return fallbackLevel

  let resolved = null
  for (const entry of history) {
    const effDate = parsePHDate(entry.effective_date)
    if (effDate && effDate <= sessionDate) resolved = entry.level
    else break
  }
  return resolved || fallbackLevel
}

// Whether a date string falls within the given 'YYYY-MM' month filter.
// A null/undefined filter means "no restriction" (unbounded — used by export).
function dateInMonth(dateStr, monthFilter) {
  if (!monthFilter) return true
  const d = parsePHDate(dateStr)
  if (!d) return false
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  return key === monthFilter
}

// Whether a week sheet's Monday–Saturday range overlaps the given month —
// used to decide which week sheets are even worth fetching for a month-scoped request.
function weekOverlapsMonth(weekKey, monthFilter) {
  if (!monthFilter) return true
  const parts = weekKey.replace('week_', '').split('_')
  const monday = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`)
  const saturday = new Date(monday)
  saturday.setDate(monday.getDate() + 5)
  const [my, mm] = monthFilter.split('-').map(Number)
  const monthStart = new Date(my, mm - 1, 1)
  const monthEnd = new Date(my, mm, 0)
  return monday <= monthEnd && saturday >= monthStart
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const monthFilter = searchParams.get('month') // 'YYYY-MM', or null for unbounded (full history)

    const sheets = getGoogleSheets()

    // Therapist roster + level history — small, always fetched in full regardless of month.
    const [therapistData, levelHistoryData, spreadsheet] = await Promise.all([
      getSheetData('therapists!A:I'),
      getSheetData('level_history'),
      sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
    ])

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

    const [, ...levelHistoryRows] = levelHistoryData
    const levelHistoryByTherapist = {}
    levelHistoryRows.filter(r => r && r[0]).forEach(row => {
      const name = row[1]
      if (!levelHistoryByTherapist[name]) levelHistoryByTherapist[name] = []
      levelHistoryByTherapist[name].push({ level: row[2], effective_date: row[3] })
    })
    Object.values(levelHistoryByTherapist).forEach(entries => {
      entries.sort((a, b) => (parsePHDate(a.effective_date) || new Date(0)) - (parsePHDate(b.effective_date) || new Date(0)))
    })

    const allTherapistNames = Object.keys(therapistMap).sort()
    const regular = allTherapistNames.filter(t => !t.includes('INTERN'))
    const sortedTherapists = [...regular.sort(), 'OT INTERNS', 'ST INTERNS', 'FORFEITED FEES']

    const weekSheets = spreadsheet.data.sheets
      .map(s => s.properties.title)
      .filter(t => t.startsWith('week_'))
      .sort()

    // --- action=months: cheap call, no session-level data fetched at all ---
    // Used by the frontend to render every month's header up front, before
    // deciding which one(s) to actually load data for.
    if (action === 'months') {
      const monthKeys = new Set()
      weekSheets.forEach(weekKey => {
        const parts = weekKey.replace('week_', '').split('_')
        const monday = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`)
        const saturday = new Date(monday)
        saturday.setDate(monday.getDate() + 5)
        monthKeys.add(`${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}`)
        monthKeys.add(`${saturday.getFullYear()}-${String(saturday.getMonth() + 1).padStart(2, '0')}`)
      })
      return Response.json({ success: true, months: [...monthKeys].sort(), therapists: sortedTherapists })
    }

    // --- Full data build (used for both unbounded/export and month-scoped requests) ---

    const relevantWeekSheets = monthFilter
      ? weekSheets.filter(wk => weekOverlapsMonth(wk, monthFilter))
      : weekSheets

    const paymentData = await getSheetData('payments')
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

    const allSessions = []
    const weekDataResults = await Promise.all(relevantWeekSheets.map(weekKey => getSheetData(weekKey)))

    relevantWeekSheets.forEach((weekKey, weekIdx) => {
      const data = weekDataResults[weekIdx]
      const [, ...rows] = data
      rows.filter(r => r && r[0] && (r[8] === 'Present' || r[8] === 'Cancelled') && dateInMonth(r[3], monthFilter)).forEach(row => {
        const sessionId = row[0]
        const therapistInfo = therapistMap[row[2]]
        const payment = paymentMap[sessionId]
        const sessionType = payment?.session_type || row[7] || 'Regular'
        const recordedAmount = payment ? payment.amount : parseFloat(row[11] || 0)
        const comments = payment?.comments || ''
        const resolvedLevel = resolveLevel(row[2], row[3], levelHistoryByTherapist, therapistInfo?.level || 'JUNIOR 1')
        const rates = calcRates(
          sessionType,
          resolvedLevel,
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
          normal_cut: rates.therapistCut,
          center,
          therapist_level: therapistInfo?.level || '',
          is_intern: therapistInfo?.is_intern || false
        })
      })
    })

    // IE reports
    const ieReports = payRows.filter(r => r && r[0] && r[8] === 'ie_report' && dateInMonth(r[7], monthFilter))
    ieReports.forEach(row => {
      const therapistName = row[2]
      const therapistInfo = therapistMap[therapistName]
      const level = resolveLevel(therapistName, row[7], levelHistoryByTherapist, therapistInfo?.level || 'JUNIOR 1')
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
        normal_cut: cut,
        center: 0,
        therapist_level: level,
        is_intern: false,
        is_ie_report: true
      })
    })

    // Supervisor fees
    const supervisorFees = payRows.filter(r => r && r[0] && r[8] === 'supervisor_fee' && dateInMonth(r[7], monthFilter))
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
        normal_cut: customCut,
        center: 0,
        therapist_level: '',
        is_intern: false,
        is_ie_report: false
      })
    })

    // Forfeited (non-refunded) reservation fees
    const forfeitedFees = payRows.filter(r => r && r[0] && r[8] === 'forfeit' && dateInMonth(r[7], monthFilter))
    forfeitedFees.forEach(row => {
      const amount = parseFloat(row[4] || 0)
      allSessions.push({
        id: row[0],
        week_key: null,
        index: null,
        client_name: row[1],
        therapist: 'FORFEITED FEES',
        date: row[7],
        day: '',
        time_start: '',
        time_end: '',
        session_type: 'Reservation Fee (Forfeited)',
        status: 'Present',
        is_paid: true,
        mop: row[5] || '',
        reference: row[9] || '',
        comments: row[11] || '',
        payment_id: row[0],
        total: amount,
        therapist_cut: 0,
        normal_cut: 0,
        center: amount,
        therapist_level: '',
        is_intern: false,
        is_forfeit: true
      })
    })

    // Paid document requests
    const reportData = await getSheetData('reports')
    const [, ...reportRows] = reportData
    reportRows.filter(r => r && r[0] && r[8] === 'Completed' && r[6] !== 'IE Report').forEach(row => {
      const therapistName = row[2]
      const therapistInfo = therapistMap[therapistName]
      const amount = parseFloat(row[7] || 0)

      const paymentRecord = payRows.find(p => p && p[3] === `DOC-${row[0]}`)
      const payDate = row[13] || (paymentRecord ? paymentRecord[7] : row[4])
      if (!dateInMonth(payDate, monthFilter)) return

      const level = resolveLevel(therapistName, payDate, levelHistoryByTherapist, therapistInfo?.level || 'JUNIOR 1')
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
        normal_cut: rates.therapistCut || 0,
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

    return Response.json({ success: true, data: ledger, therapists: sortedTherapists })
  } catch (error) {
    return Response.json({ success: false, error: error.message })
  }
}