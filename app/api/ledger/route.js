import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from '../../lib/sheets'
import { RATES, IE_SESSION_TYPES } from '../../lib/constants'
import { parsePHDate } from '../../lib/dates'
import { getTherapistFromCookie } from '../../lib/auth'

// From Jan 1, 2027: IE session and IE report professional fee is 850 for every level
const IE_FLAT_FROM = new Date('2027-01-01T00:00:00+08:00')
const IE_FLAT_TYPES = ['OT-IE', 'ST-IE', 'PT-IE', 'IE REPORT']

function calcRates(sessionType, level, recordedAmount, isIntern, comments, rateDate) {
  const type = sessionType?.toUpperCase().trim()

  if (type === 'Custom Amount') {
    return { total: recordedAmount || 0, therapistCut: null, center: null }
  }

  const rate = RATES[sessionType?.trim()]
  if (!rate) return { total: recordedAmount || 0, therapistCut: 0, center: recordedAmount || 0 }

  const total = type === 'IE REPORT' ? 0 : (recordedAmount || rate.full)
  let cut = rate.levels[level] || 0
  if (cut > 0 && IE_FLAT_TYPES.includes(type) && rateDate) {
    const d = parsePHDate(rateDate)
    if (d && d >= IE_FLAT_FROM) cut = 850
  }
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

    // --- action=pending_ie: IE reports not yet submitted, with the fee waiting ---
    if (action === 'pending_ie') {
      const reportData = await getSheetData('reports')
      const [, ...reportRows] = reportData
      const phToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
      const todayStart = new Date(phToday + 'T00:00:00+08:00')
      const todayLabel = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })
      const items = reportRows
        .filter(r => r && r[0] && r[6] === 'IE Report' && r[8] === 'Pending Submission')
        .map(r => {
          const therapist = r[2]
          const info = therapistMap[therapist]
          const level = resolveLevel(therapist, todayLabel, levelHistoryByTherapist, info?.level || 'JUNIOR 1')
          const fee = calcRates('IE REPORT', level, 0, false, '', todayLabel).therapistCut || 0
          const dl = r[5] ? new Date(r[5]) : null
          const validDl = dl && !isNaN(dl)
          const phDeadline = validDl ? dl.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }) : ''
          let ieDate = ''
          let daysLeft = null
          if (validDl) {
            daysLeft = Math.round((new Date(phDeadline + 'T00:00:00+08:00') - todayStart) / 86400000)
            const ie = new Date(phDeadline + 'T00:00:00Z')
            ie.setUTCMonth(ie.getUTCMonth() - 6)
            ieDate = ie.toISOString().split('T')[0]
          }
          return { therapist, client_name: r[1], ie_date: ieDate, deadline: phDeadline, days_left: daysLeft, fee }
        })
        .sort((a, b) => (a.days_left ?? 9999) - (b.days_left ?? 9999))
      return Response.json({ success: true, data: items })
    }

    // --- action=pending_held: entries marked PENDING with the cut-off pencil ---
    if (action === 'pending_held') {
      const paymentData = await getSheetData('payments')
      const [, ...payRows] = paymentData
      const TRACKING_TYPES = ['attendance', 'cancellation', 'credit_transfer', 'advance', 'refund', 'ie_report']
      const marked = payRows.filter(r => r && r[0] && r[16] === 'PENDING' && r[17] && weekSheets.includes(r[17]))
      const weekCache = {}
      const items = []
      for (const r of marked) {
        if (!weekCache[r[17]]) {
          const d = await getSheetData(r[17])
          weekCache[r[17]] = d.slice(1)
        }
        const wk = weekCache[r[17]].find(x => x && x[0] === r[3])
        if (!wk) continue
        const paid = !TRACKING_TYPES.includes(r[8])
        const info = therapistMap[wk[2]]
        const sessionType = (paid && r[6]) || wk[7] || 'Regular'
        const amount = paid ? parseFloat(r[4] || 0) : parseFloat(wk[11] || 0)
        const comments = paid ? (r[11] || '') : ''
        const level = resolveLevel(wk[2], wk[3], levelHistoryByTherapist, info?.level || 'JUNIOR 1')
        const rates = calcRates(sessionType, level, amount, info?.is_intern || false, comments, wk[3])
        const customCut = paid && r[12] !== undefined && r[12] !== '' ? parseFloat(r[12]) : null
        items.push({
          id: r[0],
          week_key: r[17],
          therapist: wk[2],
          client_name: wk[1],
          session_type: sessionType,
          date: wk[3],
          total: rates.total || 0,
          cut: customCut !== null ? customCut : (rates.therapistCut || 0)
        })
      }
      return Response.json({ success: true, data: items })
    }

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
    const paymentData = await getSheetData('payments')
    const [, ...payRows] = paymentData

    let relevantWeekSheets = monthFilter
      ? weekSheets.filter(wk => weekOverlapsMonth(wk, monthFilter))
      : weekSheets
    if (monthFilter) {
      const overrideWeekKeys = new Set()
      payRows.filter(r => r && r[0] && r[16] && r[17]).forEach(row => {
        if (dateInMonth(row[16], monthFilter) && weekSheets.includes(row[17])) {
          overrideWeekKeys.add(row[17])
        }
      })
      overrideWeekKeys.forEach(wk => {
        if (!relevantWeekSheets.includes(wk)) relevantWeekSheets.push(wk)
      })
    }

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
          custom_center: row[13] !== undefined && row[13] !== '' ? parseFloat(row[13]) : null,
          payment_timeliness: row[14] || '',
          actual_payment_date: row[15] || '',
          cutoff_date_override: row[16] || '',
          cutoff_week_key: row[17] || ''
        }
      }
    })

    // Separate lookup for unpaid sessions' "attendance"/"cancellation" tracking
    // rows — these exist purely as an anchor point for cutoff overrides before
    // an actual payment record exists. Kept separate from paymentMap on purpose:
    // paymentMap drives MOP/amount/comments display, and mixing these in would
    // leak "UNPAID" placeholder values into those fields.
    const trackingMap = {}
    payRows.filter(r => r && r[0] && (r[8] === 'attendance' || r[8] === 'cancellation')).forEach(row => {
      const sessionId = row[3]
      trackingMap[sessionId] = {
        tracking_id: row[0],
        custom_cut: row[12] !== undefined && row[12] !== '' ? parseFloat(row[12]) : null,
        custom_center: row[13] !== undefined && row[13] !== '' ? parseFloat(row[13]) : null,
        cutoff_date_override: row[16] || '',
        cutoff_week_key: row[17] || ''
      }
    })

    const allSessions = []
    const weekDataResults = await Promise.all(relevantWeekSheets.map(weekKey => getSheetData(weekKey)))

    relevantWeekSheets.forEach((weekKey, weekIdx) => {
      const data = weekDataResults[weekIdx]
      const [, ...rows] = data
      rows.filter(r => {
        if (!r || !r[0] || (r[8] !== 'Present' && r[8] !== 'Cancelled')) return false
        const payment = paymentMap[r[0]]
        const tracking = trackingMap[r[0]]
        const effectiveDate = payment?.cutoff_date_override || tracking?.cutoff_date_override || r[3]
        return dateInMonth(effectiveDate, monthFilter)
      }).forEach(row => {
        const sessionId = row[0]
        const therapistInfo = therapistMap[row[2]]
        const payment = paymentMap[sessionId]
        const tracking = trackingMap[sessionId]
        const sessionType = payment?.session_type || row[7] || 'Regular'
        const recordedAmount = payment ? payment.amount : parseFloat(row[11] || 0)
        const comments = payment?.comments || ''
        const resolvedLevel = resolveLevel(row[2], row[3], levelHistoryByTherapist, therapistInfo?.level || 'JUNIOR 1')
        const rates = calcRates(
          sessionType,
          resolvedLevel,
          recordedAmount,
          therapistInfo?.is_intern || false,
          comments,
          row[3]
        )
        const total = rates.total
        const customCutVal = payment?.custom_cut ?? tracking?.custom_cut ?? null
        const customCenterVal = payment?.custom_center ?? tracking?.custom_center ?? null
        const therapistCut = customCutVal !== null ? customCutVal : rates.therapistCut
        const center = customCenterVal !== null ? customCenterVal : rates.center
        const effectiveDate = payment?.cutoff_date_override || tracking?.cutoff_date_override || row[3]

        allSessions.push({
          id: sessionId,
          week_key: weekKey,
          index: rows.indexOf(row),
          client_name: row[1],
          therapist: row[2],
          date: effectiveDate,
          original_date: row[3],
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
          override_anchor_id: payment?.payment_id || tracking?.tracking_id || '',
          total,
          therapist_cut: therapistCut,
          normal_cut: rates.therapistCut,
          center,
          therapist_level: therapistInfo?.level || '',
          is_intern: therapistInfo?.is_intern || false,
          payment_timeliness: payment?.payment_timeliness || '',
          actual_payment_date: payment?.actual_payment_date || '',
          cutoff_overridden: !!(payment?.cutoff_date_override || tracking?.cutoff_date_override)
        })
      })
    })

    // IE reports
    const ieReports = payRows.filter(r => r && r[0] && r[8] === 'ie_report' && dateInMonth(r[7], monthFilter))
    ieReports.forEach(row => {
      const therapistName = row[2]
      const therapistInfo = therapistMap[therapistName]
      const level = resolveLevel(therapistName, row[7], levelHistoryByTherapist, therapistInfo?.level || 'JUNIOR 1')
      const cut = calcRates('IE REPORT', level, 0, false, '', row[7]).therapistCut || RATES['IE REPORT']?.levels[level] || 800

      // Late IE report (submitted after 6 months): forfeited, no therapist cut
      const isLateForfeit = row[12] !== undefined && row[12] !== '' && parseFloat(row[12]) === 0
      if (isLateForfeit) {
        const amt = cut   // same report fee the therapist would have received (800 / 850; 850 for all from Jan 2027)
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
          session_type: 'IE Report (Late – Forfeited)',
          status: 'Present',
          is_paid: true,
          mop: row[5] || '',
          reference: row[9] || '',
          comments: row[11] || `IE report submitted by ${therapistName} after 6 months`,
          payment_id: row[0],
          total: amt,
          therapist_cut: 0,
          normal_cut: 0,
          center: amt,
          therapist_level: '',
          is_intern: false,
          is_forfeit: true
        })
        return
      }
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

      // Prefer a manually-set custom cut/center/comments on the payment
      // record itself — same priority regular sessions already give their
      // own custom_cut/custom_center, so an edited "INTERN PR"-style entry
      // isn't silently overwritten by the standard rate calculation every
      // time the ledger reloads.
      const customCut = paymentRecord && paymentRecord[12] !== undefined && paymentRecord[12] !== '' ? parseFloat(paymentRecord[12]) : null
      const customCenter = paymentRecord && paymentRecord[13] !== undefined && paymentRecord[13] !== '' ? parseFloat(paymentRecord[13]) : null
      const docComments = (paymentRecord && paymentRecord[11]) || row[9] || ''

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
        comments: docComments,
        payment_id: paymentRecord ? paymentRecord[0] : '',
        total: rates.total || amount,
        therapist_cut: customCut !== null ? customCut : (rates.therapistCut || 0),
        normal_cut: rates.therapistCut || 0,
        center: customCenter !== null ? customCenter : (rates.center || 0),
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