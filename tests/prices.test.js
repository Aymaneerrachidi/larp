import test from 'node:test'
import assert from 'node:assert/strict'
import { getUsdPrice } from '../server/prices.js'

const config = { priceChain: 'test-market', pricePair: '0x1111111111111111111111111111111111111111', tokenAddress: '0x2222222222222222222222222222222222222222', minimumLiquidityUsd: 10000 }
function response(body, options = {}) { return new Response(JSON.stringify(body), { headers: { Date: new Date().toUTCString(), ...options }, status: 200 }) }

test('ETH pricing verifies USD currency and rejects stale upstream replies', async t => {
  t.mock.method(globalThis, 'fetch', async url => { assert.equal(url, 'https://api.coinbase.com/v2/prices/ETH-USD/spot'); return response({ data: { currency: 'USD', amount: '2500', base: 'ETH' } }) })
  assert.equal((await getUsdPrice('ETH', config)).price, '2500')
  globalThis.fetch = async () => response({ data: { currency: 'EUR', amount: '2500' } })
  await assert.rejects(getUsdPrice('ETH', config), /verify/)
  globalThis.fetch = async () => response({ data: { currency: 'USD', amount: '2500' } }, { Age: '300' })
  await assert.rejects(getUsdPrice('ETH', config), /stale/)
})

test('LARP quotes require the exact approved market, base token and minimum liquidity', async t => {
  const pair = { chainId: config.priceChain, pairAddress: config.pricePair, baseToken: { address: config.tokenAddress }, priceUsd: '0.001', liquidity: { usd: 50000 } }
  t.mock.method(globalThis, 'fetch', async () => response({ pairs: [pair] }))
  assert.equal((await getUsdPrice('LARP', config)).price, '0.001')
  for (const patch of [{ pairAddress: 'other' }, { chainId: 'other' }, { baseToken: { address: 'other' } }, { liquidity: { usd: 99 } }]) {
    globalThis.fetch = async () => response({ pairs: [{ ...pair, ...patch }] })
    await assert.rejects(getUsdPrice('LARP', config))
  }
})

test('automatic discovery uses exact CA and chain, chooses deepest valid market, supports V4 pool IDs', async t => {
  const automatic = { ...config, pricePair: '' }
  const pair = { chainId: config.priceChain, pairAddress: `0x${'a'.repeat(64)}`, baseToken: { address: config.tokenAddress }, priceUsd: '0.002', liquidity: { usd: 50000 } }
  t.mock.method(globalThis, 'fetch', async url => {
    assert.equal(url, `https://api.dexscreener.com/token-pairs/v1/${config.priceChain}/${config.tokenAddress}`)
    return response([
      { ...pair, chainId: 'wrong', liquidity: { usd: 900000 } },
      { ...pair, baseToken: { address: 'impostor' }, liquidity: { usd: 900000 } },
      { ...pair, priceUsd: 'NaN', liquidity: { usd: 900000 } },
      { ...pair, priceUsd: '0.001', liquidity: { usd: 12000 } }, pair,
    ])
  })
  assert.equal((await getUsdPrice('LARP', automatic)).price, '0.002')
  globalThis.fetch = async () => response([])
  await assert.rejects(getUsdPrice('LARP', automatic), /Use ETH/)
})
