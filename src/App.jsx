import { useEffect, useMemo, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  ArrowRight,
  Copy,
  DeviceMobileCamera,
  DownloadSimple,
  ImageSquare,
  Moon,
  Export,
  Shuffle,
  SlidersHorizontal,
  SquaresFour,
  Sun,
  UploadSimple,
  X,
} from '@phosphor-icons/react'
import PnlCard from './PnlCard.jsx'
import AccessPanel, { AccessSummary } from './AccessPanel.jsx'
import { studioRequest, useStudioAccess } from './useStudioAccess.js'
import { futuresPresets, memecoinPresets, platforms } from './platforms.js'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const initialValues = {
  pair: 'LARP/USDT',
  side: 'LONG',
  leverage: '100',
  pnl: '42069.69',
  profit: '84,139.38',
  entry: '0.000042',
  exit: '0.017681',
  invested: '2.00',
  position: '4.02K',
  hold: '96.9',
  sold: '302.24',
  multiplier: '13.13K',
  inviteCode: 'larp',
  displayName: 'Sheep',
  date: '3 Aug 2026',
  handle: 'larpitalist',
  walletName: 'Larpitalism Wallet',
  walletBalance: '1,153.48',
  tokenSymbol: 'LARP',
  tokenAmount: '8,994,980',
  tokenValue: '1,153.48',
  tokenPnl: '-22.76',
}

const futuresFields = [
  ['pair', 'Trading pair', 'LARP/USDT'],
  ['leverage', 'Leverage', '100'],
  ['pnl', 'ROE %', '42069.69'],
  ['profit', 'Profit USD', '84,139.38'],
  ['entry', 'Entry price', '0.000042'],
  ['exit', 'Exit price', '0.017681'],
  ['invested', 'Margin USD', '2.00'],
  ['handle', 'Handle', 'larpitalist'],
]

const memeFields = {
  axiom: [
    ['pair', 'Token name', 'LARP'], ['profit', 'Profit USD', '2.74K'], ['pnl', 'PNL %', '214.75'],
    ['invested', 'Bought USD', '1.28K'], ['position', 'Position USD', '4.02K'], ['handle', 'Handle', 'larpitalist'],
  ],
  gmgn: [
    ['pair', 'Token name', 'LARP'], ['profit', 'Profit SOL', '300.94'], ['pnl', 'PNL %', '643.03'],
    ['hold', 'Hold SOL', '96.9'], ['sold', 'Sold SOL', '302.24'], ['invested', 'Bought SOL', '43.3'],
    ['displayName', 'Display name', 'Sheep'], ['multiplier', 'Multiplier', '13.13K'], ['inviteCode', 'Invite code', 'larp'],
  ],
  padre: [
    ['profit', 'Profit SOL', '-34.60'], ['pnl', 'PNL %', '-7.13'],
    ['invested', 'Total bought SOL', '484.89'], ['sold', 'Total sold SOL', '450.29'],
    ['date', 'Date', '3 Aug 2026'], ['handle', 'Handle', 'larpitalist'],
  ],
  bullx: [
    ['pair', 'Token name', 'LARP'], ['profit', 'Current PNL SOL', '2.83'],
    ['invested', 'Total invested USD', '524.31'], ['sold', 'Total sold USD', '971.74'],
    ['position', 'Total profit USD', '447.43'],
  ],
  photon: [
    ['pair', 'Token name', 'LARP'], ['pnl', 'PNL %', '242.53'],
    ['invested', 'Invested SOL', '3.0'], ['sold', 'Invested USD', '556.4336'],
    ['profit', 'Current profit SOL', '7.2758'], ['position', 'Current profit USD', '1349.5058'],
  ],
  jupiter: [
    ['pair', 'Token name', 'LARP'], ['profit', 'Profit USD', '33.41K'], ['pnl', 'PNL %', '6407'],
    ['invested', 'Acquired USD', '521.50'], ['entry', 'Average entry', '36.11K'],
    ['position', 'Market cap', '2.89M'], ['displayName', 'Display name', 'larpitalist'], ['date', 'Date', '06 Aug 26'],
  ],
  fomo: [
    ['pair', 'Token symbol', 'LARP'], ['displayName', 'Token name', 'LARP'],
    ['profit', 'Profit USD', '20,213.54'], ['pnl', 'PNL %', '451.22'],
    ['invested', 'Invested USD', '4.4K'], ['entry', 'Entry market cap', '256.2K'],
    ['exit', 'Exit market cap', '1.4M'], ['date', 'Date', 'Jul 26, 2026'],
    ['handle', 'Trader handle', 'larpitalist'], ['inviteCode', 'Referral code', 'larpitalism'],
  ],
  pumpfun: [
    ['displayName', 'Token name', 'Larp Coin'], ['pair', 'Token symbol', 'LARP'],
    ['profit', 'Profit USD', '265.99'], ['pnl', 'PNL %', '72.34'],
    ['entry', 'Average entry', '74.28K'], ['position', 'Market cap', '116.83K'],
    ['handle', 'Trader name', 'larpitalist'],
  ],
  moonshot: [
    ['displayName', 'Token name', 'LARP'], ['pair', 'Token symbol', 'LARP'],
    ['profit', 'Profit USD', '4,218.37'], ['pnl', 'Gain %', '684.21'],
    ['invested', 'Invested USD', '616.52'], ['entry', 'Average entry', '82.4K'],
    ['position', 'Current value USD', '4.83K'], ['handle', 'Trader handle', 'larpitalist'],
    ['date', 'Since date', 'Aug 10, 2026'],
  ],
  trojan: [
    ['pair', 'Token name', 'LARP'], ['profit', 'Profit SOL', '42.69'], ['pnl', 'PNL %', '1337.42'],
    ['invested', 'Invested SOL', '3.19'], ['sold', 'Current SOL', '45.88'],
    ['entry', 'Entry market cap', '74.2K'], ['position', 'Current market cap', '1.07M'],
    ['handle', 'Referral code', 'larpitalist'],
  ],
}

