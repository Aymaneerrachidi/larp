import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'
import { privateKeyToAccount } from 'viem/accounts'
import { encodeFunctionData, encodeEventTopics, encodeAbiParameters, erc20Abi } from 'viem'
import { createHandler } from '../api/studio.js'
import { getConfig, publicConfig } from '../server/config.js'
import { MemoryStore } from '../server/store.js'
import { challengeFor, verifyChallenge, sessionCookie, readSessionCookie } from '../server/auth.js'
import { reserveExport, getAccess, quotaKeys } from '../server/access.js'
import { toRawAmount, quoteRawAmount, paidKey, validatePaymentTransaction, RobinhoodService } from '../server/robinhood.js'
import { validateCard } from '../server/render.js'

const account = () => privateKeyToAccount(`0x${randomBytes(32).toString('hex')}`)
const token = '0x1111111111111111111111111111111111111111'
const treasury = '0x2222222222222222222222222222222222222222'
const configured = () => getConfig({ APP_ORIGIN: 'http://localhost:5173', SESSION_SECRET: 'test-secret-with-more-than-thirty-two-characters', ROBINHOOD_CHAIN_ID: '4663', LARP_TOKEN_ADDRESS: token, LARP_TREASURY_WALLET: treasury })

test('Robinhood defaults and missing token configuration fail closed', () => {
  const config = getConfig({ APP_ORIGIN: 'http://localhost:5173' })
  assert.equal(config.network.chainId, 4663)
  assert.equal(config.holdMinimum, '1000000')
  assert.equal(config.priceUsd, '10')
  assert.equal(config.paymentHours, 24)
  assert.equal(publicConfig(config).holdEnabled, false)
  assert.equal(publicConfig(config).payEnabled, false)
  assert.equal(getConfig({ APP_ORIGIN: 'http://localhost:5173', ROBINHOOD_CHAIN_ID: '46630' }).network.testnet, true)
  assert.throws(() => getConfig({ APP_ORIGIN: 'http://localhost:5173', ROBINHOOD_CHAIN_ID: '1' }))
  assert.throws(() => getConfig({ NODE_ENV: 'production', APP_ORIGIN: 'https://example.com' }))
  assert.throws(() => getConfig({ APP_ORIGIN: 'http://localhost:5173', ACCESS_TEST_MODE: 'true' }))
  assert.throws(() => getConfig({ APP_ORIGIN: 'http://localhost:5173', ACCESS_TEST_MODE: 'true', ACCESS_NAMESPACE: 'production' }))
  assert.equal(publicConfig(getConfig({ APP_ORIGIN: 'http://localhost:5173', ACCESS_TEST_MODE: 'true', ACCESS_NAMESPACE: 'test-token' })).testMode, true)
})

test('sign-in is domain/chain bound, expires, and rejects another wallet signature', async () => {
  const owner = account(), attacker = account()
  const challenge = challengeFor(owner.address, configured())
  assert.match(challenge.message, /localhost:5173 wants you to sign in/)
  assert.match(challenge.message, /Chain ID: 4663/)
  const signature = await owner.signMessage({ message: challenge.message })
  assert.equal(await verifyChallenge(challenge, signature), owner.address.toLowerCase())
  await assert.rejects(verifyChallenge(challenge, await attacker.signMessage({ message: challenge.message })), /Signature/)
  await assert.rejects(verifyChallenge({ ...challenge, expiresAt: new Date(0).toISOString() }, signature), /expired/)
  await assert.rejects(verifyChallenge({ ...challenge, message: challenge.message.replace('4663', '46630') }, signature), /Signature/)
})

test('session cookie tampering is rejected', () => {
  const config = configured(), id = 'a'.repeat(48)
  const cookie = sessionCookie(id, config)
  assert.equal(readSessionCookie(cookie, config.secret), id)
  assert.equal(readSessionCookie(cookie.replace('larp_session=a', 'larp_session=b'), config.secret), null)
  assert.equal(readSessionCookie(cookie, 'wrong-secret'), null)
})

