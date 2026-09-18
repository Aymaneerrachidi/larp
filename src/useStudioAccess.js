import { useCallback, useEffect, useRef, useState } from 'react'

export async function studioRequest(action, body) {
  const response = await fetch(`/api/studio?action=${action}`, {
    method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: action === 'confirm' ? AbortSignal.timeout(30000) : undefined,
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const error = new Error(data.error || 'Studio access is unavailable. Please try again later.')
    error.code = data.code
    error.status = response.status
    throw error
  }
  return action === 'export' ? response.blob() : response.json()
}

const discovered = new Map()
if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', event => {
    const detail = event.detail
    if (detail?.info?.uuid && detail.provider?.request) {
      discovered.set(detail.info.uuid, { name: String(detail.info.name).slice(0, 50), provider: detail.provider })
      window.dispatchEvent(new Event('larp:wallets'))
    }
  })
  window.dispatchEvent(new Event('eip6963:requestProvider'))
}
export function availableWallets() {
  const result = [...discovered.values()]
  for (const provider of window.ethereum?.providers || (window.ethereum ? [window.ethereum] : [])) {
    if (provider.request && !result.some(item => item.provider === provider)) result.push({ name: provider.isMetaMask ? 'MetaMask' : provider.isCoinbaseWallet ? 'Coinbase Wallet' : 'Browser wallet', provider })
  }
  return result
}

async function ensureNetwork(provider, network) {
  const chainId = `0x${network.chainId.toString(16)}`
  if (Number(await provider.request({ method: 'eth_chainId' })) === network.chainId) return
  try { await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] }) }
  catch (err) {
    if (err.code !== 4902) throw err
    await provider.request({ method: 'wallet_addEthereumChain', params: [{ chainId, chainName: network.name, nativeCurrency: network.nativeCurrency, rpcUrls: [network.rpcUrl], blockExplorerUrls: [network.explorer] }] })
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] })
  }
  if (Number(await provider.request({ method: 'eth_chainId' })) !== network.chainId) throw new Error(`Switch your wallet to ${network.name} and try again.`)
}

const pendingKey = 'larpitalism-pending-payment'
function savedPayment() {
  try {
    const payment = JSON.parse(localStorage.getItem(pendingKey))
    return payment && typeof payment.id === 'string' && /^0x[a-f0-9]{40}$/.test(payment.wallet) && ['ETH', 'LARP'].includes(payment.currency) && typeof payment.signature === 'string' ? payment : null
  } catch { return null }
}
function persistPayment(value) { try { if (value) localStorage.setItem(pendingKey, JSON.stringify(value)); else localStorage.removeItem(pendingKey) } catch { /* Current-tab recovery still works. */ } }

