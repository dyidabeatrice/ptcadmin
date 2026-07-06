const BASE_URL = process.env.NEXT_PUBLIC_URL || 'https://potentialstherapycenter.com/'

async function callCreditsApi(action, clientName, amount, extra = {}) {
  if (!clientName) return
  try {
    await fetch(`${BASE_URL}/api/credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, client_name: clientName, amount, ...extra })
    })
  } catch (error) {
    console.error(`Credits API call failed (${action}):`, error)
  }
}

export function addOutstanding(clientName, amount) {
  return callCreditsApi('add_outstanding', clientName, amount)
}

export function clearOutstanding(clientName, amount) {
  return callCreditsApi('clear_outstanding', clientName, amount)
}

export function applyCredit(clientName, amount, creditBalance) {
  return callCreditsApi('apply_credit', clientName, amount, { credit_balance: creditBalance })
}

export function absentCredit(clientName, amount) {
  return callCreditsApi('absent_credit', clientName, amount)
}