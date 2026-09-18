import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { getConfig, publicConfig } from '../server/config.js'

// Browser regression tests: mocked API and wallet, no transactions are sent.
// Run a local Vite server, then: node tests/payment-ui.mjs
const origin = process.env.TEST_ORIGIN || 'http://localhost:5173'
const wallet = '0x1111111111111111111111111111111111111111'
const treasury = '0x2222222222222222222222222222222222222222'
const hash = '0x' + 'a'.repeat(64)
const id = '12345678-1234-1234-1234-123456789abc'
const config = publicConfig(getConfig({ APP_ORIGIN: origin, LARP_TREASURY_WALLET: treasury }))
const pending = { id, wallet, signature: hash, currency: 'ETH', amount: '0.004', hours: 24, chainId: 4663 }
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })

async function scenario(name, { saved = true, signedIn = true, errors = ['PAYMENT_PENDING', 'PAYMENT_PENDING'], rejected = false, disconnectDuringCheck = false, expired = false, closeWhilePending = false, capture = false } = {}) {
  const context = await browser.newContext()
  let currentWallet = signedIn ? wallet : null, paidUntil = 0, confirmations = 0, sends = 0
  const status = () => ({ config, wallet: currentWallet, freeRemaining: 3, holder: false, unlocked: Boolean(currentWallet && paidUntil), paidUntil })
  await context.exposeFunction('testPaymentSent', () => { sends++; return hash })
  await context.addInitScript(({ wallet, pending, saved }) => {
    if (saved && !sessionStorage.getItem('payment-test-initialized')) localStorage.setItem('larpitalism-pending-payment', JSON.stringify(pending))
    sessionStorage.setItem('payment-test-initialized', 'true')
    const listeners = {}
    window.ethereum = {
      isMetaMask: true,
      on: (name, callback) => { (listeners[name] ||= []).push(callback) },
      removeListener: (name, callback) => { listeners[name] = (listeners[name] || []).filter(item => item !== callback) },
      request: async ({ method }) => {
        if (method === 'eth_accounts' || method === 'eth_requestAccounts') return [wallet]
        if (method === 'eth_chainId') return '0x1237'
        if (method === 'personal_sign') return 'mock-signature'
        if (method === 'eth_sendTransaction') return window.testPaymentSent()
        throw new Error('Unexpected wallet request: ' + method)
      },
    }
    window.testDisconnect = () => listeners.accountsChanged?.forEach(callback => callback([]))
  }, { wallet, pending, saved })
  const page = await context.newPage()
  await page.route('**/api/studio*', async route => {
    const action = new URL(route.request().url()).searchParams.get('action') || 'status'
    const body = route.request().postDataJSON()
    const json = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) })
    if (action === 'status') return json(status())
    if (action === 'challenge') return json({ message: 'Test login' })
    if (action === 'verify') { currentWallet = wallet; return json(status()) }
    if (action === 'logout') { currentWallet = null; return json(status()) }
    if (action === 'quote') return json({ ...pending, priceUsd: '10', unitPriceUsd: '2500', priceSource: 'Test fixture', treasury, tokenAddress: '', expiresAt: Date.now() + 300000, transaction: { from: wallet, to: treasury, value: '0xe35fa931a0000', data: '0x', chainId: '0x1237' } })
    if (action === 'confirm') {
      confirmations++
      assert.equal(body.id, id); assert.equal(body.signature, hash)
      if (rejected) return json({ error: 'This transaction does not match your access payment.', code: 'REQUEST_FAILED' }, 400)
      const error = errors[confirmations - 1]
      if (error) return json({ error: 'Payment check pending', code: error }, error === 'PAYMENT_PENDING' ? 409 : 503)
      const result = { ...status(), unlocked: !expired, paidUntil: Date.now() + (expired ? -1000 : 86400000) }
      if (disconnectDuringCheck) await new Promise(resolve => setTimeout(resolve, 1500))
      paidUntil = result.paidUntil
      return json(result)
    }
    throw new Error('Unexpected API action: ' + action)
  })
  try {
    await page.goto(origin)
    await page.waitForSelector('.access-summary button:enabled')
    await page.locator('.access-summary button').click()
    const connect = async () => {
      await page.getByRole('button', { name: 'Connect MetaMask', exact: true }).click()
      await page.getByText('Wallet verified', { exact: true }).waitFor()
    }
    if (!signedIn) {
      if (saved) { await page.waitForTimeout(3000); assert.equal(confirmations, 0) }
      await connect()
    }
    if (!saved) {
      await page.getByRole('button', { name: 'Quote in ETH', exact: true }).click()
      await page.getByRole('button', { name: 'Pay 0.004 ETH', exact: true }).click()
    }
    if (closeWhilePending) await page.getByRole('button', { name: 'Close access options', exact: true }).click()
    const popup = page.getByRole('dialog', { name: 'Your access is active.', exact: true })
    if (disconnectDuringCheck) {
      while (!confirmations) await page.waitForTimeout(50)
      await page.evaluate(() => window.testDisconnect())
      await page.waitForTimeout(2000)
      assert.equal(await page.locator('.access-success').count(), 0)
      assert.equal(await page.locator('.connected-wallet').count(), 0)
      assert.equal(await popup.count(), 0)
      assert.ok(await page.evaluate(() => localStorage.getItem('larpitalism-pending-payment')))
    } else if (rejected) {
      await page.getByText('This transaction does not match your access payment.', { exact: true }).waitFor()
      await page.waitForTimeout(3000)
      assert.equal(confirmations, 1)
      assert.equal(await page.locator('.access-success').count(), 0)
      assert.equal(await popup.count(), 0)
      assert.ok(await page.evaluate(() => localStorage.getItem('larpitalism-pending-payment')))
      await page.getByRole('button', { name: 'Verify payment', exact: true }).click()
      await page.waitForTimeout(500)
      assert.equal(confirmations, 2)
    } else if (expired) {
      await page.waitForFunction(() => localStorage.getItem('larpitalism-pending-payment') === null)
      assert.equal(await popup.count(), 0)
    } else {
      await popup.waitFor({ timeout: 20000 })
      assert.equal(await page.locator('dialog[open]').count(), 1)
      assert.equal(await popup.locator('time').getAttribute('datetime'), new Date(paidUntil).toISOString())
      assert.equal(await popup.getByRole('link', { name: 'View payment' }).getAttribute('href'), `${config.network.explorer}/tx/${hash}`)
      assert.equal(await page.evaluate(() => document.activeElement?.textContent.trim()), 'Back to studio')
      // Native modal keyboard focus must remain inside the confirmation.
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab')
        assert.ok(await page.evaluate(() => Boolean(document.activeElement?.closest('.payment-confirmation-dialog'))))
      }
      if (capture) {
        await popup.screenshot({ path: 'artifacts/payment-confirmed-desktop.png' })
        await page.setViewportSize({ width: 375, height: 812 })
        await popup.screenshot({ path: 'artifacts/payment-confirmed-mobile.png' })
        assert.ok(await popup.evaluate(element => element.scrollWidth <= element.clientWidth))
        await page.evaluate(() => { document.documentElement.dataset.theme = 'dark' })
        await popup.screenshot({ path: 'artifacts/payment-confirmed-mobile-dark.png' })
      }
      assert.equal(await page.evaluate(() => localStorage.getItem('larpitalism-pending-payment')), null)
      assert.equal(confirmations, errors.length + 1)
      if (closeWhilePending) await page.keyboard.press('Escape')
      else await popup.getByRole('link', { name: 'Back to studio' }).click()
      await popup.waitFor({ state: 'hidden' })
      assert.equal(await page.locator('dialog[open]').count(), 0)
      await page.reload()
      await page.waitForFunction(() => document.querySelector('.access-summary')?.textContent.includes('Access until'))
      assert.equal(confirmations, errors.length + 1)
      assert.equal(await popup.count(), 0)
    }
    assert.equal(sends, saved ? 0 : 1)
    console.log('PASS ' + name)
  } finally { await context.close() }
}

try {
  await scenario('new payment shows an accessible confirmation with expiry and studio access', { saved: false, signedIn: false, capture: true })
  await scenario('saved payment opens confirmation even after checkout is closed', { closeWhilePending: true })
  await scenario('payment resumes only after reconnecting the sending wallet', { signedIn: false })
  await scenario('temporary backend failure retries automatically', { errors: ['SERVICE_UNAVAILABLE', 'PAYMENT_PENDING'] })
  await scenario('invalid payment stays locked and stops automatic retries', { rejected: true })
  await scenario('late payment response cannot restore a disconnected wallet', { saved: false, signedIn: false, errors: [], disconnectDuringCheck: true })
  await scenario('an old expired payment never shows an active-access confirmation', { errors: [], expired: true })
} finally { await browser.close() }
