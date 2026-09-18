import { useEffect, useRef } from 'react'
import { ArrowRight, ArrowUpRight, CheckCircle, X } from '@phosphor-icons/react'

export default function AccessConfirmation({ studio }) {
  const dialog = useRef(null)
  const continueLink = useRef(null)
  const { accessConfirmation: confirmation, dismissAccessConfirmation: dismiss, access } = studio
  const isHolder = confirmation?.kind === 'holder'
  const visible = confirmation && confirmation.wallet === access?.wallet && (!isHolder || access.holder)
  const holdingAmount = BigInt(access?.config.holdMinimum || '1000000').toLocaleString('en-US')

  useEffect(() => {
    if (visible && !dialog.current.open) {
      dialog.current.showModal()
      continueLink.current?.focus({ preventScroll: true })
    } else if (!visible && dialog.current.open) dialog.current.close()
  }, [visible])

  const keepFocusInside = event => {
    if (event.key !== 'Tab') return
    const controls = dialog.current.querySelectorAll('button, a[href]')
    const first = controls[0], last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  return <dialog ref={dialog} className="access-dialog payment-confirmation-dialog" aria-labelledby="access-confirmed-title" aria-describedby="access-confirmed-description" onCancel={dismiss} onClose={dismiss} onKeyDown={keepFocusInside}>
    {visible && <>
      <button className="access-close icon-button" type="button" aria-label="Close access confirmation" onClick={dismiss}><X size={18} /></button>
      <img className="payment-confirmation-logo" src="/brand/larpitalism-mark-neon-small.png" alt="Larpitalism" width="36" height="36" />
      <div className="payment-confirmation-icon" aria-hidden="true"><CheckCircle size={44} weight="regular" /></div>
      <p className="eyebrow">{isHolder ? 'Holdings verified' : 'Payment confirmed'}</p>
      <h2 id="access-confirmed-title">{isHolder ? 'Holder access confirmed.' : 'Your access is active.'}</h2>
      <p id="access-confirmed-description" className="payment-confirmation-description">{isHolder ? `Unlimited exports are unlocked while you hold at least ${holdingAmount} ${access.config.symbol}. Your tokens stay in your wallet.` : 'Your 24-hour pass is ready. Create and export unlimited cards until your pass expires.'}</p>
      <dl className="payment-confirmation-details">
        {isHolder ? <div><dt>Minimum holding</dt><dd>{holdingAmount} {access.config.symbol}</dd></div> : <div><dt>Access until</dt><dd><time dateTime={new Date(confirmation.paidUntil).toISOString()}>{new Date(confirmation.paidUntil).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}</time></dd></div>}
        <div><dt>Wallet</dt><dd><code title={confirmation.wallet}>{confirmation.wallet.slice(0, 6)}…{confirmation.wallet.slice(-4)}</code></dd></div>
      </dl>
      <a ref={continueLink} className="button button-primary payment-confirmation-continue" href="#generator" onClick={dismiss}>Back to studio <ArrowRight size={18} /></a>
      <div className="payment-confirmation-footer"><span>{isHolder ? 'Balance checked before every export.' : 'No automatic renewal.'}</span><a href={isHolder ? `${access.config.network.explorer}/address/${confirmation.wallet}` : `${access.config.network.explorer}/tx/${confirmation.hash}`} target="_blank" rel="noreferrer">{isHolder ? 'View wallet' : 'View payment'} <ArrowUpRight size={14} /></a></div>
    </>}
  </dialog>
}