const walletFields = [
  ['handle', 'Username', 'larpitalist'], ['walletName', 'Wallet name', 'Larpitalism Wallet'],
  ['walletBalance', 'Wallet balance USD', '1,153.48'], ['profit', 'Wallet PNL USD', '-22.76'],
  ['pnl', 'Wallet PNL %', '-1.94'], ['pair', 'Token name', 'LARP'],
  ['tokenSymbol', 'Token symbol', 'LARP'], ['tokenAmount', 'Token amount', '8,994,980'],
  ['tokenValue', 'Token value USD', '1,153.48'], ['tokenPnl', 'Token PNL USD', '-22.76'],
]

function ImageUpload({ label, value, onChange, onClear, hint }) {
  return (
    <div className="asset-upload">
      <span className="asset-upload-label">{label}</span>
      <div className="asset-upload-row">
        <label className="asset-upload-button">
          <UploadSimple size={16} />
          <span>{value ? 'Replace' : 'Upload'}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(event) => onChange(event.target.files?.[0])}
          />
        </label>
        {value ? <img className="asset-upload-preview" src={value} alt="Selected upload preview" /> : <span className="asset-upload-empty"><ImageSquare size={17} /></span>}
        {value && <button className="asset-upload-clear" type="button" onClick={onClear} aria-label={`Remove ${label}`}><X size={15} /></button>}
      </div>
      <span className="asset-upload-hint">{hint}</span>
    </div>
  )
}

