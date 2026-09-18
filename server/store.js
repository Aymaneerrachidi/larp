import { HttpError } from './config.js'
import { PostgresStore } from './postgres.js'

// All quota/payment mutations are atomic. Keys have a shared Redis hash tag.
export const scripts = {
  take: "local v=redis.call('GET',KEYS[1]); redis.call('DEL',KEYS[1]); return v",
  rate: "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
  reserve: "local a=tonumber(redis.call('GET',KEYS[1]) or '0'); local b=tonumber(redis.call('GET',KEYS[2]) or '0'); if math.max(a,b)>=tonumber(ARGV[1]) then return 0 end; redis.call('INCR',KEYS[1]); if KEYS[1]~=KEYS[2] then redis.call('INCR',KEYS[2]) end; return 1",
  refund: "for i,k in ipairs(KEYS) do if i==1 or k~=KEYS[1] then local n=tonumber(redis.call('GET',k) or '0'); if n>0 then redis.call('DECR',k) end end end; return 1",
  merge: "local n=math.max(tonumber(redis.call('GET',KEYS[1]) or '0'),tonumber(redis.call('GET',KEYS[2]) or '0')); redis.call('SET',KEYS[1],n); redis.call('SET',KEYS[2],n); return n",
  credit: "if redis.call('EXISTS',KEYS[1])==1 or redis.call('EXISTS',KEYS[3])==1 then return tonumber(redis.call('GET',KEYS[2]) or '0') end; local n=math.max(tonumber(redis.call('GET',KEYS[2]) or '0'),tonumber(ARGV[1]))+tonumber(ARGV[2]); redis.call('SET',KEYS[1],'1'); redis.call('SET',KEYS[3],'1'); redis.call('SET',KEYS[2],n); return n",
}
const key = (value) => `larpitalism:{studio}:${value}`

export class RedisStore {
  constructor(url, token) { this.url = url; this.token = token }
  async command(args) {
    const response = await fetch(this.url, { method: 'POST', headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args), signal: AbortSignal.timeout(10000) })
    if (!response.ok) throw new HttpError(503, 'Access service is temporarily unavailable. Please retry.')
    const data = await response.json()
    if (data.error) throw new HttpError(503, 'Access service is temporarily unavailable. Please retry.')
    return data.result
  }
  get(k) { return this.command(['GET', key(k)]) }
  set(k, value, seconds) { return this.command(['SET', key(k), String(value), ...(seconds ? ['EX', seconds] : [])]) }
  del(k) { return this.command(['DEL', key(k)]) }
  eval(name, keys, args = []) { return this.command(['EVAL', scripts[name], keys.length, ...keys.map(key), ...args.map(String)]) }
}

// Explicitly opt-in local store. Never used as a production fallback.
export class MemoryStore {
  constructor() { this.values = new Map() }
  read(k) { const entry = this.values.get(k); if (entry?.expires && entry.expires <= Date.now()) { this.values.delete(k); return null } return entry?.value ?? null }
  async get(k) { return this.read(k) }
  async set(k, value, seconds) { this.values.set(k, { value: String(value), expires: seconds ? Date.now() + seconds * 1000 : 0 }) }
  async del(k) { this.values.delete(k) }
  async eval(name, keys, args = []) {
    const number = (k) => Number(this.read(k) || 0)
    const put = (k, v) => this.values.set(k, { value: String(v), expires: 0 })
    if (name === 'take') { const v = this.read(keys[0]); this.values.delete(keys[0]); return v }
    if (name === 'rate') { const n = number(keys[0]) + 1; const expires = this.values.get(keys[0])?.expires || Date.now() + Number(args[0]) * 1000; this.values.set(keys[0], { value: String(n), expires }); return n }
    if (name === 'reserve') { if (Math.max(...keys.map(number)) >= Number(args[0])) return 0; for (const k of new Set(keys)) put(k, number(k) + 1); return 1 }
    if (name === 'refund') { for (const k of new Set(keys)) put(k, Math.max(0, number(k) - 1)); return 1 }
    if (name === 'merge') { const n = Math.max(...keys.map(number)); keys.forEach(k => put(k, n)); return n }
    if (name === 'credit') { if (this.read(keys[0]) || this.read(keys[2])) return number(keys[1]); const n = Math.max(number(keys[1]), Number(args[0])) + Number(args[1]); put(keys[0], 1); put(keys[2], 1); put(keys[1], n); return n }
    throw new Error('Unknown atomic operation')
  }
}

let singleton
export function getStore() {
  if (singleton) return singleton
  if (process.env.DATABASE_URL) singleton = new PostgresStore(process.env.DATABASE_URL)
  else if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) singleton = new RedisStore(process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN)
  else if (process.env.NODE_ENV !== 'production' && process.env.DEV_MEMORY_STORE === 'true') singleton = new MemoryStore()
  else throw new HttpError(503, 'Studio access is not available yet. Please try again later.')
  return singleton
}