export function useStudioAccess() {
  const [access, setAccess] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [open, setOpen] = useState(false)
  const [pending, setPendingState] = useState(savedPayment)
  const [quote, setQuote] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState('')
  const [accessConfirmation, setAccessConfirmation] = useState(null)
  const [confirmationAttempt, setConfirmationAttempt] = useState(0)
  const [walletProvider, setWalletProvider] = useState(null)
  const walletRevision = useRef(0)
  const operation = useRef(false)
  const setPending = useCallback(value => { persistPayment(value); setPendingState(value) }, [])
  const refresh = useCallback(async () => {
    const revision = walletRevision.current
    try {
      const result = await studioRequest('status')
      if (revision !== walletRevision.current) return null
      setAccess(result); setError(''); return result
    } catch (err) { if (revision === walletRevision.current) setError(err.message); throw err }
  }, [])
  useEffect(() => { refresh().catch(() => {}) }, [refresh])
  useEffect(() => {
    if (accessConfirmation && (accessConfirmation.wallet !== access?.wallet || (accessConfirmation.kind === 'holder' && !access?.holder))) setAccessConfirmation(null)
  }, [accessConfirmation, access?.wallet, access?.holder])

  const confirmHolder = result => {
    if (result?.wallet && result.holder && result.unlocked && !result.holdingError) {
      setAccessConfirmation({ kind: 'holder', wallet: result.wallet })
      setOpen(false)
    }
  }

  const run = async (name, action) => {
    if (operation.current) return
    operation.current = true
    setBusy(name); setError('')
    try { return await action() } catch (err) { setError(err.code === 4001 ? 'Request cancelled. Nothing was changed.' : err.message) }
    finally { operation.current = false; setBusy('') }
  }

  const connect = (selected) => run('Connecting wallet', async () => {
    const [rawAddress] = await selected.request({ method: 'eth_requestAccounts' })
    const address = rawAddress?.toLowerCase()
    if (!address) throw new Error('The wallet did not return an address.')
    await ensureNetwork(selected, access.config.network)
    const challenge = await studioRequest('challenge', { address })
    const hexMessage = '0x' + [...new TextEncoder().encode(challenge.message)].map(byte => byte.toString(16).padStart(2, '0')).join('')
    const signature = await selected.request({ method: 'personal_sign', params: [hexMessage, address] })
    const [currentAddress] = await selected.request({ method: 'eth_accounts' })
    if (currentAddress?.toLowerCase() !== address) throw new Error('Wallet account changed. Connect again.')
    const verified = await studioRequest('verify', { signature })
    walletRevision.current++
    setWalletProvider(selected)
    setAccess(verified); setQuote(null)
    confirmHolder(verified)
    setConfirmationAttempt(value => value + 1)
  })

  const disconnect = () => run('Disconnecting', async () => {
    walletRevision.current++
    setAccess(await studioRequest('logout', {}))
    setQuote(null)
    setWalletProvider(null)
  })

  useEffect(() => {
    const selected = walletProvider
    if (!selected?.on || !access?.wallet) return
    const changed = (accounts) => {
      if (!accounts?.[0] || accounts[0].toLowerCase() !== access.wallet) {
        walletRevision.current++
        setWalletProvider(null)
        studioRequest('logout', {}).then(setAccess).catch(err => { setAccess(null); setError(err.message) })
      }
    }
    const disconnected = () => changed([])
    const chainChanged = (chainId) => { if (Number(chainId) !== access.config.network.chainId) disconnected() }
    selected.on('accountsChanged', changed)
    selected.on('chainChanged', chainChanged)
    selected.on('disconnect', disconnected)
    return () => { selected.removeListener?.('accountsChanged', changed); selected.removeListener?.('chainChanged', chainChanged); selected.removeListener?.('disconnect', disconnected) }
  }, [access?.wallet, access?.config.network.chainId, walletProvider])

  useEffect(() => {
    setPaymentStatus('')
    setVerifying(false)
    if (!pending || !/^0x[a-fA-F0-9]{64}$/.test(pending.signature) || pending.wallet !== access?.wallet) return
    let cancelled = false, timer, attempts = 0
    const check = async () => {
      if (cancelled) return
      if (operation.current) { timer = setTimeout(check, 2500); return }
      operation.current = true
      setVerifying(true)
      setError('')
      setPaymentStatus('Checking your payment automatically. Do not pay again.')
      const revision = walletRevision.current
      try {
        const result = await studioRequest('confirm', { id: pending.id, signature: pending.signature })
        if (!cancelled && revision === walletRevision.current) {
          setAccess(result); setPending(null); setPaymentStatus('')
          if (result.wallet === pending.wallet && result.unlocked && Number(result.paidUntil) > Date.now()) {
            setAccessConfirmation({ kind: 'payment', wallet: result.wallet, paidUntil: Number(result.paidUntil), hash: pending.signature })
            setOpen(false)
          }
        }
      } catch (err) {
        if (cancelled) return
        const retry = err.code === 'PAYMENT_PENDING' || err.status === 429 || err.status >= 500 || err instanceof TypeError || err.name === 'TimeoutError'
        if (retry) {
          setPaymentStatus(err.code === 'PAYMENT_PENDING'
            ? 'Waiting for Robinhood to confirm your transfer. We will keep checking; do not pay again.'
            : 'The payment check is temporarily unavailable. We will retry automatically; do not pay again.')
          attempts++
          timer = setTimeout(check, err.status === 429 ? 60000 : attempts < 12 ? 2500 : 10000)
        } else { setPaymentStatus(''); setError(err.message) }
      } finally {
        operation.current = false
        if (!cancelled) setVerifying(false)
      }
    }
    check()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [pending?.id, pending?.signature, pending?.wallet, access?.wallet, confirmationAttempt, setPending])

  const requestQuote = (currency) => run(`Getting ${currency} quote`, async () => {
    if (pending) throw new Error('Verify your existing payment before making another one.')
    if (!access?.config.paymentMethods[currency]) throw new Error('This payment method is not available yet.')
    setQuote(null)
    const result = await studioRequest('quote', { currency })
    if (result.wallet !== access.wallet || result.chainId !== access.config.network.chainId || result.priceUsd !== '10' || result.hours !== 24) throw new Error('Payment terms could not be verified. Refresh and try again.')
    setQuote(result)
  })

  const pay = () => run('Preparing payment', async () => {
    if (pending) throw new Error('Verify your existing payment before making another one.')
    if (!quote || quote.wallet !== access?.wallet) throw new Error('Request a quote for this wallet first.')
    if (Date.now() >= quote.expiresAt - 30000) { setQuote(null); throw new Error('Quote expired or nearly expired. Request a fresh quote before paying.') }
    const selected = walletProvider
    if (!selected) throw new Error('Connect the same wallet again before paying.')
    const [account] = await selected.request({ method: 'eth_accounts' })
    if (account?.toLowerCase() !== access.wallet) throw new Error('Connect the verified wallet again before paying.')
    await ensureNetwork(selected, access.config.network)
    for (const [quoted, configured] of [[quote.priceUsd, access.config.priceUsd], [quote.hours, access.config.paymentHours], [quote.tokenAddress, access.config.tokenAddress], [quote.treasury, access.config.treasury], [quote.chainId, access.config.network.chainId]]) {
      if (quoted !== configured) { await refresh(); throw new Error('Payment terms changed. Review the updated terms before paying.') }
    }
    const payment = { id: quote.id, wallet: access.wallet, signature: '', amount: quote.amount, currency: quote.currency, hours: quote.hours, chainId: quote.chainId }
    setPending(payment)
    setBusy('Approve payment in your wallet')
    let result
    try {
      result = await selected.request({ method: 'eth_sendTransaction', params: [quote.transaction] })
    } catch (err) {
      if (err.code === 4001) setPending(null)
      throw err
    }
    payment.signature = result
    setPending({ ...payment })
    setQuote(null)
  })

  return { access, error, busy: busy || (verifying ? 'Verifying payment' : ''), paymentStatus, accessConfirmation, dismissAccessConfirmation: () => setAccessConfirmation(null), open, setOpen, pending, setPending, quote, requestQuote, refresh, connect, disconnect, pay,
    checkHoldings: () => run('Checking holdings', async () => {
      const result = await refresh()
      if (!result) return
      confirmHolder(result)
      if (result.wallet && result.config.holdEnabled && !result.holder && !result.unlocked && !result.holdingError) {
        setError(`Holder access requires at least ${BigInt(result.config.holdMinimum).toLocaleString('en-US')} ${result.config.symbol} in this wallet.`)
      }
      return result
    }),
    confirmPayment: () => setConfirmationAttempt(value => value + 1),
  }
}
