// Shared session type definitions used across Sessions and Payments pages.
// Each entry has the stored value (matches backend RATES keys), the display
// label (handles renames like Cancellation Fee -> No Show), and the default amount.
//
// ⚠️ FEE/RATE CHANGES: This file is what staff SEE in dropdowns — it does
// NOT control actual backend calculations. If you change a rate or session
// type here, also update app/lib/constants.js, which is what the backend
// actually uses to calculate charges/payouts/exports.

export const SESSION_TYPES_BY_SPECIALTY = {
  OT: [
    { value: 'OT SESSION', label: 'OT Session', amount: 1200 },
    { value: 'OT-IE', label: 'Initial Evaluation', amount: 2800 },
    { value: 'OT-FE', label: 'Follow-up Evaluation', amount: 1500 },
    { value: 'SPECIALIZED OT TX', label: 'Specialized OT', amount: 1700 },
    { value: 'PR', label: 'Progress Report', amount: 750 },
    { value: 'PR-RUSHED', label: 'Progress Report (Rushed)', amount: 1000 },
    { value: 'IE REPORT', label: 'IE Report', amount: 0 },
    { value: 'Cancellation Fee', label: 'No Show', amount: 1200 },
    { value: 'Custom Amount', label: 'Custom Amount', amount: 0 },
  ],
  OT_INTERN: [
    { value: 'OT SESSION', label: 'OT Intern Session', amount: 600 },
    { value: 'OT-IE', label: 'Intern Evaluation', amount: 800 },
    { value: 'Cancellation Fee', label: 'No Show', amount: 600 },
    { value: 'Custom Amount', label: 'Custom Amount', amount: 0 },
  ],
  ST: [
    { value: 'ST SESSION', label: 'ST Session', amount: 1300 },
    { value: 'ST-IE', label: 'Initial Evaluation', amount: 2800 },
    { value: 'ST-FE', label: 'Follow-up Evaluation', amount: 1500 },
    { value: 'SPECIALIZED ST TX', label: 'Specialized ST', amount: 1700 },
    { value: 'PR', label: 'Progress Report', amount: 750 },
    { value: 'PR-RUSHED', label: 'Progress Report (Rushed)', amount: 1000 },
    { value: 'IE REPORT', label: 'IE Report', amount: 0 },
    { value: 'Cancellation Fee', label: 'No Show', amount: 1200 },
    { value: 'Custom Amount', label: 'Custom Amount', amount: 0 },
  ],
  ST_INTERN: [
    { value: 'ST SESSION', label: 'ST Intern Session', amount: 600 },
    { value: 'ST-IE', label: 'Intern Evaluation', amount: 800 },
    { value: 'Cancellation Fee', label: 'No Show', amount: 600 },
    { value: 'Custom Amount', label: 'Custom Amount', amount: 0 },
  ],
  PT: [
    { value: 'PT SESSION', label: 'PT Session', amount: 900 },
    { value: 'PT-IE', label: 'Initial Evaluation', amount: 2800 },
    { value: 'PT FE', label: 'Follow-up Evaluation', amount: 1500 },
    { value: 'Cancellation Fee', label: 'No Show', amount: 900 },
    { value: 'Custom Amount', label: 'Custom Amount', amount: 0 },
  ],
  SPED: [
    { value: 'SPED SESSION', label: 'SPED Tutorial', amount: 900 },
    { value: 'SPED IE', label: 'SPED Initial Evaluation', amount: 1500 },
    { value: 'SPED FE', label: 'SPED Follow-up Evaluation', amount: 1500 },
    { value: 'PLAYSCHOOL', label: 'Playgroup', amount: 750 },
    { value: 'Cancellation Fee', label: 'No Show', amount: 750 },
    { value: 'Custom Amount', label: 'Custom Amount', amount: 0 },
  ],
}

// Flat lookup of session type -> base rate, used for quick amount lookups
// (e.g. right-click context menu, payment settling).
export const SESSION_TYPE_RATES = {
  'OT SESSION': 1200, 'OT-IE': 2800, 'OT-FE': 1500, 'SPECIALIZED OT TX': 1700,
  'PR': 750, 'PR-RUSHED': 1000, 'IE REPORT': 0,
  'ST SESSION': 1300, 'ST-IE': 2800, 'ST-FE': 1500, 'SPECIALIZED ST TX': 1700,
  'PT SESSION': 900, 'PT-IE': 2800, 'PT FE': 1500,
  'SPED SESSION': 900, 'SPED IE': 1500, 'SPED FE': 1500, 'PLAYSCHOOL': 750,
  'Cancellation Fee': 1200, 'SUPERVISOR FEE': 0,
}

// Full flat dropdown list (value/label pairs) used by Payments page's
// session-type selectors (LedgerRow, SettleModal).
export const ALL_SESSION_TYPE_OPTIONS = [
  ['OT SESSION','OT SESSION'],['OT-IE','OT-IE'],['OT-FE','OT-FE'],['SPECIALIZED OT TX','SPECIALIZED OT TX'],
  ['ST SESSION','ST SESSION'],['ST-IE','ST-IE'],['ST-FE','ST-FE'],['SPECIALIZED ST TX','SPECIALIZED ST TX'],
  ['PT SESSION','PT SESSION'],['PT-IE','PT-IE'],['PT FE','PT FE'],
  ['SPED SESSION','SPED SESSION'],['SPED IE','SPED IE'],['SPED FE','SPED FE'],
  ['PLAYSCHOOL','PLAYSCHOOL'],['PR','PR'],['PR-RUSHED','PR-RUSHED'],['IE REPORT','IE REPORT'],
  ['Cancellation Fee','No Show Fee'],
  ['OT INTERN SESSION','OT INTERN SESSION'],['OT INTERN IE','OT INTERN IE'],
  ['ST INTERN SESSION','ST INTERN SESSION'],['ST INTERN IE','ST INTERN IE'],['PR INTERN','PR INTERN'],
  ['SUPERVISOR FEE','SUPERVISOR FEE']
]