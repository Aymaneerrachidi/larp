import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { getConfig, publicConfig } from '../server/config.js'

// Mocked wallet/API checks. No tokens are bought, sold or transferred.
const origin = process.env.TEST_ORIGIN || 'http://localhost:5173'
const wallet = '0x1111111111111111111111111111111111111111'
const token = '0x2222222222222222222222222222222222222222'
const config = publicConfig(getConfig({ APP_ORIGIN: origin, ACCESS_TEST_MODE: 'true', ACCESS_NAMESPACE: 'holder-ui', LARP_TOKEN_ADDRESS: token }))
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const context = await browser.newContext()
let currentWallet = null, balance = 20000, holdingError = false, delayNextStatus = false, statusInFlight = false
const status = () => {
  const holder = Boolean(currentWallet && !holdingError && balance >= 15000)
  return { config, wallet: currentWallet, freeRemaining: 0, holder, holdingError, paidUntil: 0, unlocked: holder }
}
await context.addInitScript(wallet => {
  const listeners = {}
  window.ethereum = {
    isMetaMask: true,
    on: (name, callback) => { (listeners[name] ||= []).push(callback) },
    removeListener: (name, callback) => { listeners[name] = (listeners[name] || []).filter(value => value !== callback) },
    request: async ({ method }) => {
      if (method === 'eth_accounts' || method === 'eth_requestAccounts') return [wallet]
      if (method === 'eth_chainId') return '0x1237'
      if (method === 'personal_sign') return 'mock-signature'
      throw Error('Unexpected wallet request: ' + method)
    },
  }
  window.testDisconnect = () => listeners.accountsChanged?.forEach(callback => callback([]))
}, wallet)
const page = await context.newPage()
await page.route('**/api/studio*', async route => {
  const action = new URL(route.request().url()).searchParams.get('action') || 'status'
  const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
  if (action === 'status') {
    const response = status()
    if (delayNextStatus) { delayNextStatus = false; statusInFlight = true; await new Promise(resolve => setTimeout(resolve, 1500)); statusInFlight = false }
    return json(response)
  }
  if (action === 'challenge') return json({ message: 'Test login' })
  if (action === 'verify') { currentWallet = wallet; return json(status()) }
  if (action === 'logout') { currentWallet = null; return json(status()) }
  if (action === 'export') return json({ error: 'Your three free exports are used. Connect a wallet, then hold LARP or buy an access pass.', code: 'ACCESS_REQUIRED' }, 402)
  throw Error('Unexpected API action: ' + action)
})

try {
  await page.goto(origin)
  await page.getByRole('button', { name: 'Hold or pay with LARP', exact: true }).click()
  await page.getByRole('button', { name: 'Connect MetaMask', exact: true }).click()
  const popup = page.getByRole('dialog', { name: 'Holder access confirmed.', exact: true })
  await popup.waitFor()
  assert.equal(await page.locator('dialog[open]').count(), 1)
  assert.match(await popup.innerText(), /15,000 LARP/)
  assert.doesNotMatch(await popup.innerText(), /24.hour|Payment confirmed|Access until/)
  assert.equal(await popup.getByRole('link', { name: 'View wallet' }).getAttribute('href'), `${config.network.explorer}/address/${wallet}`)
  assert.equal(await page.evaluate(() => document.activeElement?.textContent.trim()), 'Back to studio')
  await page.setViewportSize({ width: 375, height: 812 })
  assert.ok(await popup.evaluate(element => element.scrollWidth <= element.clientWidth))
  await popup.screenshot({ path: 'artifacts/holder-confirmed-mobile.png' })
  await popup.getByRole('link', { name: 'Back to studio' }).click()
  await popup.waitFor({ state: 'hidden' })
  await page.reload()
  await page.getByText('Holder access active', { exact: true }).waitFor()
  assert.equal(await popup.count(), 0)
  console.log('PASS verified holder gets the popup, correct terms and no repeat on reload')

  await page.locator('.access-summary button').click()
  balance = 15000
  await page.getByRole('button', { name: 'Check my holdings', exact: true }).click()
  await popup.waitFor()
  await page.keyboard.press('Escape')
  await popup.waitFor({ state: 'hidden' })
  console.log('PASS checking exactly 15,000 tokens confirms holder access again')

  balance = 14999
  await page.getByRole('button', { name: 'Download PNG', exact: false }).click()
  await page.getByRole('dialog', { name: 'Keep the cards coming.', exact: true }).waitFor()
  await page.waitForFunction(() => document.querySelector('.access-summary')?.textContent.includes('0 of 3'))
  await page.getByRole('button', { name: 'Check my holdings', exact: true }).click()
  await page.getByText('Holder access requires at least 15,000 LARP in this wallet.', { exact: true }).waitFor()
  assert.equal(await popup.count(), 0)
  console.log('PASS selling below the minimum blocks exports and shows no confirmation')

  holdingError = true
  await page.getByRole('button', { name: 'Check my holdings', exact: true }).click()
  await page.getByText('Holdings could not be checked. Retry before making a payment.', { exact: true }).waitFor()
  assert.equal(await popup.count(), 0)
  console.log('PASS failed balance checks never show holder success')

  holdingError = false; balance = 14999
  await page.getByRole('button', { name: 'Connect MetaMask', exact: true }).click()
  await page.getByText('Wallet verified', { exact: true }).waitFor()
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'Check my holdings' && !button.disabled))
  assert.equal(await popup.count(), 0)
  balance = 20000; delayNextStatus = true
  await page.getByRole('button', { name: 'Check my holdings', exact: true }).click()
  while (!statusInFlight) await page.waitForTimeout(25)
  await page.evaluate(() => window.testDisconnect())
  await page.waitForTimeout(1800)
  assert.equal(await popup.count(), 0)
  assert.equal(await page.locator('.connected-wallet').count(), 0)
  console.log('PASS a late holding check cannot reopen access after wallet disconnect')
} finally { await browser.close() }
