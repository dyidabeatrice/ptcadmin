import { getSheetData, getGoogleSheets, SPREADSHEET_ID } from './sheets'

// Client balances live on the clients sheet: column J = credit, column K = outstanding.
// These run directly inside whichever route calls them (no extra HTTP call to
// /api/credits), and they THROW when the balance can't be updated, so the
// calling route reports the failure instead of silently skipping it.

export async function getClientRow(clientName) {
  const data = await getSheetData('clients')
  const [, ...rows] = data
  const index = rows.findIndex(r => r && r[1] === clientName)
  if (index === -1) return null
  return { index, row: rows[index] }
}

// Every failure message starts with this, so pages can tell "the balance step
// failed" apart from "the whole save failed".
export const BALANCE_ERROR_PREFIX = 'Balance NOT updated'

export async function updateClientBalances(clientName, creditDelta, outstandingDelta) {
  try {
    return await writeClientBalances(clientName, creditDelta, outstandingDelta)
  } catch (error) {
    throw new Error(`${BALANCE_ERROR_PREFIX} for "${clientName}": ${error.message}`)
  }
}

async function writeClientBalances(clientName, creditDelta, outstandingDelta) {
  const result = await getClientRow(clientName)
  if (!result) throw new Error('client not found on the clients sheet (check the spelling matches exactly)')

  const { index, row } = result
  const currentCredit = parseFloat(row[9] || 0)
  const currentOutstanding = parseFloat(row[10] || 0)
  const newCredit = Math.max(0, currentCredit + creditDelta)
  const newOutstanding = Math.max(0, currentOutstanding + outstandingDelta)
  const sheetRow = index + 2

  await getGoogleSheets().spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `clients!J${sheetRow}:K${sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[newCredit, newOutstanding]] }
  })

  return { newCredit, newOutstanding }
}

// Same as before: a blank client name is skipped (nothing to update).
export function addOutstanding(clientName, amount) {
  if (!clientName) return
  return updateClientBalances(clientName, 0, amount)
}

export function clearOutstanding(clientName, amount) {
  if (!clientName) return
  return updateClientBalances(clientName, 0, -amount)
}

// Deducts up to the client's known credit balance (never more than they have).
export function applyCredit(clientName, amount, creditBalance) {
  if (!clientName) return
  const safeCreditBalance = typeof creditBalance === 'number' ? creditBalance : 0
  const amountToDeduct = Math.min(amount, safeCreditBalance)
  return updateClientBalances(clientName, -amountToDeduct, 0)
}

export function absentCredit(clientName, amount) {
  if (!clientName) return
  return updateClientBalances(clientName, amount, 0)
}