test('concurrent requests reserve exactly three free exports', async () => {
  const store = new MemoryStore(), config = configured(), chain = { holds: async () => false }
  const results = await Promise.allSettled(Array.from({ length: 12 }, () => reserveExport(store, chain, config, 'guest', null)))
  assert.equal(results.filter(x => x.status === 'fulfilled').length, 3)
  assert.equal(await store.get('usage:guest:guest'), '3')
})

test('linking another session cannot reset wallet quota; refund restores both counters', async () => {
  const store = new MemoryStore(), config = configured(), wallet = account().address.toLowerCase(), chain = { holds: async () => false }
  await store.set('usage:guest:old', 3)
  await store.eval('merge', quotaKeys('old', wallet))
  await store.eval('merge', quotaKeys('new', wallet))
  await assert.rejects(reserveExport(store, chain, config, 'new', wallet), error => error.status === 402)
  await store.eval('refund', quotaKeys('new', wallet))
  await reserveExport(store, chain, config, 'new', wallet)
  assert.equal(await store.get(`usage:wallet:${wallet}`), '3')
})

test('holder balance is rechecked; selling removes access; RPC errors do not unlock', async () => {
  const store = new MemoryStore(), config = configured(), wallet = account().address.toLowerCase()
  await store.set('usage:guest:g', 3)
  let holds = true
  const chain = { holds: async () => holds }
  assert.equal((await reserveExport(store, chain, config, 'g', wallet)).keys, null)
  holds = false
  await assert.rejects(reserveExport(store, chain, config, 'g', wallet), error => error.status === 402)
  await assert.rejects(reserveExport(store, { holds: async () => { throw Error('RPC down') } }, config, 'g', wallet), error => error.status === 503)
})

test('confirmed payments are credited once and are isolated by chain', async () => {
  const store = new MemoryStore(), config = configured(), wallet = account().address.toLowerCase(), now = Date.now(), duration = 86400000
  const keys = ['payment:hash', paidKey(config, wallet), 'invoice-used:id']
  const results = await Promise.all(Array.from({ length: 10 }, () => store.eval('credit', keys, [now, duration])))
  assert.ok(results.every(value => value === now + duration))
  const access = await getAccess(store, {}, config, 'g', wallet)
  assert.equal(access.unlocked, true)
  assert.notEqual(paidKey(config, wallet), paidKey({ ...config, network: { chainId: 46630 } }, wallet))
  await store.set(paidKey(config, wallet), Date.now() - 1)
  assert.equal((await getAccess(store, { holds: async () => false }, config, 'g', wallet)).unlocked, false)
})

test('decimal amounts retain precision and reject invalid/rounded amounts', () => {
  assert.equal(toRawAmount('9007199254740993.123456789012345678', 18), 9007199254740993123456789012345678n)
  assert.throws(() => toRawAmount('1.0001', 3))
  assert.throws(() => toRawAmount('-1', 18))
  assert.throws(() => toRawAmount('0', 18))
  assert.throws(() => toRawAmount('1e10', 18))
})

test('isolated holder testing accepts 15,000 tokens while normal access still requires 1 million', async () => {
  const config = getConfig({ APP_ORIGIN: 'http://localhost:5173', ACCESS_TEST_MODE: 'true', ACCESS_NAMESPACE: 'test-holdings', LARP_TOKEN_ADDRESS: token })
  const store = new MemoryStore(), service = new RobinhoodService(config), wallet = account().address.toLowerCase()
  assert.equal(publicConfig(config).holdMinimum, '15000')
  const minimum = 15000n * 10n ** 18n
  let balance = 20000n * 10n ** 18n
  service.client = { getChainId: async () => 4663, readContract: async ({ functionName }) => functionName === 'decimals' ? 18 : balance }
  await store.set('usage:guest:holder-test', 3)
  assert.equal((await reserveExport(store, service, config, 'holder-test', wallet)).keys, null)
  balance = minimum
  assert.equal((await getAccess(store, service, config, 'holder-test', wallet)).holder, true)
  balance = minimum - 1n
  await assert.rejects(reserveExport(store, service, config, 'holder-test', wallet), error => error.status === 402)
  balance = 20000n * 10n ** 18n
  const normal = new RobinhoodService(configured())
  normal.client = service.client
  assert.equal(normal.config.holdMinimum, '1000000')
  assert.equal(await normal.holds(wallet), false)
})

