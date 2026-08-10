import { forwardRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'

function signed(value, prefix = '') {
  const raw = String(value ?? '').trim()
  if (!raw) return `${prefix}0`
  const negative = raw.startsWith('-')
  const clean = raw.replace(/^[+-]/, '')
  return `${negative ? '-' : '+'}${prefix}${clean}`
}



function SolanaMark({ className = '' }) {
  return <img className={`solana-mark ${className}`} src="/solana-mark.svg" alt="" aria-hidden="true" />
}

function CustomBackground({ src }) {
  return src ? <img className="custom-card-background" src={src} alt="" aria-hidden="true" /> : null
}

function WebsiteQr({ className }) {
  const configuredUrl = import.meta.env.VITE_PUBLIC_SITE_URL
  const siteUrl = configuredUrl || (typeof window === 'undefined' ? '/' : new URL('/', window.location.href).href)

  return (
    <QRCodeSVG
      className={className}
      value={siteUrl}
      title={`Open ${siteUrl}`}
      level="M"
      bgColor="#ffffff"
      fgColor="#050505"
      data-qr-url={siteUrl}
    />
  )
}

function cardClasses(base, positive, backgroundImage) {
  return `pnl-card ${base} ${positive ? 'is-profit' : 'is-loss'}${backgroundImage ? ' has-custom-background' : ''}`
}

function compactPair(pair, suffix = 'USDT') {
  const raw = String(pair || 'LARP').toUpperCase().replace(/\s+/g, '')
  if (raw.includes('/')) return raw.replace('/', '')
  return raw.endsWith(suffix) ? raw : `${raw}${suffix}`
}

function basePair(pair) {
  return String(pair || 'LARP').toUpperCase().split('/')[0].replace(/USDT$/, '')
}

function cardTimestamp() {
  const now = new Date()
  const date = now.toLocaleDateString('en-CA')
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${date} ${time}`
}

function BinanceCard({ values, positive, cardRef, media }) {
  return (
    <div ref={cardRef} className={cardClasses('futures-share binance-card', positive, media.backgroundImage)}>
      <CustomBackground src={media.backgroundImage} />
      <div className="binance-geometry" aria-hidden="true"><i /><i /><i /></div>
      <time className="binance-time">{cardTimestamp()}</time>
      <main className="binance-share-content">
        <strong className="binance-contract">{compactPair(values.pair)} Perpetual</strong>
        <div className="binance-side"><span>{values.side === 'SHORT' ? 'Short' : 'Long'}</span><i />{values.leverage}x</div>
        <div className="binance-pnl-value">{signed(values.profit)} <small>USDT</small></div>
        <div className="binance-roi-value">{signed(values.pnl)}%</div>
        <dl className="binance-prices">
          <div><dt>Entry Price</dt><dd>{values.entry}</dd></div>
          <div><dt>Last Price</dt><dd>{values.exit}</dd></div>
        </dl>
      </main>
      <footer className="binance-share-footer">
        <div className="binance-lockup"><img src="/binance.svg" alt="" /><strong><span>BINANCE</span>FUTURES</strong></div>
        <span>Referral code {values.handle || 'anonlarper'}</span>
        <WebsiteQr className="binance-qr" />
      </footer>
      
    </div>
  )
}

function OkxCard({ values, positive, cardRef, media }) {
  return (
    <div ref={cardRef} className={cardClasses('futures-share okx-card', positive, media.backgroundImage)}>
      <CustomBackground src={media.backgroundImage} />
      <img className="okx-rocket" src="/okx-share-rocket.jpg" alt="" aria-hidden="true" />
      <header className="okx-trader-row">
        <img src="/okx-share-avatar.png" alt="" />
        <div><strong>--</strong><span>{values.handle || 'Trader'}</span></div>
        <time>{new Date().toLocaleDateString('en-CA')}<br />{new Date().toLocaleTimeString('en-GB')} (UTC+2)</time>
      </header>
      <main className="okx-share-content">
        <img className="okx-share-logo" src="/okx-share-logo.png" alt="OKX" />
        <div className="okx-roi-value">{signed(values.pnl)}%</div>
        <div className="okx-pnl-value">{signed(values.profit)} <small>USDT</small></div>
        <div className="okx-market-row">
          <span className="okx-coin-placeholder">{basePair(values.pair).slice(0, 1)}</span>
          <div><strong>{compactPair(values.pair)} Perpetual</strong><span>{values.side === 'SHORT' ? 'Short' : 'Long'}<i />{values.leverage}x<i />Open position</span></div>
        </div>
        <dl className="okx-price-list">
          <div><dt>Avg. entry price</dt><dd>{values.entry}</dd></div>
          <div><dt>Mark price</dt><dd>{values.exit}</dd></div>
        </dl>
      </main>
      
    </div>
  )
}

function HyperliquidCard({ values, positive, cardRef, media }) {
  return (
    <div ref={cardRef} className={cardClasses('futures-share hyper-card', positive, media.backgroundImage)}>
      <CustomBackground src={media.backgroundImage} />
      <div className="hyper-contours" aria-hidden="true">{Array.from({ length: 15 }, (_, index) => <i key={index} />)}</div>
      <img className="hyper-share-logo" src="/hyperliquid.svg" alt="Hyperliquid" />
      <main className="hyper-share-content">
        <div className="hyper-market-row">
          <span className="hyper-coin-placeholder">{basePair(values.pair).slice(0, 1)}</span>
          <strong>{basePair(values.pair)}</strong>
          <span>{values.side === 'SHORT' ? 'SHORT' : 'LONG'} {values.leverage}X</span>
        </div>
        <div className="hyper-roi-value">{signed(values.pnl)}%</div>
        <dl className="hyper-price-list">
          <div><dt>Entry Price</dt><dd>{values.entry}</dd></div>
          <div><dt>Mark Price</dt><dd>{values.exit}</dd></div>
          <div><dt>Referral Code:</dt><dd>join/{values.handle || 'anonlarper'}</dd></div>
        </dl>
      </main>
      
    </div>
  )
}

function BybitCard({ values, positive, cardRef, media }) {
  return (
    <div ref={cardRef} className={cardClasses('native-share bybit-card', positive, media.backgroundImage)}>
      <CustomBackground src={media.backgroundImage} />
      <div className="bybit-grid" aria-hidden="true" />
      <strong className="bybit-logo">BYB<span>I</span>T</strong>
      <main className="bybit-content">
        <div className="bybit-market"><strong>{compactPair(values.pair)}</strong><span>{values.side === 'SHORT' ? 'Short' : 'Long'} {values.leverage}.0X</span></div>
        <span className="bybit-roi-label">ROI</span>
        <div className="bybit-roi">{signed(values.pnl)}%</div>
        <dl className="bybit-prices">
          <div><dt>Entry Price</dt><dd>{values.entry}</dd></div>
          <div><dt>Market Price</dt><dd>{values.exit}</dd></div>
        </dl>
      </main>
      <img className="bybit-rocket" src="/bybit-rocket-reference.png" alt="" aria-hidden="true" />
      <footer className="bybit-footer"><span>Join and claim over $5,000 in bonuses!</span><strong>Referral Code: {values.handle || 'anonlarper'}</strong><WebsiteQr className="bybit-qr" /></footer>
      
    </div>
  )
}

function MexcCard({ values, positive, cardRef, media }) {
  return (
    <div ref={cardRef} className={cardClasses('native-share mexc-card', positive, media.backgroundImage)}>
      <CustomBackground src={media.backgroundImage} />
      <div className="mexc-logo" aria-label="MEXC">
        <svg viewBox="0 0 64 38" aria-hidden="true"><path d="M2 31 16.2 6.5c3.7-6.3 10.4-6.3 14.1 0L44.5 31c2.3 4 .4 7-4.3 7H6.3C1.6 38-.3 35 2 31Z" /><path d="M30 31 42.1 10c3.7-6.3 10.4-6.3 14.1 0L64 23.6V38H34.3c-4.7 0-6.6-3-4.3-7Z" /></svg>
        <strong>MEXC</strong>
      </div>
      <div className="mexc-zero" aria-hidden="true"><span>0</span><small>Fee</small></div>
      <main className="mexc-content">
        <strong className="mexc-market">{compactPair(values.pair)} Perpetual</strong>
        <div className="mexc-badges"><span>0 Fees</span><span>Saved {values.invested} USDT</span></div>
        <div className="mexc-side">{values.side === 'SHORT' ? 'Short' : 'Long'} <i /> {values.leverage}X</div>
        <div className="mexc-roi">{signed(values.pnl)}%</div>
        <div className="mexc-profit">PNL&nbsp;&nbsp; {signed(values.profit)} USDT</div>
        <dl className="mexc-prices">
          <div><dt>Entry Price</dt><dd>{values.entry}</dd></div>
          <div><dt>Fair Price</dt><dd>{values.exit}</dd></div>
        </dl>
      </main>
      <footer className="mexc-footer"><strong>Sign up to get first-trade loss coverage</strong><span>mexc.com · {values.handle || 'anonlarper'}</span></footer>
      
    </div>
  )
}

function AxiomCard({ values, positive, cardRef, media }) {
  return (
    <div ref={cardRef} className={cardClasses('axiom-card', positive, media.backgroundImage)}>
      <img className="axiom-art" src="/axiom-source-2x.png" alt="" />
      <CustomBackground src={media.backgroundImage} />
      <img className="axiom-mark" src="/axiom-logo-original-v3.png" alt="" />
      <div className="axiom-content">
        <strong className="meme-token">{values.pair}</strong>
        <div className="axiom-profit">{signed(values.profit, '$')}</div>
        <dl className="axiom-stats">
          <div><dt>PNL</dt><dd>{signed(values.pnl)}%</dd></div>
          <div><dt>Bought</dt><dd>${values.invested}</dd></div>
          <div><dt>Position</dt><dd>${values.position}</dd></div>
        </dl>
        <div className="axiom-user"><span aria-hidden="true">{media.avatarImage && <img src={media.avatarImage} alt="" />}</span><strong>@{String(values.handle).replace(/^@/, '')}</strong></div>
        <div className="axiom-url">axiom.trade&nbsp;&nbsp; Save 10% off fees</div>
      </div>
      
    </div>
  )
}

function GmgnCard({ values, positive, cardRef, media }) {
  return (
    <div ref={cardRef} className={cardClasses('gmgn-card', positive, media.backgroundImage)}>
      <CustomBackground src={media.backgroundImage} />
      <header className="gmgn-header">
        <img src="/gmgn-logo-v2.png" alt="GMGN" />
        <div><span>𝕏 gmgnai</span><span>◎ gmgn.ai</span></div>
      </header>
      <div className="gmgn-body">
        <strong className="gmgn-token">
          <span className="gmgn-token-image" aria-hidden="true">{media.coinImage ? <img src={media.coinImage} alt="" /> : values.pair.slice(0, 1)}</span>
          {values.pair}
        </strong>
        <div className="gmgn-profit"><SolanaMark className="solana-mark-lg" />{signed(values.profit)}</div>
        <dl className="gmgn-stats">
          <div><dt>PNL</dt><dd><SolanaMark />{signed(values.profit)} ({signed(values.pnl)}%)</dd></div>
          <div><dt>Hold</dt><dd><SolanaMark />{values.hold}</dd></div>
          <div><dt>Sold</dt><dd><SolanaMark />{values.sold}</dd></div>
          <div><dt>Bought</dt><dd><SolanaMark />{values.invested}</dd></div>
        </dl>
      </div>
      <div className="gmgn-user">
        <strong>{media.avatarImage && <img className="gmgn-avatar" src={media.avatarImage} alt="" />}<span>{values.displayName} | X{values.multiplier}</span></strong>
        <span>Invite Code&nbsp; {values.inviteCode}</span>
      </div>
      
    </div>
  )
}

function PadreCard({ values, positive, cardRef, media }) {
  return (
    <div ref={cardRef} className={cardClasses('padre-card', positive, media.backgroundImage)}>
      <CustomBackground src={media.backgroundImage} />
      <header className="padre-header">
        <div><img className="padre-brand-logo" src="/terminal-logo-v2.png" alt="Terminal" /><span>×&nbsp; {String(values.handle).replace(/^@/, '')}</span>{media.avatarImage && <img className="padre-avatar" src={media.avatarImage} alt="" />}</div>
        <div><span>Unlock 35% cashback</span><strong>trade.padre.gg/r/{values.handle}</strong></div>
      </header>
      <div className="padre-body">
        <strong className="padre-date">{values.date}</strong>
        <div className="padre-profit"><SolanaMark className="solana-mark-lg" />{signed(values.profit)}</div>
        <dl className="padre-stats">
          <div><dt>Total Bought</dt><dd><SolanaMark />{values.invested}</dd></div>
          <div><dt>Total Sold</dt><dd><SolanaMark />{values.sold}</dd></div>
          <div><dt>PNL</dt><dd>{signed(values.pnl)}%</dd></div>
        </dl>
      </div>
      
    </div>
  )
}

function BullxCard({ values, positive, cardRef, media }) {
  return (
    <div ref={cardRef} className={cardClasses('native-share bullx-card', positive, media.backgroundImage)}>
      <CustomBackground src={media.backgroundImage} />
      <div className="bullx-world" aria-hidden="true" />
      <img className="bullx-logo" src="/bullx-logo-transparent.png" alt="BullX" />
      <main className="bullx-content">
        <strong className="bullx-token">{values.pair}</strong>
        <div className="bullx-pnl">{signed(values.profit)}<SolanaMark /></div>
        <span className="bullx-current">Current PnL</span>
        <dl className="bullx-stats">
          <div><dt>Total Invested</dt><dd>{values.invested}$</dd></div>
          <div><dt>Total Sold</dt><dd>{values.sold}$</dd></div>
          <div><dt>Total Profit</dt><dd>{signed(values.position, '$').replace('$', '')}$</dd></div>
        </dl>
      </main>
      <footer className="bullx-footer"><span>IT’S TIME TO WIN</span><strong>BULLX.IO</strong></footer>
      
    </div>
  )
}

function PhotonCard({ values, positive, cardRef, media }) {
  return (
    <div ref={cardRef} className={cardClasses('native-share photon-card', positive, media.backgroundImage)}>
      <CustomBackground src={media.backgroundImage} />
      <div className="photon-orbs" aria-hidden="true"><i /><i /><i /><i /></div>
      <main className="photon-panel">
        <span className="photon-kicker">GAINS WITH PHOTON</span>
        <strong className="photon-token">{values.pair}</strong>
        <dl className="photon-stats">
          <div><dt>INVESTED</dt><dd><SolanaMark /> {values.invested}</dd><small>${values.sold} USD</small></div>
          <div><dt>CURRENT PROFIT</dt><dd><SolanaMark /> {values.profit}</dd><small>${values.position} USD</small></div>
        </dl>
        <div className="photon-roi">{signed(values.pnl)}%</div>
      </main>
      <img className="photon-logo" src="/photon-logo-transparent.png" alt="Photon Hyperspeed" />
      
    </div>
  )
}

function FomoCard({ values, positive, cardRef, media }) {
  const username = String(values.handle || 'anonlarper').replace(/^@/, '')
  const referral = String(values.inviteCode || username).replace(/^@/, '')

  return (
    <div ref={cardRef} className={cardClasses('native-share fomo-card', positive, media.backgroundImage)}>
      <CustomBackground src={media.backgroundImage} />
      <main className="fomo-panel">
        <header className="fomo-token-row">
          <span className="fomo-token-image">{media.coinImage ? <img src={media.coinImage} alt="" /> : values.pair.slice(0, 1)}</span>
          <div><strong>{values.pair}</strong><span>{values.displayName}</span></div>
          <time>{values.date}</time>
        </header>
        <div className="fomo-chart" aria-hidden="true">
          <svg viewBox="0 0 900 360" preserveAspectRatio="none">
            <path className="fomo-chart-fill" d="M0 308 C90 309 126 307 180 305 C226 303 236 298 250 275 C268 243 294 256 311 210 C327 167 337 118 349 153 C365 192 378 223 397 181 C416 141 431 221 453 175 C471 137 484 208 508 176 C530 145 548 210 572 188 C595 167 607 133 634 154 C665 177 675 229 705 213 C734 197 750 246 778 232 C805 219 820 181 839 193 C857 205 866 150 875 92 C882 50 890 40 900 42 L900 360 L0 360 Z" />
            <path className="fomo-chart-line" d="M0 308 C90 309 126 307 180 305 C226 303 236 298 250 275 C268 243 294 256 311 210 C327 167 337 118 349 153 C365 192 378 223 397 181 C416 141 431 221 453 175 C471 137 484 208 508 176 C530 145 548 210 572 188 C595 167 607 133 634 154 C665 177 675 229 705 213 C734 197 750 246 778 232 C805 219 820 181 839 193 C857 205 866 150 875 92 C882 50 890 40 900 42" />
          </svg>
          <span className="fomo-trade fomo-buy b1">+</span><span className="fomo-trade fomo-buy b2">+</span><span className="fomo-trade fomo-buy b3">+</span><span className="fomo-trade fomo-sell">−</span>
        </div>
        <section className="fomo-trade-panel">
          <div className="fomo-trader">
            <span className="fomo-avatar">{media.avatarImage ? <img src={media.avatarImage} alt="" /> : username.slice(0, 1).toUpperCase()}</span>
            <strong>@{username}<i>’s trade</i></strong>
          </div>
          <div className="fomo-gain">{signed(values.profit, '$')} <span>(<i>▲</i> {values.pnl}%)</span></div>
          <dl className="fomo-stats">
            <div><dt>Invested</dt><dd>${values.invested}</dd></div>
            <div><dt>Entry</dt><dd>${values.entry}</dd></div>
            <div><dt>Exit</dt><dd>${values.exit}</dd></div>
          </dl>
        </section>
      </main>
      <footer className="fomo-footer"><strong>fomo</strong><div><span>10% off fees with code</span><b>{referral}</b></div></footer>
    </div>
  )
}

function PumpfunCard({ values, positive, cardRef, media }) {
  const username = String(values.handle || 'anonlarper').replace(/^@/, '')

  return (
    <div ref={cardRef} className={cardClasses('native-share pumpfun-card', positive, media.backgroundImage)}>
      <CustomBackground src={media.backgroundImage} />
      <header className="pumpfun-token-row">
        <span className="pumpfun-token-image">{media.coinImage ? <img src={media.coinImage} alt="" /> : values.pair.slice(0, 1)}</span>
        <div><strong>{values.displayName}</strong><span>${values.pair}</span></div>
      </header>
      <main className="pumpfun-content">
        <span className="pumpfun-profit-label">PROFIT</span>
        <div className="pumpfun-gain">{signed(values.profit, '$')} <span>▲ {values.pnl}%</span></div>
        <dl className="pumpfun-stats">
          <div><dd>${values.entry}</dd><dt>AVERAGE ENTRY</dt></div>
          <div><dd>${values.position}</dd><dt>MARKET CAP</dt></div>
        </dl>
      </main>
      <footer className="pumpfun-footer">
        <div className="pumpfun-user"><span>{media.avatarImage ? <img src={media.avatarImage} alt="" /> : username.slice(0, 1).toUpperCase()}</span><strong>{username}</strong></div>
        <div className="pumpfun-lockup"><i aria-hidden="true">◒</i><strong>pump<span>.</span>fun</strong></div>
      </footer>
    </div>
  )
}

function JupiterCard({ values, positive, cardRef, media }) {
  return (
    <div ref={cardRef} className={cardClasses('native-share jupiter-card', positive, media.backgroundImage)}>
      <CustomBackground src={media.backgroundImage} />
      <header className="jupiter-header">
        <span className="jupiter-token-image">{media.coinImage ? <img src={media.coinImage} alt="" /> : values.pair.slice(0, 1)}</span>
        <div><strong>{values.pair}</strong><span>{values.pair.toLowerCase()}</span></div>
      </header>
      <div className="jupiter-chart" aria-hidden="true">
        <svg viewBox="0 0 600 230" preserveAspectRatio="none"><path className="jupiter-fill" d="M0 210 L0 172 C38 166 51 183 78 160 S116 142 143 145 S181 164 213 145 S251 105 280 124 S323 154 354 128 S390 77 411 104 S441 135 464 67 S497 97 523 82 S561 49 600 60 L600 230 Z" /><path className="jupiter-line" d="M0 172 C38 166 51 183 78 160 S116 142 143 145 S181 164 213 145 S251 105 280 124 S323 154 354 128 S390 77 411 104 S441 135 464 67 S497 97 523 82 S561 49 600 60" /></svg>
        <span className="jupiter-buy b1">B</span><span className="jupiter-buy b2">B</span><span className="jupiter-sell s1">S +3</span><span className="jupiter-sell s2">S +3</span>
      </div>
      <main className="jupiter-content">
        <div className="jupiter-gain">{signed(values.profit, '$')} <span>↑ {values.pnl}%</span></div>
        <div className="jupiter-user"><span>🐸</span><div><strong>{values.displayName}’s position</strong><time>{values.date}</time></div></div>
        <dl className="jupiter-stats"><div><dt>Acquired</dt><dd>${values.invested}</dd></div><div><dt>Average entry</dt><dd>${values.entry}</dd></div><div><dt>Market Cap</dt><dd>${values.position}</dd></div></dl>
      </main>
      <footer className="jupiter-footer"><span className="jupiter-mark" aria-hidden="true" /> <strong>Jupiter Mobile</strong><WebsiteQr className="jupiter-qr" /></footer>
      
    </div>
  )
}

function PhantomWalletCard({ values, positive, cardRef, media }) {
  const username = String(values.handle || 'anonlarper').replace(/^@/, '')
  return (
    <div ref={cardRef} className={cardClasses('native-share phantom-wallet-card', positive, media.backgroundImage)}>
      <CustomBackground src={media.backgroundImage} />
      <img className="phantom-header-art" src="/phantom-header.png" alt="" aria-hidden="true" />
      <header className="phantom-profile">
        <img src={media.avatarImage || '/phantom-default-avatar.png'} alt="" />
        <div><strong>@{username}</strong><span>{values.walletName || 'LARP Wallet'}</span></div>
      </header>
      <main className="phantom-wallet-body">
        <div className="phantom-balance">${values.walletBalance}</div>
        <div className="phantom-wallet-pnl"><span>{signed(values.profit, '$')}</span><strong>{signed(values.pnl)}%</strong></div>
        <img className="phantom-actions-art" src="/phantom-buttons.png" alt="Receive, send, swap, and buy actions" />
        <nav className="phantom-tabs" aria-label="Wallet asset type"><strong>Tokens</strong><span>Collectibles</span><i>•••</i></nav>
        <article className="phantom-token-row">
          <span className="phantom-token-icon">{media.coinImage ? <img src={media.coinImage} alt="" /> : <b>L</b>}</span>
          <div><strong>{values.pair || 'LARP'} <i>✓</i></strong><span>{values.tokenAmount} {values.tokenSymbol || 'LARP'}</span></div>
          <div><strong>${values.tokenValue}</strong><span>{signed(values.tokenPnl, '$')}</span></div>
        </article>
      </main>
      <img className="phantom-footer-art" src="/phantom-footer.png" alt="" aria-hidden="true" />
      
    </div>
  )
}

const PnlCard = forwardRef(function PnlCard({ platform, values, media = {} }, ref) {
  const cardMedia = { coinImage: '', avatarImage: '', backgroundImage: '', ...media }
  const positive = Number.parseFloat(values.pnl) >= 0
  if (platform.id === 'binance') return <BinanceCard values={values} positive={positive} cardRef={ref} media={cardMedia} />
  if (platform.id === 'okx') return <OkxCard values={values} positive={positive} cardRef={ref} media={cardMedia} />
  if (platform.id === 'hyperliquid') return <HyperliquidCard values={values} positive={positive} cardRef={ref} media={cardMedia} />
  if (platform.id === 'bybit') return <BybitCard values={values} positive={positive} cardRef={ref} media={cardMedia} />
  if (platform.id === 'mexc') return <MexcCard values={values} positive={positive} cardRef={ref} media={cardMedia} />
  if (platform.id === 'axiom') return <AxiomCard values={values} positive={positive} cardRef={ref} media={cardMedia} />
  if (platform.id === 'gmgn') return <GmgnCard values={values} positive={positive} cardRef={ref} media={cardMedia} />
  if (platform.id === 'padre') return <PadreCard values={values} positive={positive} cardRef={ref} media={cardMedia} />
  if (platform.id === 'bullx') return <BullxCard values={values} positive={positive} cardRef={ref} media={cardMedia} />
  if (platform.id === 'photon') return <PhotonCard values={values} positive={positive} cardRef={ref} media={cardMedia} />
  if (platform.id === 'fomo') return <FomoCard values={values} positive={positive} cardRef={ref} media={cardMedia} />
  if (platform.id === 'pumpfun') return <PumpfunCard values={values} positive={positive} cardRef={ref} media={cardMedia} />
  if (platform.id === 'jupiter') return <JupiterCard values={values} positive={positive} cardRef={ref} media={cardMedia} />
  return <PhantomWalletCard values={values} positive={positive} cardRef={ref} media={cardMedia} />
})

export default PnlCard
