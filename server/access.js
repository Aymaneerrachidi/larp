import { HttpError, publicConfig } from './config.js'
import { paidKey } from './robinhood.js'

export const quotaKeys = (sid, wallet) => [`usage:guest:${sid}`, wallet ? `usage:wallet:${wallet}` : `usage:guest:${sid}`]
export async function getAccess(store, chain, config, sid, wallet, verifyHolding = true) {
  const settings = publicConfig(config)
  const used = Math.max(...await Promise.all(quotaKeys(sid, wallet).map(async key => Number(await store.get(key) || 0))))
  const paidUntil = wallet ? Number(await store.get(paidKey(config, wallet)) || 0) : 0
  let holder = false
  let holdingError = false
  if (wallet && settings.holdEnabled && verifyHolding && paidUntil <= Date.now()) {
    try { holder = await chain.holds(wallet) } catch { holdingError = true }
  }
  return { wallet: wallet || null, freeRemaining: Math.max(0, config.freeLimit - used), paidUntil, holder, holdingError, unlocked: holder || paidUntil > Date.now(), config: settings }
}

export async function reserveExport(store, chain, config, sid, wallet) {
  const access = await getAccess(store, chain, config, sid, wallet)
  if (access.unlocked) return { keys: null, access }
  const keys = quotaKeys(sid, wallet)
  if (!await store.eval('reserve', keys, [config.freeLimit])) {
    if (access.holdingError) throw new HttpError(503, 'We could not verify your holdings. Please retry; no free export was used.')
    throw new HttpError(402, 'Your three free exports are used. Connect a wallet, then hold LARP or buy an access pass.', 'ACCESS_REQUIRED')
  }
  return { keys, access }
}