test('$10 quotes round up without floating-point underpayments', () => {
  assert.equal(quoteRawAmount('10', '2500', 18), 4000000000000000n)
  assert.equal(quoteRawAmount('10', '0.00001', 18), 1000000000000000000000000n)
  assert.equal(quoteRawAmount('10', '3', 6), 3333334n)
  assert.throws(() => quoteRawAmount('10', '0', 18))
  assert.throws(() => quoteRawAmount('10', 'NaN', 18))
})

test('ETH payments check the exact value, recipient, network, nonce and quote expiry', () => {
  const { quote, transaction, receipt, included } = paymentFixture()
  quote.currency = 'ETH'; quote.rawAmount = '4000000000000000'
  quote.expiresAt = 200000
  quote.transaction = { to: treasury, data: '0x', value: `0x${4000000000000000n.toString(16)}` }
  transaction.to = treasury; transaction.input = '0x'; transaction.value = 4000000000000000n
  receipt.logs = []
  assert.doesNotThrow(() => validatePaymentTransaction(transaction, receipt, quote, { ...included, timestamp: 199n }))
  assert.throws(() => validatePaymentTransaction({ ...transaction, value: 1n }, receipt, quote, { ...included, timestamp: 199n }))
  assert.throws(() => validatePaymentTransaction(transaction, receipt, quote, { ...included, timestamp: 201n }), /expired/)
})

test('verification after quote expiry succeeds if payment was included on time', () => {
  const { quote, transaction, receipt, included } = paymentFixture()
  quote.expiresAt = 200000
  assert.doesNotThrow(() => validatePaymentTransaction(transaction, receipt, quote, { ...included, timestamp: 199n }))
})

function paymentFixture() {
  const wallet = account().address.toLowerCase()
  const data = encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [treasury, 10n] })
  const quote = { chainId: 4663, wallet, tokenAddress: token, treasury, nonce: 4, fromBlock: '10', rawAmount: '10', currency: 'LARP', transaction: { data, to: token, value: '0x0' } }
  const included = { number: 12n, hash: '0x' + 'b'.repeat(64), timestamp: 199n }
  const hash = '0x' + 'a'.repeat(64)
  const transaction = { hash, blockHash: included.hash, blockNumber: included.number, chainId: 4663, from: wallet, to: token, input: data, value: 0n, nonce: 4 }
  const receipt = { transactionHash: hash, blockHash: included.hash, status: 'success', blockNumber: 12n, logs: [{ address: token, topics: encodeEventTopics({ abi: erc20Abi, eventName: 'Transfer', args: { from: wallet, to: treasury } }), data: encodeAbiParameters([{ type: 'uint256' }], [10n]) }] }
  return { quote, transaction, receipt, included, hash }
}

test('payment receipt validation rejects wrong chain, sender, amount, recipient, nonce, missing logs and failed tx', () => {
  const { quote, transaction, receipt, included } = paymentFixture()
  assert.doesNotThrow(() => validatePaymentTransaction(transaction, receipt, quote, included))
  for (const patch of [{ chainId: 1 }, { from: treasury }, { to: treasury }, { input: '0x' }, { value: 1n }, { nonce: 3 }]) assert.throws(() => validatePaymentTransaction({ ...transaction, ...patch }, receipt, quote, included))
  assert.throws(() => validatePaymentTransaction(transaction, { ...receipt, status: 'reverted' }, quote, included))
  assert.throws(() => validatePaymentTransaction(transaction, { ...receipt, logs: [] }, quote, included))
  assert.throws(() => validatePaymentTransaction(transaction, { ...receipt, blockNumber: 9n }, quote, included))
  for (const block of [{ ...included, hash: '0x' + 'c'.repeat(64) }, { ...included, number: null }, { ...included, number: 13n }]) assert.throws(() => validatePaymentTransaction(transaction, receipt, quote, block), error => error.code === 'PAYMENT_PENDING')
})

