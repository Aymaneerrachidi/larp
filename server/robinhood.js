import { randomUUID } from 'node:crypto'
import { createPublicClient, http, defineChain, erc20Abi, encodeFunctionData, decodeEventLog, isAddress, formatUnits } from 'viem'
import { HttpError } from './config.js'
import { getUsdPrice } from './prices.js'

export function toRawAmount(value, decimals) {
  if (!/^\d+(\.\d+)?$/.test(String(value)) || !Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw new HttpError(503, 'Token amounts are not configured correctly.')
  const [whole, fraction = ''] = String(value).split('.')
  if (fraction.length > decimals) throw new HttpError(503, 'Token amount has too many decimal places.')
  const amount = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, '0') || '0')
  if (amount <= 0n || amount >= 2n ** 256n) throw new HttpError(503, 'Token amount is outside the supported range.')
  return amount
}

export const paidKey = (config, wallet) => `paid:${config.network.chainId}:${wallet}`

export function quoteRawAmount(dollars, price, decimals) {
  const usd = toRawAmount(dollars, 36), tokenPrice = toRawAmount(price, 36)
  const numerator = usd * 10n ** BigInt(decimals)
  const amount = (numerator + tokenPrice - 1n) / tokenPrice
  if (amount <= 0n || amount >= 2n ** 256n) throw new HttpError(503, 'The quoted amount is outside the supported range.')
  return amount
}

export class RobinhoodService {
  constructor(config) {
    this.config = config
    this.client = createPublicClient({
      chain: defineChain({ id: config.network.chainId, name: config.network.name, nativeCurrency: config.network.nativeCurrency, rpcUrls: { default: { http: [config.rpcUrl] } } }),
      transport: http(config.rpcUrl, { timeout: 12000, retryCount: 1 }),
    })
  }
  async checkNetwork() {
    if (await this.client.getChainId() !== this.config.network.chainId) throw new HttpError(503, 'The token service is connected to the wrong network.')
  }
  async decimals() {
    if (!isAddress(this.config.tokenAddress)) throw new HttpError(503, 'Token access is not configured yet.')
    return this.client.readContract({ address: this.config.tokenAddress, abi: erc20Abi, functionName: 'decimals' })
  }
  async holds(wallet) {
    await this.checkNetwork()
    const [decimals, balance] = await Promise.all([
      this.decimals(),
      this.client.readContract({ address: this.config.tokenAddress, abi: erc20Abi, functionName: 'balanceOf', args: [wallet], blockTag: 'safe' }),
    ])
    return balance >= toRawAmount(this.config.holdMinimum, decimals)
  }
  async quote(wallet, currency) {
    if (!['ETH', 'LARP'].includes(currency)) throw new HttpError(400, 'Choose ETH or LARP for payment.')
    await this.checkNetwork()
    if (!isAddress(this.config.treasury)) throw new HttpError(503, 'Payment recipient is not configured yet.')
    if (wallet.toLowerCase() === this.config.treasury.toLowerCase()) throw new HttpError(400, 'The receiving wallet cannot buy its own access pass.')
    const decimals = currency === 'ETH' ? 18 : await this.decimals()
    const price = await getUsdPrice(currency, this.config)
    const amount = quoteRawAmount(this.config.priceUsd, price.price, decimals)
    const [balance, nonce, blockNumber] = await Promise.all([
      currency === 'ETH' ? this.client.getBalance({ address: wallet }) : this.client.readContract({ address: this.config.tokenAddress, abi: erc20Abi, functionName: 'balanceOf', args: [wallet] }),
      this.client.getTransactionCount({ address: wallet, blockTag: 'pending' }),
      this.client.getBlockNumber(),
    ])
    if (balance < amount) throw new HttpError(400, `Not enough ${currency} in this wallet to buy the pass.`)
    // A plain ERC-20 transfer. No allowance, permit, router or spending approval.
    const data = currency === 'ETH' ? '0x' : encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [this.config.treasury, amount] })
    const transaction = { from: wallet, to: currency === 'ETH' ? this.config.treasury : this.config.tokenAddress, data, value: currency === 'ETH' ? `0x${amount.toString(16)}` : '0x0', nonce: `0x${nonce.toString(16)}`, chainId: `0x${this.config.network.chainId.toString(16)}` }
    // Simulate first: catch paused/blocked transfers and unfunded gas before asking for a signature.
    await this.client.estimateGas({ account: wallet, to: transaction.to, data, value: BigInt(transaction.value) })
    return {
      id: randomUUID(), wallet, chainId: this.config.network.chainId, currency,
      transaction,
      rawAmount: amount.toString(), nonce, fromBlock: blockNumber.toString(),
      createdAt: Date.now(), expiresAt: Date.now() + 5 * 60 * 1000,
      hours: this.config.paymentHours, amount: formatUnits(amount, decimals), priceUsd: this.config.priceUsd, unitPriceUsd: price.price, priceSource: price.source,
      tokenAddress: this.config.tokenAddress, treasury: this.config.treasury,
    }
  }
  async verifyPayment(quote, hash) {
    if (typeof hash !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(hash)) throw new HttpError(400, 'Invalid transaction hash.')
    if (quote.chainId !== this.config.network.chainId) throw new HttpError(400, 'This payment belongs to a different network.')
    await this.checkNetwork()
    let transaction, receipt
    try {
      ;[transaction, receipt] = await Promise.all([this.client.getTransaction({ hash }), this.client.getTransactionReceipt({ hash })])
    } catch (error) {
      if (error.name === 'TransactionNotFoundError' || error.name === 'TransactionReceiptNotFoundError') throw new HttpError(409, 'Payment is awaiting confirmation. Retry verification shortly.', 'PAYMENT_PENDING')
      throw error
    }
    const [finalized, included] = await Promise.all([this.client.getBlock({ blockTag: 'finalized' }), this.client.getBlock({ blockNumber: receipt.blockNumber })])
    validatePaymentTransaction(transaction, receipt, quote, finalized.number, included.timestamp)
    return true
  }
}

