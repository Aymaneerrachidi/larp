import { robinhoodNetwork } from '../shared/network.js'
import { isAddress, zeroAddress } from 'viem'

export class HttpError extends Error {
  constructor(status, message, code = 'REQUEST_FAILED') {
    super(message)
    this.status = status
    this.code = code
  }
}

export function getConfig(env = process.env) {
  const origin = env.APP_ORIGIN || (env.NODE_ENV !== 'production' ? 'http://localhost:5173' : '')
  if (!origin || new URL(origin).origin !== origin) throw new HttpError(503, 'Studio access is not configured yet.')
  if (env.NODE_ENV === 'production' && (!origin.startsWith('https://') || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32)) {
    throw new HttpError(503, 'Studio access is not configured yet.')
  }
  const tokenAddress = env.LARP_TOKEN_ADDRESS?.toLowerCase() || ''
  const network = robinhoodNetwork(Number(env.ROBINHOOD_CHAIN_ID || 4663))
  return {
    origin, secret: env.SESSION_SECRET || 'local-development-only-never-deploy-this-secret',
    production: env.NODE_ENV === 'production',
    rpcUrl: env.ROBINHOOD_RPC_URL || network.rpcUrl, tokenAddress, symbol: 'LARP', network,
    holdMinimum: '1000000', priceUsd: '10', paymentHours: 24,
    treasury: env.LARP_TREASURY_WALLET?.toLowerCase() || '',
    pricePair: env.LARP_PRICE_PAIR_ADDRESS?.toLowerCase() || '',
    priceChain: env.LARP_PRICE_DEX_CHAIN || (network.chainId === 4663 ? 'robinhood' : ''),
    minimumLiquidityUsd: 10000,
    gmgnApiKey: env.GMGN_API_KEY?.trim() || '',
    freeLimit: 3,
  }
}

export function publicConfig(config) {
  const tokenReady = isAddress(config.tokenAddress) && config.tokenAddress !== zeroAddress
  const recipientReady = isAddress(config.treasury) && config.treasury !== zeroAddress
  return {
    symbol: config.symbol, tokenAddress: config.tokenAddress, network: config.network, freeLimit: config.freeLimit,
    holdMinimum: config.holdMinimum, priceUsd: config.priceUsd,
    paymentHours: config.paymentHours, treasury: config.treasury,
    holdEnabled: Boolean(config.rpcUrl && tokenReady && config.holdMinimum),
    payEnabled: Boolean(config.rpcUrl && recipientReady),
    paymentMethods: {
      ETH: Boolean(config.rpcUrl && recipientReady),
      LARP: Boolean(config.rpcUrl && tokenReady && recipientReady && config.priceChain),
    },
  }
}
