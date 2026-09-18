import { getConfig, publicConfig } from '../server/config.js'
import { getStore } from '../server/store.js'
import { RobinhoodService } from '../server/robinhood.js'
import { getUsdPrice } from '../server/prices.js'
import { randomUUID } from 'node:crypto'

let failed = false
async function check(label, task) {
  try { await task(); console.log(`PASS ${label}`) }
  catch { failed = true; console.error(`FAIL ${label}`) }
}
let config, store
await check('Production configuration', async () => { config = getConfig({ ...process.env, NODE_ENV: 'production' }) })
if (config) {
  await check('Persistent database read/write', async () => {
    store = getStore()
    if (!store.pool && !store.command) throw new Error('Persistent storage required')
    const key = `preflight:${randomUUID()}`
    try { await store.set(key, 'ok', 60); if (await store.get(key) !== 'ok') throw new Error() }
    finally { await store.del(key) }
  })
  const chain = new RobinhoodService(config)
  await check('Robinhood RPC chain identity', () => chain.checkNetwork())
  await check('Live ETH/USD price', () => getUsdPrice('ETH', config))
  const settings = publicConfig(config)
  if (settings.holdEnabled) await check('LARP contract decimals', () => chain.decimals())
  else console.log('PENDING LARP contract: holder access stays disabled')
  if (settings.paymentMethods.LARP) await check('Live LARP/USD market', () => getUsdPrice('LARP', config))
  else console.log('PENDING LARP pricing: token and recipient required')
  if (!settings.payEnabled) console.log('PENDING Receiving wallet: payments stay disabled')
  if (process.argv.includes('--payments') && (!settings.holdEnabled || !settings.payEnabled || !settings.paymentMethods.LARP)) failed = true
}
await store?.close?.()
process.exitCode = failed ? 1 : 0
