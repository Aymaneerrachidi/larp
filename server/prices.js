import { HttpError } from './config.js'

async function priceJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new HttpError(503, 'A live price is unavailable. No payment was requested.')
  const date = Date.parse(response.headers.get('date') || '')
  const age = Number(response.headers.get('age') || 0)
  if (!Number.isFinite(date) || Math.abs(Date.now() - date) > 120000 || !Number.isFinite(age) || age > 60) throw new HttpError(503, 'The price response is stale. Try again shortly.')
  return response.json()
}

export async function getUsdPrice(currency, config) {
  if (currency === 'ETH') {
    const result = await priceJson('https://api.coinbase.com/v2/prices/ETH-USD/spot')
    if (result.data?.currency !== 'USD' || (result.data.base && result.data.base !== 'ETH')) throw new HttpError(503, 'Could not verify the ETH price.')
    return { price: result.data.amount, source: 'Coinbase ETH/USD spot' }
  }
  if (currency !== 'LARP' || !/^[a-z0-9-]+$/.test(config.priceChain) || !/^0x[a-f0-9]{40}$/.test(config.tokenAddress)
    || (config.pricePair && !/^0x(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(config.pricePair))) throw new HttpError(503, 'LARP payment quotes are not available yet.')
  const url = config.pricePair
    ? `https://api.dexscreener.com/latest/dex/pairs/${config.priceChain}/${config.pricePair}`
    : `https://api.dexscreener.com/token-pairs/v1/${config.priceChain}/${config.tokenAddress}`
  const result = await priceJson(url)
  const markets = config.pricePair ? result.pairs : result
  const pair = (Array.isArray(markets) ? markets : []).filter(item =>
    item.chainId === config.priceChain
    && /^0x(?:[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/.test(item.pairAddress || '')
    && (!config.pricePair || item.pairAddress.toLowerCase() === config.pricePair)
    && item.baseToken?.address?.toLowerCase() === config.tokenAddress
    && Number.isFinite(item.liquidity?.usd) && item.liquidity.usd >= config.minimumLiquidityUsd
    && typeof item.priceUsd === 'string' && /^\d+(\.\d+)?$/.test(item.priceUsd) && Number(item.priceUsd) > 0
  ).sort((a, b) => b.liquidity.usd - a.liquidity.usd)[0]
  if (!pair) throw new HttpError(503, 'No eligible LARP market is indexed with sufficient liquidity yet. Use ETH instead.')
  return { price: pair.priceUsd, source: `DEX Screener / ${pair.dexId || 'LARP market'}`, pairAddress: pair.pairAddress }
}
