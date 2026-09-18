import { HttpError } from './config.js'
import { priceJson, isPoolAddress, isUsdPrice } from './price-http.js'
import { getGmgnMarket } from './gmgn.js'

export async function getUsdPrice(currency, config) {
  if (currency === 'ETH') {
    const result = await priceJson('https://api.coinbase.com/v2/prices/ETH-USD/spot')
    if (result.data?.currency !== 'USD' || (result.data.base && result.data.base !== 'ETH')) throw new HttpError(503, 'Could not verify the ETH price.')
    return { price: result.data.amount, source: 'Coinbase ETH/USD spot' }
  }
  if (currency !== 'LARP' || !/^[a-z0-9-]+$/.test(config.priceChain) || !/^0x[a-f0-9]{40}$/.test(config.tokenAddress)
    || (config.pricePair && !/^0x(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(config.pricePair))) throw new HttpError(503, 'LARP payment quotes are not available yet.')
  try { return await getDexScreenerMarket(config) }
  catch (error) {
    if (!config.gmgnApiKey || config.network?.chainId !== 4663) throw error
    try { return await getGmgnMarket(config) }
    catch { throw new HttpError(503, 'LARP pricing is unavailable from both providers. No payment was requested. Use ETH or retry later.') }
  }
}

async function getDexScreenerMarket(config) {
  const url = config.pricePair
    ? `https://api.dexscreener.com/latest/dex/pairs/${config.priceChain}/${config.pricePair}`
    : `https://api.dexscreener.com/token-pairs/v1/${config.priceChain}/${config.tokenAddress}`
  const result = await priceJson(url)
  const markets = config.pricePair ? result.pairs : result
  const pair = (Array.isArray(markets) ? markets : []).filter(item =>
    item.chainId === config.priceChain
    && isPoolAddress(item.pairAddress)
    && (!config.pricePair || item.pairAddress.toLowerCase() === config.pricePair)
    && item.baseToken?.address?.toLowerCase() === config.tokenAddress
    && Number.isFinite(item.liquidity?.usd) && item.liquidity.usd >= config.minimumLiquidityUsd
    && isUsdPrice(item.priceUsd)
  ).sort((a, b) => b.liquidity.usd - a.liquidity.usd)[0]
  if (!pair) throw new HttpError(503, 'No eligible LARP market is indexed with sufficient liquidity yet. Use ETH instead.')
  return { price: pair.priceUsd, source: `DEX Screener / ${pair.dexId || 'LARP market'}`, pairAddress: pair.pairAddress,
    liquidityUsd: String(pair.liquidity.usd), marketCapUsd: Number.isFinite(pair.marketCap) && pair.marketCap >= 0 ? String(pair.marketCap) : null, fetchedAt: Date.now() }
}