test('ERC-20 balance reads verify the RPC network and exact configured contract', async () => {
  const config = configured(), service = new RobinhoodService(config)
  let chainId = 4663, balance = 1000000n
  service.client = { getChainId: async () => chainId, readContract: async options => { assert.equal(options.address, token); if (options.functionName === 'balanceOf') assert.equal(options.blockTag, 'latest'); return options.functionName === 'decimals' ? 0 : balance } }
  assert.equal(await service.holds(account().address), true)
  balance = 999999n
  assert.equal(await service.holds(account().address), false)
  chainId = 1
  await assert.rejects(service.holds(account().address), /wrong network/)
})

test('renderer input rejects remote URLs, SVGs and oversized payloads', () => {
  const body = { platformId: 'binance', values: { pair: 'TEST' } }
  assert.equal(validateCard(body).platformId, 'binance')
  for (const backgroundImage of ['https://example.com/a.png', 'http://169.254.169.254/', 'data:image/svg+xml;base64,PHN2Zz4=']) assert.throws(() => validateCard({ ...body, media: { backgroundImage } }))
  assert.throws(() => validateCard({ ...body, platformId: 'unknown' }))
  assert.throws(() => validateCard({ ...body, media: { backgroundImage: 'data:image/png;base64,' + 'A'.repeat(3_700_001) } }))
})

