import { randomUUID } from 'node:crypto'
import { HttpError } from './config.js'
import { priceJson, isPoolAddress, isUsdPrice, decimalProduct } from './price-http.js'

// Query-only OpenAPI auth. No trading key, swap endpoint or wallet credentials.
// Protocol: https://github.com/GMGNAI/gmgn-skills/tree/main/src/client
export async function getGmgnMarket(config) {
  if (!config.gmgnApiKey || config.network?.chainId !== 4663 || !/^0x[a-f0-9]{40}$/.test(config.tokenAddress)) {
    throw new HttpError(503, 'GMGN pricing is not configured for this token and network.')
  }
  const url = new URL('https://openapi.gmgn.ai/v1/token/info')
  url.search = new URLSearchParams({ chain: 'robinhood', address: config.tokenAddress, timestamp: String(Math.floor(Date.now() / 1000)), client_id: randomUUID() })
  const result = await priceJson(url.toString(), { 'X-APIKEY': config.gmgnApiKey })
  const token = result.data
  if (result.code !== 0 || !token || token.address?.toLowerCase() !== config.tokenAddress
    || (token.chain && token.chain !== 'robinhood')
    || token.price?.address?.toLowerCase() !== config.tokenAddress
    || (token.pool?.base_address && token.pool.base_address.toLowerCase() !== config.tokenAddress)) {
    throw new HttpError(503, 'GMGN could not verify the configured LARP token.')
  }
  const pairAddress = token.pool?.pool_address?.toLowerCase()
  const liquidity = token.pool?.liquidity
  if (!isPoolAddress(pairAddress) || (config.pricePair && pairAddress !== config.pricePair)
    || !['number', 'string'].includes(typeof liquidity) || !Number.isFinite(Number(liquidity)) || Number(liquidity) < config.minimumLiquidityUsd
    || !isUsdPrice(token.price.price)) {
    throw new HttpError(503, 'No eligible LARP market is available from GMGN. Use ETH instead.')
  }
  return {
    price: token.price.price, source: 'GMGN / Robinhood Chain', pairAddress,
    liquidityUsd: String(liquidity),
    marketCapUsd: decimalProduct(token.price.price, String(token.circulating_supply ?? '')),
    fetchedAt: Date.now(),
  }
}