function App() {
  const studio = useStudioAccess()
  const exportLock = useRef(false)
  const lastExport = useRef(null)
  const [platformId, setPlatformId] = useState(() => {
    const requestedPlatform = new URLSearchParams(window.location.search).get('platform')
    return platforms.some((item) => item.id === requestedPlatform) ? requestedPlatform : 'binance'
  })
  const [values, setValues] = useState(() => ({
    ...initialValues,
    ...(platforms.find((item) => item.id === platformId)?.defaults || {}),
  }))
  const [theme, setTheme] = useState(() => localStorage.getItem('larpitalism-theme') || 'light')
  const [exportState, setExportState] = useState('idle')
  const [message, setMessage] = useState('')
  const [media, setMedia] = useState({ coinImages: {}, avatarImages: {}, backgrounds: {} })
  const [showcaseId, setShowcaseId] = useState('axiom')
  const siteRef = useRef(null)
  const manifestoRef = useRef(null)
  const storyRef = useRef(null)
  const cardRef = useRef(null)
  const platform = useMemo(() => platforms.find((item) => item.id === platformId), [platformId])
  const fields = platform.mode === 'wallet' ? walletFields : platform.mode === 'memecoin' ? memeFields[platform.id] : futuresFields
  const cardMedia = {
    coinImage: media.coinImages[platformId] || '',
    avatarImage: media.avatarImages[platformId] || '',
    backgroundImage: media.backgrounds[platformId] || '',
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#22231f' : '#f6f4ed')
    localStorage.setItem('larpitalism-theme', theme)
  }, [theme])

  useGSAP(() => {
    const motion = gsap.matchMedia()
    motion.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.hero-reveal', { opacity: 0, y: 24, duration: 0.8, stagger: 0.1, ease: 'power3.out' })
      gsap.to('.scroll-progress', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'max', scrub: true } })
    })
    return () => motion.revert()
  }, { scope: siteRef })

  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    gsap.fromTo(cardRef.current, {
      opacity: 0,
      scale: 0.965,
      y: 18,
    }, {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: 0.58,
      ease: 'power3.out',
      clearProps: 'transform',
    })

    gsap.from('.form-grid .input-group, .asset-editor > *', {
      opacity: 0,
      y: 10,
      duration: 0.38,
      stagger: 0.025,
      ease: 'power2.out',
    })
  }, { scope: siteRef, dependencies: [platformId], revertOnUpdate: true })

  const updateValue = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const uploadImage = (key, file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setExportState('error')
      setMessage('Choose a PNG, JPG, WebP, or GIF image.')
      return
    }
    if (file.size > 800 * 1024) {
      setExportState('error')
      setMessage('Image is too large. Keep each upload under 800 KB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      setMedia((current) => key === 'backgroundImage'
        ? { ...current, backgrounds: { ...current.backgrounds, [platformId]: dataUrl } }
        : key === 'coinImage'
          ? { ...current, coinImages: { ...current.coinImages, [platformId]: dataUrl } }
          : { ...current, avatarImages: { ...current.avatarImages, [platformId]: dataUrl } })
      setExportState('idle')
      setMessage(`${key === 'backgroundImage' ? platform.name + ' background' : key === 'coinImage' ? platform.name + ' coin image' : platform.name + ' user image'} loaded.`)
    }
    reader.onerror = () => {
      setExportState('error')
      setMessage('That image could not be loaded.')
    }
    reader.readAsDataURL(file)
  }

  const clearImage = (key) => {
    setMedia((current) => key === 'backgroundImage'
      ? { ...current, backgrounds: { ...current.backgrounds, [platformId]: '' } }
      : key === 'coinImage'
        ? { ...current, coinImages: { ...current.coinImages, [platformId]: '' } }
        : { ...current, avatarImages: { ...current.avatarImages, [platformId]: '' } })
    setMessage('Image removed.')
  }

  const randomize = () => {
    const pool = platform.mode === 'wallet' ? [platform.defaults] : platform.mode === 'memecoin' ? memecoinPresets : futuresPresets
    const next = pool[Math.floor(Math.random() * pool.length)]
    setValues((current) => ({ ...current, ...next }))
    setMessage('Fresh imaginary alpha loaded.')
  }

  const choosePlatform = (nextPlatform) => {
    setPlatformId(nextPlatform.id)
    if (nextPlatform.defaults) setValues((current) => ({ ...current, ...nextPlatform.defaults }))
    setMessage(nextPlatform.mode === 'wallet' ? 'Phantom wallet fields loaded.' : nextPlatform.mode === 'memecoin' ? `${nextPlatform.name} memecoin fields loaded.` : '')
  }

  const chooseBackground = (src) => {
    setMedia((current) => ({ ...current, backgrounds: { ...current.backgrounds, [platformId]: src } }))
    setMessage(src ? `${platform.name} background selected.` : `${platform.name} default background restored.`)
  }

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTheme(nextTheme)
      return
    }
    document.startViewTransition(() => setTheme(nextTheme))
  }

  const exportCard = async (mode) => {
    if (exportLock.current) return
    exportLock.current = true
    setExportState('loading')
    setMessage('Rendering your card...')
    const payload = { platformId, values, media: cardMedia }
    const cacheKey = JSON.stringify(payload)
    const getImage = async () => {
      if (lastExport.current?.key === cacheKey) return lastExport.current.blob
      const blob = await studioRequest('export', payload)
      lastExport.current = { key: cacheKey, blob }
      studio.refresh().catch(() => {})
      return blob
    }
    try {
      if (mode === 'copy' && navigator.clipboard && window.ClipboardItem) {
        // Passing the promise immediately preserves the user gesture in Safari.
        const imagePromise = getImage()
        imagePromise.catch(() => {})
        try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': imagePromise })]) }
        catch (clipboardError) { await imagePromise; throw clipboardError }
        setMessage('Copied. Reusing this same card does not use another free export.')
      } else {
        const blob = await getImage()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = `larpitalism-${platformId}-${values.pair.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`
        link.href = url
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        setMessage('Card downloaded. Reusing this same card does not use another free export.')
      }
      setExportState('done')
    } catch (error) {
      setExportState('error')
      if (error.code === 'ACCESS_REQUIRED') {
        studio.setOpen(true)
        studio.refresh().catch(() => {})
      }
      setMessage(mode === 'copy' && !error.code && lastExport.current?.key === cacheKey
        ? 'Clipboard unavailable. Download this rendered card instead; it will not use another free export.'
        : error.message || 'Export failed. Please retry.')
    } finally { exportLock.current = false }
  }
  const downloadCard = () => exportCard('download')
  const copyCard = () => exportCard('copy')

  const manifestoStart = ['Big', 'ideas.', 'Unreal', 'gains.']
  const manifestoEnd = ['Your', 'next', 'post', 'starts', 'here.']
  const showcaseItems = [
    { id: 'binance', name: 'BINANCE', logo: '/binance.svg', width: 24, height: 24 },
    { id: 'axiom', name: 'AXIOM', logo: '/axiom-logo-original-v3.png', width: 421, height: 360 },
    { id: 'padre', name: 'TERMINAL', logo: '/terminal-logo-v2.png', width: 2123, height: 384 },
    { id: 'gmgn', name: 'GMGN', logo: '/gmgn-logo-v2.png', width: 1478, height: 384 },
    { id: 'fomo', name: 'FOMO', logo: '/fomo-logo.jpg', width: 400, height: 400 },
    { id: 'pumpfun', name: 'PUMP.FUN', logo: '/pump-logomark.svg', width: 200, height: 200 },
    { id: 'moonshot', name: 'MOONSHOT', logo: '/moonshot-logo.svg', width: 56, height: 56 },
    { id: 'trojan', name: 'TROJAN', logo: '/trojan-logo.png', width: 384, height: 144 },
  ]

  return (
    <div className="site-shell" ref={siteRef}>
      <a className="skip-link" href="#generator">Skip to editor</a>
      <div className="scroll-progress" aria-hidden="true" />
      <nav className="site-nav" aria-label="Primary navigation">
        <a className="wordmark" href="#top" aria-label="LARPITALISM home">
          <img src="/brand/larpitalism-mark-small.png" width="128" height="128" alt="" />
          <span>LARPITALISM</span>
        </a>
        <div className="nav-links">
          <a href="#generator">The studio</a>
          <a href="#platforms">Templates</a>
          <a href="#how-it-works">How it works</a>
        </div>
        <button className="icon-button" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </nav>

      <main id="top">
        <section className="brand-hero" aria-labelledby="hero-title">
          <div className="brand-hero-copy">
            <p className="hero-kicker hero-reveal">THE PNL DESIGN STUDIO</p>
            <h1 id="hero-title" className="hero-reveal"><span className="hero-line hero-line-primary">Unreal gains.</span><span className="hero-line hero-line-muted">Serious business.</span></h1>
            <p className="hero-reveal">Turn imaginary trades into beautifully made cards. Pick a template, make it yours, and give the timeline something to talk about.</p>
            <div className="hero-actions hero-reveal">
              <a className="button button-primary" href="#generator">Make your card <ArrowRight size={18} /></a>
              <a className="text-link" href="#platforms">Explore templates <ArrowRight size={17} /></a>
            </div>
            <div className="hero-note hero-reveal"><span /> 3 free exports. Hold or pay with LARP to continue.</div>
          </div>
          <div className="brand-hero-media hero-reveal" aria-label="Example simulated trading card">
            <div className="hero-art-label"><span>THE LARPITALIST</span><span>NO. 001 / &infin;</span></div>
            <div className="sample-card">
              <div className="sample-top"><span className="sample-brand"><img src="/brand/larpitalism-mark-small.png" width="128" height="128" alt="" />LARPITALISM</span><span>SIMULATED</span></div>
              <div className="sample-pair">BTC / USDT <span>LONG &middot; 20&times;</span></div>
              <span className="sample-label">Return on imagination</span>
              <strong className="sample-return">+1,284<span>.69%</span></strong>
              <svg className="sample-chart" viewBox="0 0 400 110" aria-hidden="true"><path d="M0 100 28 96 42 102 68 78 90 83 112 68 133 73 160 40 182 54 210 30 236 41 256 20 282 32 312 9 333 20 362 3 400 0" /></svg>
              <div className="sample-stats"><span>ENTRY PRICE<strong>$62,418.50</strong></span><span>EXIT PRICE<strong>$102,511.80</strong></span><span>STATUS<strong>Just a concept.</strong></span></div>
              <div className="sample-bottom"><span>Made up trades. Well-made cards.</span><span>&#8599;</span></div>
            </div>
            <div className="paper-stamp">100%<span>UNREAL</span></div>
            <div className="hero-art-footer"><span>A LITTLE CREATIVE LICENSE.</span><span>&#8599;</span></div>
          </div>
        </section>

        <div className="ticker" aria-label="Supported PNL styles">
          <div>
            {platforms.concat(platforms).map((item, index) => <span key={`${item.id}-${index}`}>{item.name}</span>)}
          </div>
        </div>

        <section className="manifesto-section" ref={manifestoRef} aria-label="LARPITALISM statement">
          <p>
            {manifestoStart.map((word) => <span className="manifesto-word" key={word}>{word} </span>)}
            <span className="manifesto-inline-image"><img src="/brand/larpitalism-mark-small.png" width="128" height="128" alt="" /></span>{' '}
            {manifestoEnd.map((word) => <span className="manifesto-word" key={word}>{word} </span>)}
          </p>
        </section>

        <section className="generator-section" id="generator" aria-labelledby="generator-title">
          <div className="section-heading">
            <h2 id="generator-title">Your card. Your call.</h2>
            <p>Choose a style. Adjust the details. Watch it come together.</p>
          </div>

          <div className="generator-layout">
            <aside className="editor-panel">
              <div className="editor-heading"><span>01 / MAKE IT YOURS</span><SlidersHorizontal size={18} /></div>
              <h3 className="editor-title">Choose your canvas</h3>
              <div className="platform-picker" role="group" aria-label="Card style">
                {platforms.map((item) => (
                  <button
                    className={item.id === platformId ? 'active' : ''}
                    type="button"
                    key={item.id}
                    onClick={() => choosePlatform(item)}
                    aria-pressed={item.id === platformId}
                  >
                    {item.name}
                  </button>
                ))}
              </div>

              <div className="form-grid">
                {platform.mode === 'futures' && <label className="input-group side-control">
                  <span>Direction</span>
                  <span className="segmented">
                    {['LONG', 'SHORT'].map((side) => (
                      <button type="button" className={values.side === side ? 'selected' : ''} aria-pressed={values.side === side} onClick={() => updateValue('side', side)} key={side}>{side}</button>
                    ))}
                  </span>
                </label>}
                {fields.map(([key, label, placeholder]) => (
                  <label className="input-group" key={key}>
                    <span>{label}</span>
                    <input
                      value={values[key]}
                      placeholder={placeholder}
                      onChange={(event) => updateValue(key, event.target.value)}
                      maxLength={key === 'handle' ? 20 : 24}
                    />
                  </label>
                ))}
              </div>

              <div className="asset-editor" aria-label="Card image uploads">
                {platform.backgrounds?.length > 0 && <div className="background-library">
                  <span className="asset-upload-label">Built-in backgrounds</span>
                  <div className="background-library-grid">
                    <button type="button" className={!cardMedia.backgroundImage ? 'selected' : ''} onClick={() => chooseBackground('')} aria-label={`Use default ${platform.name} background`}><span>DEFAULT</span></button>
                    {platform.backgrounds.map((background) => <button type="button" className={cardMedia.backgroundImage === background.src ? 'selected' : ''} onClick={() => chooseBackground(background.src)} key={background.src} aria-label={`Use ${background.label} background`}><img src={background.src} alt="" /><span>{background.label}</span></button>)}
                  </div>
                </div>}
                <ImageUpload
                  key={`${platform.id}-background`}
                  label={`${platform.name} background`}
                  value={cardMedia.backgroundImage}
                  onChange={(file) => uploadImage('backgroundImage', file)}
                  onClear={() => clearImage('backgroundImage')}
                  hint="Fills the complete card and crops automatically."
                />
                {['gmgn', 'jupiter', 'phantom', 'fomo', 'pumpfun', 'moonshot', 'trojan'].includes(platform.id) && <>
                  <ImageUpload
                    key={`${platform.id}-coin`}
                    label="Coin image"
                    value={cardMedia.coinImage}
                    onChange={(file) => uploadImage('coinImage', file)}
                    onClear={() => clearImage('coinImage')}
                    hint="Square image shown beside the token name."
                  />
                  {['gmgn', 'fomo', 'pumpfun'].includes(platform.id) && <ImageUpload
                    key={`${platform.id}-trader`}
                    label="Trader image"
                    value={cardMedia.avatarImage}
                    onChange={(file) => uploadImage('avatarImage', file)}
                    onClear={() => clearImage('avatarImage')}
                    hint="Square image shown beside the trader name."
                  />}
                </>}
                {['axiom', 'padre', 'phantom', 'okx'].includes(platform.id) && <ImageUpload
                  key={`${platform.id}-user`}
                  label={`${platform.name} user image`}
                  value={cardMedia.avatarImage}
                  onChange={(file) => uploadImage('avatarImage', file)}
                  onClear={() => clearImage('avatarImage')}
                  hint="Square image used for the profile shown on the card."
                />}
              </div>

              <button className="random-button" type="button" onClick={randomize}>
                <Shuffle size={18} /> Randomize values
              </button>
            </aside>

            <div className="preview-panel">
              <div className="preview-toolbar">
                <span>02 / LIVE PREVIEW</span>
                <span>{platform.name} STYLE</span>
              </div>
              <div className="card-stage">
                <PnlCard ref={cardRef} platform={platform} values={values} media={cardMedia} />
              </div>
              <AccessSummary studio={studio} />
              <div className="export-actions">
                <button className="button button-primary" type="button" onClick={downloadCard} disabled={exportState === 'loading' || !studio.access}>
                  {exportState === 'loading' ? 'Rendering...' : 'Download PNG'} <DownloadSimple size={18} />
                </button>
                <button className="button button-secondary" type="button" onClick={copyCard} disabled={exportState === 'loading' || !studio.access}>
                  Copy image <Copy size={18} />
                </button>
              </div>
              <p role="status">{message || 'Your canvas is ready. All values are simulated.'}</p>
            </div>
          </div>
        </section>

        <section className="brand-bento" aria-labelledby="brand-tools-title">
          <div className="section-heading">
            <h2 id="brand-tools-title">Small details. Big main-character energy.</h2>
            <p>From the first number to the final pixel, you&#8217;re in control.</p>
          </div>
          <div className="brand-bento-grid">
            <article className="bento-platforms">
              <strong>16</strong>
              <h3>Familiar looks. Fresh possibilities.</h3>
              <p>Move from Binance futures to Moonshot memecoins without relearning the editor.</p>
            </article>
            <article className="bento-logo">
              <img src="/brand/larpitalism-mark.png" width="512" height="512" alt="LARPITALISM monogram" />
            </article>
            <article className="bento-uploads">
              <ImageSquare size={30} />
              <h3>Make it yours.</h3>
              <p>Add a coin image, trader portrait, or full-card background.</p>
            </article>
            <article className="bento-export">
              <div>
                <DeviceMobileCamera size={34} />
                <h3>Ready at timeline speed.</h3>
                <p>Preview live, export a crisp PNG, or copy the result directly.</p>
              </div>
              <div className="export-format" aria-hidden="true">PNG</div>
            </article>
          </div>
        </section>

        <section className="showcase-section" id="platforms" aria-labelledby="showcase-title">
          <div className="section-heading">
            <h2 id="showcase-title">Find your signature style.</h2>
            <p>Futures, memecoins, and wallets. Choose a template to start creating.</p>
          </div>
          <div className="platform-accordion">
            {showcaseItems.map((item) => (
              <button
                type="button"
                className={showcaseId === item.id ? 'active' : ''}
                onClick={() => { setShowcaseId(item.id); choosePlatform(platforms.find((platform) => platform.id === item.id)); document.getElementById('generator').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }) }}
                onMouseEnter={() => setShowcaseId(item.id)}
                onFocus={() => setShowcaseId(item.id)}
                aria-pressed={showcaseId === item.id}
                key={item.id}
              >
                <img className={`platform-logo platform-logo-${item.id}`} src={item.logo} width={item.width} height={item.height} alt={`${item.name} logo`} />
                <strong>{item.name}</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="process-story" id="how-it-works" ref={storyRef} aria-labelledby="story-title">
          <div className="process-intro">
            <h2 id="story-title">Three steps.
One good-looking post.</h2>
            <p>Three focused moves take you from a blank idea to a finished simulated PNL.</p>
            <a className="button button-secondary" href="#generator">Open generator <ArrowRight size={18} /></a>
          </div>
          <div className="process-stack">
            <article className="process-card process-card-platform">
              <SquaresFour size={40} />
              <div><strong>Pick the visual system</strong><p>Start with futures, memecoin, mobile, or wallet styling.</p></div>
              <span>BINANCE / AXIOM / FOMO / PHANTOM</span>
            </article>
            <article className="process-card process-card-control">
              <SlidersHorizontal size={40} />
              <div><strong>Tune the whole story</strong><p>Change values, names, coin art, profiles, and backgrounds in one place.</p></div>
              <span>02 / LIVE PREVIEW / DIRECT CONTROL</span>
            </article>
            <article className="process-card process-card-export">
              <Export size={40} />
              <div><strong>Export the finished frame</strong><p>Download a sharp PNG or copy the image straight to your clipboard.</p></div>
              <span>PNG / COPY / SHARE</span>
            </article>
          </div>
        </section>

        <section className="app-section" id="apps" aria-labelledby="apps-title">
          <div className="app-copy">
            <p className="eyebrow">LESS OVERTHINKING. MORE CREATING.</p>
            <h2 id="apps-title">Made for the bit.<br />Great on your feed.</h2>
            <p>Your next card is a few clicks away. Create right in your browser, on desktop or mobile.</p>
            <a className="button button-primary" href="#generator">Let&#8217;s make something <ArrowRight size={18} /></a>
          </div>
          <img className="app-logo" src="/brand/larpitalism-mark.png" width="160" height="160" alt="Larpitalism monogram" />
        </section>
      </main>

      <AccessPanel studio={studio} />
      <footer className="site-footer">
        <a className="footer-brand" href="#top"><img src="/brand/larpitalism-mark-small.png" width="128" height="128" alt="" /><span>LARPITALISM</span></a>
        <p>Simulated PNL cards for entertainment and parody.</p>
        <div className="footer-links">
          <a href="#generator">The studio</a>
          <a href="#platforms">Templates</a>
          <a href="#how-it-works">How it works</a>
        </div>
      </footer>
    </div>
  )
}

export default App
