import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { PostgresStore } from '../server/postgres.js'

test('persistent database: concurrent quota, refunds, nonce consumption, payment deduplication and reconnect', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const namespace = `test-${randomUUID()}`
  const store = new PostgresStore(process.env.TEST_DATABASE_URL, namespace)
  const second = new PostgresStore(process.env.TEST_DATABASE_URL, namespace)
  const outside = new PostgresStore(process.env.TEST_DATABASE_URL, `${namespace}-isolated`)
  try {
    await store.migrate()
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => (i % 2 ? store : second).eval('reserve', ['guest', 'wallet'], [3])))
    assert.equal(results.reduce((a, b) => a + b, 0), 3)
    assert.equal(await second.get('wallet'), '3')
    await store.eval('refund', ['guest', 'wallet'])
    assert.equal(await second.get('wallet'), '2')
    await store.set('nonce', 'challenge', 300)
    const nonces = await Promise.all([store.eval('take', ['nonce']), second.eval('take', ['nonce'])])
    assert.deepEqual(nonces.sort(), ['challenge', null].sort())
    const now = Date.now(), duration = 86400000
    const credits = await Promise.all(Array.from({ length: 8 }, (_, i) => (i % 2 ? store : second).eval('credit', ['tx', 'paid', 'invoice'], [now, duration])))
    assert.ok(credits.every(value => value === now + duration))
    assert.equal(await second.get('paid'), String(now + duration))
    assert.equal(await outside.get('paid'), null)
    await outside.set('expired', 'other-namespace', -1)
    await store.set('expired', 'gone', -1)
    assert.equal(await second.get('expired'), null)
    await store.prune()
    const preserved = await outside.pool.query('SELECT value FROM larp_access WHERE key=$1', [outside.key('expired')])
    assert.equal(preserved.rows[0].value, 'other-namespace')
    const rates = await Promise.all(Array.from({ length: 5 }, () => store.eval('rate', ['rate'], [60])))
    assert.deepEqual(rates.sort(), [1, 2, 3, 4, 5])
  } finally {
    await store.pool.query('DELETE FROM larp_access WHERE key LIKE $1', [`${namespace}:%`])
    await outside.del('expired')
    await Promise.all([store.close(), second.close(), outside.close()])
  }
})
