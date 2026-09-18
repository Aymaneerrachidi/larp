import { createHmac } from 'node:crypto'
import { getConfig, HttpError } from '../server/config.js'
import { getStore } from '../server/store.js'
import { createSessionId, readSessionCookie, sessionCookie, challengeFor, verifyChallenge } from '../server/auth.js'
import { getAccess, reserveExport, quotaKeys } from '../server/access.js'
import { RobinhoodService, paidKey } from '../server/robinhood.js'
import { renderCard, validateCard } from '../server/render.js'

async function readBody(req) {
  if (req.method === 'GET') return {}
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new HttpError(415, 'Send a JSON request.')
  if (req.body && typeof req.body === 'object') {
    if (Buffer.byteLength(JSON.stringify(req.body)) > 4_000_000) throw new HttpError(413, 'Upload smaller images.')
    return req.body
  }
  let raw = typeof req.body === 'string' ? req.body : ''
  if (!raw) for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 4_000_000) throw new HttpError(413, 'Upload smaller images.') }
  try { const result = JSON.parse(raw || '{}'); if (!result || Array.isArray(result) || typeof result !== 'object') throw new Error(); return result } catch { throw new HttpError(400, 'Invalid JSON request.') }
}

export function createHandler(dependencies = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    const json = (status, data) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)) }
    try {
      const config = dependencies.config || getConfig()
      const store = dependencies.store || getStore()
      const chain = dependencies.chain || new RobinhoodService(config)
      const render = dependencies.render || renderCard
      const action = new URL(req.url, config.origin).searchParams.get('action') || 'status'
      if (!['GET', 'POST'].includes(req.method) || (req.method === 'GET' && action !== 'status')) throw new HttpError(405, 'Method not allowed.')
      if (req.method === 'POST' && req.headers.origin !== config.origin) throw new HttpError(403, 'Please use the studio on its official domain.')
      const ip = String(req.headers['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim()
      const ipHash = createHmac('sha256', config.secret).update(ip).digest('hex')
      if (await store.eval('rate', [`rate:${ipHash}`], [60]) > 100) throw new HttpError(429, 'Too many requests. Please wait a minute.')
      let sid = readSessionCookie(req.headers.cookie, config.secret)
      if (!sid) {
        if (await store.eval('rate', [`sessions:${ipHash}`], [3600]) > 10) throw new HttpError(429, 'Too many new sessions. Please try again later.')
        sid = createSessionId()
        res.setHeader('Set-Cookie', sessionCookie(sid, config))
      }
      const body = await readBody(req)
      const wallet = await store.get(`session:${sid}`)
      const status = () => getAccess(store, chain, config, sid, wallet)
      if (action === 'status') return json(200, await status())
      if (action === 'challenge') {
        const challenge = challengeFor(body.address, config)
        await store.set(`challenge:${sid}`, JSON.stringify(challenge), 300)
        return json(200, { message: challenge.message })
      }
      if (action === 'verify') {
        const raw = await store.eval('take', [`challenge:${sid}`])
        const address = await verifyChallenge(raw ? JSON.parse(raw) : null, body.signature)
        await store.eval('merge', quotaKeys(sid, address))
        await store.set(`session:${sid}`, address, 7 * 24 * 3600)
        return json(200, await getAccess(store, chain, config, sid, address))
      }
      if (action === 'logout') {
        if (wallet) await store.eval('merge', quotaKeys(sid, wallet))
        await store.del(`session:${sid}`)
        await store.del(`challenge:${sid}`)
        return json(200, await getAccess(store, chain, config, sid, null))
      }
      if (action === 'export') {
        const card = validateCard(body)
        if (await store.eval('rate', [`exports:${wallet || sid}`], [60]) > 12) throw new HttpError(429, 'Please wait a minute before exporting more cards.')
        const reservation = await reserveExport(store, chain, config, sid, wallet)
        let png
        try { png = await render(card, config) }
        catch (error) {
          if (reservation.keys) await store.eval('refund', reservation.keys)
          console.error('Card renderer failed:', error.name)
          throw new HttpError(503, 'Could not render this card. Your free export was restored. Please retry.')
        }
        res.statusCode = 200
        res.setHeader('Content-Type', 'image/png')
        res.setHeader('Content-Disposition', `attachment; filename="larpitalism-${card.platformId}.png"`)
        res.end(png)
        return
      }
      if (action === 'quote' || action === 'confirm') {
        if (!wallet) throw new HttpError(401, 'Connect and verify your wallet first.')
        if (action === 'quote') {
          if (!(await status()).config.paymentMethods[body.currency]) throw new HttpError(503, 'This payment method is not available yet. No payment will be requested.')
          const quote = await chain.quote(wallet, body.currency)
          await store.set(`quote:${quote.id}`, JSON.stringify(quote), 7 * 24 * 3600)
          return json(200, { id: quote.id, transaction: quote.transaction, currency: quote.currency, amount: quote.amount, hours: quote.hours, priceUsd: quote.priceUsd, unitPriceUsd: quote.unitPriceUsd, priceSource: quote.priceSource, market: quote.market, expiresAt: quote.expiresAt, tokenAddress: quote.tokenAddress, treasury: quote.treasury, chainId: quote.chainId, wallet: quote.wallet })
        }
        if (typeof body.id !== 'string' || !/^[a-f0-9-]{36}$/.test(body.id)) throw new HttpError(400, 'Invalid payment reference.')
        const raw = await store.get(`quote:${body.id}`)
        if (!raw) throw new HttpError(400, 'Payment reference expired. Keep your transaction signature and contact support before paying again.')
        const quote = JSON.parse(raw)
        if (quote.wallet !== wallet) throw new HttpError(403, 'Reconnect the wallet used for this payment.')
        if (await store.get(`invoice-used:${quote.id}`)) return json(200, await status())
        await chain.verifyPayment(quote, body.signature)
        await store.eval('credit', [`payment:${quote.chainId}:${body.signature.toLowerCase()}`, paidKey(config, wallet), `invoice-used:${quote.id}`], [Date.now(), quote.hours * 60 * 60 * 1000])
        return json(200, await status())
      }
      throw new HttpError(404, 'Unknown studio action.')
    } catch (error) {
      const expected = error instanceof HttpError
      if (!expected) console.error('Studio API failed:', error.name)
      // RPC/client errors can embed credential-bearing URLs. Only expose our own errors.
      json(expected ? error.status : 503, { error: expected ? error.message : 'The access service is temporarily unavailable. Please retry.', code: expected ? error.code : 'SERVICE_UNAVAILABLE' })
    }
  }
}

export default createHandler()
