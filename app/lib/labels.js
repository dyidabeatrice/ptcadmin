// Small shared helpers so "Cancelled"/"Cancellation Fee" (the real stored
// values, used everywhere internally) always display to users as the
// friendlier "No Show"/"No Show Fee" — without duplicating this translation
// logic across every page that shows a session's status or type as text.
export function statusLabel(status) {
  return status === 'Cancelled' ? 'No Show' : status
}

export function sessionTypeLabel(type) {
  return type === 'Cancellation Fee' ? 'No Show Fee' : type
}