test('HTTP API: three exports, fourth denied, wallet proof, replay rejection and CSRF', async t => {
  const store = new MemoryStore(), config = configured()
  const owner = account()
  let holder = false, broken = false
  const handler = createHandler({ store, config, chain: { holds: async () => holder }, render: async () => { if (broken) throw Error('render failed'); return Buffer.from('png') } })
  const server = createServer(handler)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => server.close(resolve)))
  config.origin = `http://127.0.0.1:${server.address().port}`
  let cookie = ''
  const request = async (action, body, origin = config.origin) => {
    const response = await fetch(`${config.origin}/api/studio?action=${action}`, { method: body ? 'POST' : 'GET', headers: { cookie, origin, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
    cookie = response.headers.get('set-cookie')?.split(';')[0] || cookie
    return response
  }
  assert.equal((await (await request('status')).json()).freeRemaining, 3)
  const payload = { platformId: 'binance', values: { pair: 'TEST' } }
  broken = true
  assert.equal((await request('export', payload)).status, 503)
  assert.equal((await (await request('status')).json()).freeRemaining, 3)
  broken = false
  for (let i = 0; i < 3; i++) assert.equal((await request('export', payload)).status, 200)
  assert.equal((await request('export', payload)).status, 402)
  assert.equal((await request('challenge', { address: owner.address }, 'https://evil.example')).status, 403)
  const challenge = await (await request('challenge', { address: owner.address })).json()
  const signature = await owner.signMessage({ message: challenge.message })
  assert.equal((await request('verify', { signature })).status, 200)
  assert.equal((await request('verify', { signature })).status, 401)
  assert.equal((await request('export', payload)).status, 402)
  holder = true
  assert.equal((await request('export', payload)).status, 200)
  await request('logout', {})
  assert.equal((await request('export', payload)).status, 402)
})

test('successful ETH and LARP receipts unlock immediately without querying Ethereum finality', async () => {
  for (const currency of ['ETH', 'LARP']) {
    const { quote, transaction, receipt, included, hash } = paymentFixture()
    if (currency === 'ETH') {
      quote.currency = 'ETH'; quote.rawAmount = '10'
      quote.transaction = { to: treasury, data: '0x', value: '0xa' }
      Object.assign(transaction, { to: treasury, input: '0x', value: 10n })
      receipt.logs = []
    }
    const service = new RobinhoodService(configured())
    service.client = {
      getChainId: async () => 4663,
      getTransaction: async () => transaction,
      getTransactionReceipt: async () => receipt,
      getBlock: async options => { assert.deepEqual(options, { blockNumber: 12n }); return included },
    }
    assert.equal(await service.verifyPayment(quote, hash), true)
    await assert.rejects(service.verifyPayment(quote, '0x' + 'f'.repeat(64)), /response could not be verified/)
    service.client.getTransactionReceipt = async () => { const error = new Error(); error.name = 'TransactionReceiptNotFoundError'; throw error }
    await assert.rejects(service.verifyPayment(quote, hash), error => error.code === 'PAYMENT_PENDING')
    service.client.getTransactionReceipt = async () => receipt
    service.client.getBlock = async () => ({ ...included, hash: '0x' + 'f'.repeat(64) })
    await assert.rejects(service.verifyPayment(quote, hash), error => error.code === 'PAYMENT_PENDING')
    service.client.getBlock = async () => { const error = new Error(); error.name = 'BlockNotFoundError'; throw error }
    await assert.rejects(service.verifyPayment(quote, hash), error => error.code === 'PAYMENT_PENDING')
  }
})

test('HTTP payments require login, preserve quoted 24-hour terms and credit repeated confirmations only once', async t => {
  const store = new MemoryStore(), config = configured(), owner = account()
  const invoice = { id: '12345678-1234-1234-1234-123456789abc', wallet: owner.address.toLowerCase(), chainId: 4663, currency: 'ETH', amount: '0.004', hours: 24, priceUsd: '10', treasury, tokenAddress: token, transaction: {}, expiresAt: Date.now() + 300000 }
  const hash = '0x' + 'a'.repeat(64)
  let verified = 0
  const chain = { holds: async () => false, quote: async (wallet, currency) => { assert.equal(wallet, invoice.wallet); assert.equal(currency, 'ETH'); return invoice }, verifyPayment: async (quote, signature) => { assert.equal(signature, hash); assert.equal(quote.hours, 24); verified++; return true } }
  const server = createServer(createHandler({ config, store, chain }))
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => server.close(resolve)))
  config.origin = `http://127.0.0.1:${server.address().port}`
  let cookie = ''
  const request = async (action, body = {}) => {
    const result = await fetch(`${config.origin}/api/studio?action=${action}`, { method: 'POST', headers: { origin: config.origin, cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    cookie = result.headers.get('set-cookie')?.split(';')[0] || cookie
    return result
  }
  assert.equal((await request('quote', { currency: 'ETH' })).status, 401)
  const challenge = await (await request('challenge', { address: owner.address })).json()
  await request('verify', { signature: await owner.signMessage({ message: challenge.message }) })
  assert.equal((await request('quote', { currency: 'LARP' })).status, 503)
  const quote = await (await request('quote', { currency: 'ETH' })).json()
  assert.equal(quote.priceUsd, '10'); assert.equal(quote.hours, 24)
  const before = Date.now()
  const first = await (await request('confirm', { id: quote.id, signature: hash })).json()
  assert.ok(first.unlocked)
  assert.ok(first.paidUntil >= before + 86400000 && first.paidUntil < Date.now() + 86400001)
  const second = await (await request('confirm', { id: quote.id, signature: hash })).json()
  assert.equal(second.paidUntil, first.paidUntil)
  assert.equal(verified, 1)
  chain.quote = async () => { const error = new Error('provider URL contains secret-key'); error.status = 500; throw error }
  const failed = await request('quote', { currency: 'ETH' })
  assert.equal(failed.status, 503)
  assert.doesNotMatch(await failed.text(), /secret-key/)
})
