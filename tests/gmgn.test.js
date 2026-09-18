import test from 'node:test'
import assert from 'node:assert/strict'
import { getUsdPrice } from '../server/prices.js'
import { getGmgnMarket } from '../server/gmgn.js'
import { decimalProduct } from '../server/price-http.js'
import { getConfig, publicConfig } from '../server/config.js'

const tokenAddress = `0x${'1'.repeat(40)}`, pairAddress = `0x${'2'.repeat(64)}`
const config = { tokenAddress, priceChain: 'robinhood', pricePair: '', gmgnApiKey: 'test-key', network: { chainId: 4663 }, minimumLiquidityUsd: 10000 }
const token = () => ({ address: tokenAddress, price: { address: tokenAddress, price: '0.000123456789' }, circulating_supply: '1000000000', pool: { pool_address: pairAddress, base_address: tokenAddress, liquidity: '25000.50' } })
const response = (data, options = {}) => new Response(JSON.stringify({ code: 0, data }), { headers: { Date: new Date().toUTCString(), ...options } })

test('DEX remains primary; GMGN fallback sends secret only to its API and calculates market cap', async t => {
  let calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push(new URL(url).hostname)
    if (url.includes('dexscreener')) { assert.equal(options.headers['X-APIKEY'], undefined); return new Response('unavailable', { status: 503 }) }
    const request = new URL(url)
    assert.equal(request.origin, 'https://openapi.gmgn.ai')
    assert.equal(request.pathname, '/v1/token/info')
    assert.equal(request.searchParams.get('chain'), 'robinhood')
    assert.equal(request.searchParams.get('address'), tokenAddress)
    assert.ok(Math.abs(Number(request.searchParams.get('timestamp')) * 1000 - Date.now()) < 2000)
    assert.match(request.searchParams.get('client_id'), /^[a-f0-9-]{36}$/)
    assert.equal(options.headers['X-APIKEY'], 'test-key')
    assert.equal(options.redirect, 'error')
    assert.equal(request.href.includes('test-key'), false)
    return response(token())
  })
  const result = await getUsdPrice('LARP', config)
  assert.deepEqual(calls, ['api.dexscreener.com', 'openapi.gmgn.ai'])
  assert.equal(result.price, '0.000123456789')
  assert.equal(result.marketCapUsd, '123456.789')
  assert.equal(result.liquidityUsd, '25000.50')
  assert.equal(result.source, 'GMGN / Robinhood Chain')
  calls = []
  globalThis.fetch = async url => { calls.push(url); return new Response(JSON.stringify([{ chainId: 'robinhood', pairAddress, baseToken: { address: tokenAddress }, priceUsd: '0.001', liquidity: { usd: 30000 }, marketCap: 1000000 }]), { headers: { Date: new Date().toUTCString() } }) }
  assert.equal((await getUsdPrice('LARP', config)).marketCapUsd, '1000000')
  assert.equal(calls.length, 1)
})

test('GMGN rejects wrong token/network, mismatched pinned pool, bad price, low liquidity and stale replies', async t => {
  t.mock.method(globalThis, 'fetch', async () => response(token()))
  for (const patch of [{ address: 'wrong' }, { chain: 'sol' }, { price: { address: 'wrong', price: '1' } }, { price: { address: tokenAddress, price: 'NaN' } }, { pool: { ...token().pool, base_address: 'wrong' } }, { pool: { ...token().pool, liquidity: '99' } }]) {
    globalThis.fetch = async () => response({ ...token(), ...patch })
    await assert.rejects(getGmgnMarket(config))
  }
  globalThis.fetch = async () => response(token())
  await assert.rejects(getGmgnMarket({ ...config, pricePair: `0x${'3'.repeat(40)}` }))
  await assert.rejects(getGmgnMarket({ ...config, network: { chainId: 46630 } }))
  globalThis.fetch = async () => response(token(), { Age: '300' })
  await assert.rejects(getGmgnMarket(config), /stale/)
})

test('both price providers failing stops payment quotes without leaking credentials or upstream errors', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('upstream echoed test-key') })
  await assert.rejects(getUsdPrice('LARP', config), error => error.status === 503 && /both providers/.test(error.message) && !error.message.includes('test-key'))
  const settings = publicConfig(getConfig({ GMGN_API_KEY: 'test-key', APP_ORIGIN: 'http://localhost:5173' }))
  assert.equal(JSON.stringify(settings).includes('test-key'), false)
})

test('market cap metadata uses exact decimals and does not replace unit price', () => {
  assert.equal(decimalProduct('0.0000000123456789', '100000000000'), '1234.56789')
  assert.equal(decimalProduct('0.5', '0'), '0')
  assert.equal(decimalProduct('100', '10'), '1000')
  assert.equal(decimalProduct('NaN', '1000'), null)
})
