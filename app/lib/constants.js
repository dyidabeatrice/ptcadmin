// ⚠️ FEE/RATE CHANGES: This file controls backend calculations (what gets
// charged, what therapists get paid, the Excel export). If you change a
// rate or session type here, also update app/lib/sessionTypes.js — that
// file controls what staff SEE in the dropdowns on Schedule/Payments pages.
// The two files can't be merged (frontend vs backend code), so both need
// to be updated together to avoid numbers not matching what's displayed.

export const SPECIALTY_RATES = {
  OT: 1200,
  ST: 1300,
  PT: 900,
  SPED: 900,
}

export const IE_SESSION_TYPES = ['OT-IE', 'ST-IE', 'PT-IE', 'SPED IE']

export function getDefaultSessionType(specialty) {
  if (specialty === 'ST') return 'ST SESSION'
  if (specialty === 'PT') return 'PT SESSION'
  if (specialty === 'SPED') return 'SPED SESSION'
  return 'OT SESSION'
}

export const RATES = {
  'OT SESSION':        { full: 1200, levels: { 'JUNIOR 1': 830, 'JUNIOR 2': 850, 'JUNIOR 3': 900, 'SENIOR 1': 850, 'SENIOR 2': 900 } },
  'OT-IE':             { full: 2800, levels: { 'JUNIOR 1': 800, 'JUNIOR 2': 800, 'JUNIOR 3': 800, 'SENIOR 1': 850, 'SENIOR 2': 850 } },
  'OT-FE':             { full: 1500, levels: { 'JUNIOR 1': 830, 'JUNIOR 2': 850, 'JUNIOR 3': 900, 'SENIOR 1': 850, 'SENIOR 2': 900 } },
  'SPECIALIZED OT TX': { full: 1700, levels: { 'JUNIOR 1': 1300, 'JUNIOR 2': 1300, 'JUNIOR 3': 1300, 'SENIOR 1': 1300, 'SENIOR 2': 1300 } },
  'ST SESSION':        { full: 1300, levels: { 'JUNIOR 1': 830, 'JUNIOR 2': 850, 'JUNIOR 3': 900, 'SENIOR 1': 850, 'SENIOR 2': 900 } },
  'ST-IE':             { full: 2800, levels: { 'JUNIOR 1': 800, 'JUNIOR 2': 800, 'JUNIOR 3': 800, 'SENIOR 1': 850, 'SENIOR 2': 850 } },
  'ST-FE':             { full: 1500, levels: { 'JUNIOR 1': 830, 'JUNIOR 2': 850, 'JUNIOR 3': 900, 'SENIOR 1': 850, 'SENIOR 2': 900 } },
  'SPECIALIZED ST TX': { full: 1700, levels: { 'JUNIOR 1': 1300, 'JUNIOR 2': 1300, 'JUNIOR 3': 1300, 'SENIOR 1': 1300, 'SENIOR 2': 1300 } },
  'PT SESSION':        { full: 900,  levels: { 'JUNIOR 1': 525, 'JUNIOR 2': 525, 'JUNIOR 3': 525, 'SENIOR 1': 525, 'SENIOR 2': 650 } },
  'PT-IE':             { full: 2800, levels: { 'JUNIOR 1': 800, 'JUNIOR 2': 800, 'JUNIOR 3': 800, 'SENIOR 1': 850, 'SENIOR 2': 850 } },
  'PT FE':             { full: 1500, levels: { 'JUNIOR 1': 525, 'JUNIOR 2': 525, 'JUNIOR 3': 525, 'SENIOR 1': 525, 'SENIOR 2': 525 } },
  'SPED SESSION':      { full: 900,  levels: { 'JUNIOR 1': 600, 'JUNIOR 2': 600, 'JUNIOR 3': 600, 'SENIOR 1': 600, 'SENIOR 2': 600 } },
  'SPED IE':           { full: 1800, levels: { 'JUNIOR 1': 600, 'JUNIOR 2': 600, 'JUNIOR 3': 600, 'SENIOR 1': 600, 'SENIOR 2': 600 } },
  'SPED FE':           { full: 1500, levels: { 'JUNIOR 1': 525, 'JUNIOR 2': 525, 'JUNIOR 3': 525, 'SENIOR 1': 525, 'SENIOR 2': 525 } },
  'PLAYSCHOOL':        { full: 750,  levels: { 'JUNIOR 1': 525, 'JUNIOR 2': 525, 'JUNIOR 3': 525, 'SENIOR 1': 525, 'SENIOR 2': 525 } },
  'PR':                { full: 750,  levels: { 'JUNIOR 1': 450, 'JUNIOR 2': 450, 'JUNIOR 3': 450, 'SENIOR 1': 450, 'SENIOR 2': 450 } },
  'PR-RUSHED':         { full: 1000, levels: { 'JUNIOR 1': 600, 'JUNIOR 2': 600, 'JUNIOR 3': 600, 'SENIOR 1': 600, 'SENIOR 2': 600 } },
  'IE REPORT':         { full: 0,    levels: { 'JUNIOR 1': 800, 'JUNIOR 2': 800, 'JUNIOR 3': 800, 'SENIOR 1': 850, 'SENIOR 2': 850 } },
  'Cancellation Fee':  { full: 1200, levels: { 'JUNIOR 1': 700, 'JUNIOR 2': 700, 'JUNIOR 3': 700, 'SENIOR 1': 700, 'SENIOR 2': 700 } },
  'OT INTERN SESSION': { full: 600, levels: { 'JUNIOR 1': 360, 'JUNIOR 2': 360, 'JUNIOR 3': 360, 'SENIOR 1': 360, 'SENIOR 2': 360 } },
  'OT INTERN IE':      { full: 800, levels: { 'JUNIOR 1': 460, 'JUNIOR 2': 460, 'JUNIOR 3': 460, 'SENIOR 1': 460, 'SENIOR 2': 460 } },
  'ST INTERN SESSION': { full: 600, levels: { 'JUNIOR 1': 360, 'JUNIOR 2': 360, 'JUNIOR 3': 360, 'SENIOR 1': 360, 'SENIOR 2': 360 } },
  'ST INTERN IE':      { full: 800, levels: { 'JUNIOR 1': 460, 'JUNIOR 2': 460, 'JUNIOR 3': 460, 'SENIOR 1': 460, 'SENIOR 2': 460 } },
  'PR INTERN':         { full: 300, levels: { 'JUNIOR 1': 0,   'JUNIOR 2': 0,   'JUNIOR 3': 0,   'SENIOR 1': 0,   'SENIOR 2': 0 } },
  'SUPERVISOR FEE':    { full: 0,    levels: { 'JUNIOR 1': 0,   'JUNIOR 2': 0,   'JUNIOR 3': 0,   'SENIOR 1': 0,   'SENIOR 2': 0 } },
}