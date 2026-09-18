import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { isAddress, getAddress, verifyMessage } from 'viem'
import { HttpError } from './config.js'

const cookieName = 'larp_session'
const mac = (value, secret) => createHmac('sha256', secret).update(value).digest('hex')
export function readSessionCookie(header, secret) {
  const value = String(header || '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1)
  if (!value) return null
  const [id, signature] = value.split('.')
  if (!/^[a-f0-9]{48}$/.test(id || '') || !/^[a-f0-9]{64}$/.test(signature || '')) return null
  return timingSafeEqual(Buffer.from(signature), Buffer.from(mac(id, secret))) ? id : null
}
export function sessionCookie(id, config) {
  return `${cookieName}=${id}.${mac(id, config.secret)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000${config.production ? '; Secure' : ''}`
}
export const createSessionId = () => randomBytes(24).toString('hex')

export function validAddress(address) {
  return typeof address === 'string' && isAddress(address, { strict: false })
}

export function challengeFor(address, config) {
  if (!validAddress(address)) throw new HttpError(400, 'Choose a valid Ethereum-compatible wallet.')
  address = getAddress(address)
  const nonce = randomBytes(24).toString('hex')
  const issuedAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
  const message = `${new URL(config.origin).host} wants you to sign in with your Ethereum account:\n${address}\n\nSign in to Larpitalism on ${config.network.name}. This does not send tokens or grant spending permission.\n\nURI: ${config.origin}\nVersion: 1\nChain ID: ${config.network.chainId}\nNonce: ${nonce}\nIssued At: ${issuedAt}\nExpiration Time: ${expiresAt}`
  return { address, message, expiresAt }
}

export async function verifyChallenge(challenge, signature) {
  if (!challenge || Date.parse(challenge.expiresAt) <= Date.now()) throw new HttpError(401, 'Login expired. Connect and sign again.')
  try {
    if (typeof signature !== 'string' || !/^0x[a-fA-F0-9]{130}$/.test(signature)) throw new Error()
    if (!await verifyMessage({ address: challenge.address, message: challenge.message, signature })) throw new Error()
    return challenge.address.toLowerCase()
  } catch { throw new HttpError(401, 'Signature did not match this wallet. Please reconnect.') }
}
