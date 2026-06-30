const MONTHS = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 }

// Standard display format used everywhere, e.g. "Jun 30, 2026"
export function formatPHDate(date = new Date()) {
  return date.toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric'
  })
}

// Same as above but with time, e.g. "Jun 30, 2026, 09:15 AM"
export function formatPHDateTime(date = new Date()) {
  return date.toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// Parses strings like "Jun 30, 2026" back into a Date object
export function parsePHDate(dateStr) {
  if (!dateStr) return null
  const parts = dateStr.replace(',', '').split(' ')
  if (parts.length !== 3) return null
  const month = MONTHS[parts[0]]
  if (month === undefined) return null
  return new Date(parseInt(parts[2]), month, parseInt(parts[1]))
}