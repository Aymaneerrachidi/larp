import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CheckCircle, Wallet, X } from '@phosphor-icons/react'
import { availableWallets } from './useStudioAccess.js'

const short = address => `${address.slice(0, 5)}…${address.slice(-5)}`

export function AccessSummary({ studio }) {
  const { access, error, busy } = studio
  const label = !access ? (error ? 'Access check unavailable' : 'Checking free exports…')
    : access.unlocked ? (access.holder ? 'Holder access active' : `Access until ${new Date(access.paidUntil).toLocaleDateString()}`)
      : `${access.freeRemaining} of 3 free exports left`
  return <>{access?.config.testMode && <p className="access-test-notice"><strong>Test site</strong> — using a substitute token. Wallet transactions on Robinhood mainnet use real assets.</p>}<div className="access-summary">
    <span><span className={`access-dot ${access?.unlocked ? 'is-unlocked' : ''}`} />{label}</span>
    <button type="button" onClick={() => studio.setOpen(true)} disabled={Boolean(busy)}>{access?.wallet ? short(access.wallet) : 'Hold or pay with LARP'} <ArrowRight size={14} /></button>
  </div></>
}

export default function AccessPanel({ studio }) {
  const dialog = useRef(null)
  const [wallets, setWallets] = useState([])
  const { access, error, busy, open, pending, quote } = studio
  const config = access?.config
  useEffect(() => {
    if (open && !dialog.current.open) { dialog.current.showModal(); setWallets(availableWallets()) }
    if (!open && dialog.current.open) dialog.current.close()
  }, [open])
  useEffect(() => {
    const update = () => setWallets(availableWallets())
    window.addEventListener('larp:wallets', update)
    return () => window.removeEventListener('larp:wallets', update)
  }, [])
  const disabled = Boolean(busy)
  return <dialog ref={dialog} className="access-dialog" aria-labelledby="access-title" onCancel={() => studio.setOpen(false)} onClose={() => studio.setOpen(false)}>
    <button className="access-close icon-button" type="button" aria-label="Close access options" onClick={() => studio.setOpen(false)}><X size={18} /></button>
    <img className="access-logo" src="/brand/larpitalism-mark-small.png" alt="" width="48" height="48" />
    <p className="eyebrow">THE LARPITALIST MEMBERSHIP</p>
    <p className="access-network">{config?.network.name || 'Robinhood Chain'}{config?.network.testnet ? ' ? test tokens only' : ''}</p>
    {config?.testMode && <p className="access-test-notice"><strong>Test token, real network.</strong> This site checks the substitute contract shown below. Payments use real assets and grant access on this test site only.</p>}
    <h2 id="access-title">Keep the cards coming.</h2>
    <p className="access-intro">Your first 3 exports are free. Hold 1 million LARP for unlimited access, or pay $10 in ETH or LARP for a 24-hour pass.</p>
    <div className="access-progress" aria-label={`${access?.freeRemaining ?? 3} free exports remaining`}>
      {[0, 1, 2].map(index => <span key={index} className={access && index < 3 - access.freeRemaining ? 'used' : ''} />)}
      <small>{access ? `${access.freeRemaining} free exports left` : 'Checking access…'}</small>
    </div>
    {access?.unlocked && <div className="access-success"><CheckCircle size={20} /><span>{access.holder ? 'Your holdings unlock the studio. We recheck before each export.' : `Your pass is active until ${new Date(access.paidUntil).toLocaleString()}.`}</span></div>}
    <section className="wallet-section" aria-label="Wallet connection">
      {access?.wallet ? <><div className="connected-wallet"><Wallet size={20} /><span><strong>Wallet verified</strong><code title={access.wallet}>{short(access.wallet)}</code></span><button type="button" disabled={disabled} onClick={studio.disconnect}>Disconnect</button></div>
        <button className="wallet-reconnect" type="button" disabled={disabled} onClick={() => setWallets(availableWallets())}>Find wallets to reconnect or switch</button>
        {wallets.map(item => <button className="wallet-choice" key={item.name} type="button" disabled={disabled} onClick={() => studio.connect(item.provider)}>Connect {item.name}</button>)}
      </> : <>
        {wallets.length > 0 ? wallets.map(item => <button key={item.name} className="button button-primary wallet-connect" type="button" disabled={disabled || !access} onClick={() => studio.connect(item.provider)}><Wallet size={18} />Connect {item.name}</button>)
          : <><p>No compatible wallet detected. Use an Ethereum wallet such as MetaMask, or open this site in an EVM wallet's in-app browser.</p><a className="button button-secondary" href="https://docs.robinhood.com/chain/add-network-to-wallet/" target="_blank" rel="noreferrer">Wallet setup guide <ArrowRight size={16} /></a><button className="wallet-reconnect" type="button" onClick={() => { window.dispatchEvent(new Event('eip6963:requestProvider')); setWallets(availableWallets()) }}>Check for installed wallets</button></>}
        <small>Connecting requests a login signature. It does not send tokens or approve spending.</small>
      </>}
    </section>
    <div className="access-options">
      <section><p className="eyebrow">01 / HOLD</p><h3>1,000,000 LARP</h3><p>Unlimited exports while you hold at least 1 million LARP. Your tokens stay in your wallet.{!config?.holdEnabled && ' Holder verification opens when the token launches.'}</p><button className="button button-secondary" type="button" disabled={disabled || !access?.wallet || !config?.holdEnabled} onClick={studio.checkHoldings}>{config?.holdEnabled ? 'Check my holdings' : 'Available soon'}</button></section>
      <section><p className="eyebrow">02 / PAY</p><h3>$10 / 24 hours</h3><p>Unlimited exports for 24 hours after payment verification. Pay in ETH or LARP at a live quoted rate. No automatic renewal. Network fees are extra.</p><div className="payment-methods">{['ETH', 'LARP'].map(currency => <button key={currency} className="button button-secondary" type="button" disabled={disabled || !access?.wallet || !config?.paymentMethods[currency] || Boolean(pending) || access?.unlocked} onClick={() => studio.requestQuote(currency)}>Quote in {currency}</button>)}</div>{!config?.payEnabled && <small className="access-coming-soon">Payments open when the receiving wallet is announced.</small>}</section>
    </div>
    {quote && !pending && <section className="payment-quote"><p className="eyebrow">REVIEW YOUR PAYMENT</p><h3>{quote.amount} {quote.currency}</h3><p>$10 for 24 hours of unlimited exports, plus the network fee shown by your wallet. Direct transfer only; no spending approval.</p><p>Quote expires at {new Date(quote.expiresAt).toLocaleTimeString()}. Confirm promptly; if the quote expires before you approve in your wallet, reject the request and get a new quote.</p><p className="quote-source">Rate: ${quote.unitPriceUsd} / {quote.currency} · {quote.priceSource}</p><code>{quote.treasury}</code><button className="button button-primary" type="button" disabled={disabled} onClick={studio.pay}>Pay {quote.amount} {quote.currency}</button></section>}
    {(config?.tokenAddress || config?.payEnabled) && <details className="payment-details"><summary>Verify token and payment details</summary><p>Network: {config.network.name}</p>{config.tokenAddress && <p>Token contract <code>{config.tokenAddress}</code></p>}{config.payEnabled && <p>Payment recipient <code>{config.treasury}</code></p>}</details>}
    {pending && <section className="pending-payment"><h3>Finish verifying your payment</h3><p>Keep this reference. Do not pay again while a transfer is pending.</p><code>{pending.id}</code>{pending.wallet !== access?.wallet && <p>Reconnect {short(pending.wallet)} to verify.</p>}<label>Transaction hash<input value={pending.signature || ''} onChange={event => studio.setPending({ ...pending, signature: event.target.value.trim() })} maxLength={66} placeholder="Paste from wallet activity if missing" /></label><button className="button button-secondary" type="button" disabled={disabled || !pending.signature || pending.wallet !== access?.wallet} onClick={studio.confirmPayment}>Verify payment</button></section>}
    {access?.holdingError && <p className="access-error">Holdings could not be checked. Retry before making a payment.</p>}
    <p className={error ? 'access-error' : 'access-status'} role="status" aria-live="polite">{busy || error || ''}</p>
    {!access && error && <button className="button button-secondary" type="button" onClick={studio.checkHoldings} disabled={disabled}>Retry access check</button>}
    <p className="access-fineprint">Free exports are counted for this browser and linked to your wallet after sign-in. Rendering failures do not use a free export.</p>
  </dialog>
}
