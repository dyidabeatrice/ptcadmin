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