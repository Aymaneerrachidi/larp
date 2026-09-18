import { HttpError } from './config.js'

export async function priceJson(url, headers = {}) {
  let response
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache', ...headers },
      redirect: 'error', signal: AbortSignal.timeout(10000),
    })
  } catch { throw new HttpError(503, 'A live price is unavailable. No payment was requested.') }
  if (!response.ok) throw new HttpError(503, 'A live price is unavailable. No payment was requested.')
  const date = Date.parse(response.headers.get('date') || '')
  const age = Number(response.headers.get('age') || 0)
  if (!Number.isFinite(date) || Math.abs(Date.now() - date) > 120000 || !Number.isFinite(age) || age < 0 || age > 60) throw new HttpError(503, 'The price response is stale. Try again shortly.')
  try { return await response.json() }
  catch { throw new HttpError(503, 'The price response could not be verified. No payment was requested.') }
}

export const isPoolAddress = value => typeof value === 'string' && /^0x(?:[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/.test(value)
export const isUsdPrice = value => typeof value === 'string' && value.length <= 100 && /^\d+(\.\d+)?$/.test(value) && Number.isFinite(Number(value)) && Number(value) > 0

// Market-cap metadata uses decimal integers, never floating-point payment math.
export function decimalProduct(left, right) {
  if (![left, right].every(value => typeof value === 'string' && value.length <= 100 && /^\d+(\.\d+)?$/.test(value))) return null
  const decimals = [left, right].reduce((sum, value) => sum + (value.split('.')[1]?.length || 0), 0)
  const raw = (BigInt(left.replace('.', '')) * BigInt(right.replace('.', ''))).toString().padStart(decimals + 1, '0')
  return decimals ? `${raw.slice(0, -decimals)}.${raw.slice(-decimals)}`.replace(/\.?0+$/, '') : raw
}
