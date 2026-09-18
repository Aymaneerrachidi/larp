import { timingSafeEqual } from 'node:crypto'
import { getStore } from '../server/store.js'

export default async function maintenance(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET || ''}`)
  const received = Buffer.from(String(req.headers.authorization || ''))
  if (req.method !== 'GET' || !process.env.CRON_SECRET || expected.length !== received.length || !timingSafeEqual(expected, received)) {
    res.statusCode = 401; res.end('Unauthorized'); return
  }
  try {
    const store = getStore()
    await store.prune?.()
    res.statusCode = 204; res.end()
  } catch { res.statusCode = 503; res.end('Maintenance unavailable') }
}
