// Client-side fetch wrapper with automatic retry for transient failures
// (Sheets API timeouts, cold-start delays, rate limits, etc).
// Returns the same { success, data, error } shape your API routes already use,
// so existing `if (json.success)` checks in pages don't need to change —
// only the fetch call itself does.
export async function fetchJSON(url, options = {}, retries = 2, delayMs = 800) {
  let lastResult = { success: false, error: 'Unknown error' }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options)
      const json = await res.json()
      if (json.success) return json
      lastResult = json // API responded but reported failure (e.g. Sheets API error) — worth retrying
    } catch (err) {
      lastResult = { success: false, error: err.message || 'Network error' } // fetch itself failed/timed out
    }
    if (attempt < retries) {
      await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)))
    }
  }

  return lastResult // all attempts failed — caller can now show a real error state
}
// Sends a save request (PATCH/POST/DELETE) and TELLS staff if it failed,
// instead of failing silently. `what` names the action for the message,
// e.g. 'Payment' or 'Status change'. Returns the JSON response.
// If only the balance step failed (the save itself went through), the
// message says so, so nobody records the same payment twice.
export async function saveJSON(url, method, body, what = 'Saving') {
  let json
  try {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    json = await res.json()
  } catch (err) {
    json = { success: false, error: err.message || 'No response from the server' }
  }
  if (!json.success) {
    const balanceOnly = typeof json.error === 'string' && json.error.startsWith('Balance NOT updated')
    alert(balanceOnly
      ? `${what} was saved, but the client's balance was NOT updated.\n\n${json.error}\n\nDo NOT record it again. Check the client's outstanding balance (Schedule → "Recalculate outstanding" can correct it).`
      : `${what} failed: ${json.error}\n\nPlease refresh the page and check before trying again.`)
  }
  return json
}