export function validatePaymentTransaction(transaction, receipt, quote, finalizedBlock, includedTimestamp) {
  if (receipt.status !== 'success') throw new HttpError(400, 'That transaction failed. No access was purchased.')
  if (transaction.chainId !== quote.chainId || transaction.from?.toLowerCase() !== quote.wallet.toLowerCase()
    || transaction.to?.toLowerCase() !== quote.transaction.to.toLowerCase() || transaction.input?.toLowerCase() !== quote.transaction.data.toLowerCase()
    || transaction.value !== BigInt(quote.transaction.value) || transaction.nonce !== quote.nonce || receipt.blockNumber < BigInt(quote.fromBlock)) {
    throw new HttpError(400, 'This transaction does not match your access payment.')
  }
  // Check actual token Transfer logs as well as calldata. Reverted/no-op or taxed transfers do not buy a pass.
  const transferred = quote.currency === 'ETH' ? transaction.value : receipt.logs.reduce((sum, log) => {
    if (log.address.toLowerCase() !== quote.tokenAddress.toLowerCase()) return sum
    try {
      const event = decodeEventLog({ abi: erc20Abi, data: log.data, topics: log.topics, eventName: 'Transfer' })
      return event.args.from.toLowerCase() === quote.wallet.toLowerCase() && event.args.to.toLowerCase() === quote.treasury.toLowerCase() ? sum + event.args.value : sum
    } catch { return sum }
  }, 0n)
  if (transferred < BigInt(quote.rawAmount)) throw new HttpError(400, 'The required token payment was not received. Keep the transaction hash and contact support before paying again.')
  if (quote.expiresAt && Number(includedTimestamp) * 1000 > quote.expiresAt) throw new HttpError(400, 'Payment was included after the quote expired. Keep the transaction hash and contact support; do not pay again.')
  if (finalizedBlock === null || receipt.blockNumber > finalizedBlock) throw new HttpError(409, 'Payment is waiting for chain finality. Retry verification later; do not pay again.', 'PAYMENT_PENDING')
}
