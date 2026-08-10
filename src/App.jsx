import { useEffect, useMemo, useRef, useState } from 'react'
import { toBlob, toPng } from 'html-to-image'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  AppleLogo,
  ArrowRight,
  Copy,
  DeviceMobileCamera,
  DownloadSimple,
  GooglePlayLogo,
  ImageSquare,
  Moon,
  Export,
  Shuffle,
  SlidersHorizontal,
  SquaresFour,
  Sun,
  TelegramLogo,
  UploadSimple,
  X,
  XLogo,
} from '@phosphor-icons/react'
import PnlCard from './PnlCard.jsx'
import { futuresPresets, memecoinPresets, platforms } from './platforms.js'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const initialValues = {
  pair: 'PNLARP/USDT',
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
  handle: 'anonlarper',
  walletName: 'PNLARP Wallet',
  walletBalance: '1,153.48',
  tokenSymbol: 'PNLARP',
  tokenAmount: '8,994,980',
  tokenValue: '1,153.48',
  tokenPnl: '-22.76',
}

const futuresFields = [
  ['pair', 'Trading pair', 'PNLARP/USDT'],
  ['leverage', 'Leverage', '100'],
  ['pnl', 'ROE %', '42069.69'],
  ['profit', 'Profit USD', '84,139.38'],
  ['entry', 'Entry price', '0.000042'],
  ['exit', 'Exit price', '0.017681'],
  ['invested', 'Margin USD', '2.00'],
  ['handle', 'Handle', 'anonlarper'],
]

const memeFields = {
  axiom: [
    ['pair', 'Token name', 'PNLARP'], ['profit', 'Profit USD', '2.74K'], ['pnl', 'PNL %', '214.75'],
    ['invested', 'Bought USD', '1.28K'], ['position', 'Position USD', '4.02K'], ['handle', 'Handle', 'anonlarper'],
  ],
  gmgn: [
    ['pair', 'Token name', 'PNLARP'], ['profit', 'Profit SOL', '300.94'], ['pnl', 'PNL %', '643.03'],
    ['hold', 'Hold SOL', '96.9'], ['sold', 'Sold SOL', '302.24'], ['invested', 'Bought SOL', '43.3'],
    ['displayName', 'Display name', 'Sheep'], ['multiplier', 'Multiplier', '13.13K'], ['inviteCode', 'Invite code', 'larp'],
  ],
  padre: [
    ['profit', 'Profit SOL', '-34.60'], ['pnl', 'PNL %', '-7.13'],
    ['invested', 'Total bought SOL', '484.89'], ['sold', 'Total sold SOL', '450.29'],
    ['date', 'Date', '3 Aug 2026'], ['handle', 'Handle', 'anonlarper'],
  ],
  bullx: [
    ['pair', 'Token name', 'PNLARP'], ['profit', 'Current PNL SOL', '2.83'],
    ['invested', 'Total invested USD', '524.31'], ['sold', 'Total sold USD', '971.74'],
    ['position', 'Total profit USD', '447.43'],
  ],
  photon: [
    ['pair', 'Token name', 'PNLARP'], ['pnl', 'PNL %', '242.53'],
    ['invested', 'Invested SOL', '3.0'], ['sold', 'Invested USD', '556.4336'],
    ['profit', 'Current profit SOL', '7.2758'], ['position', 'Current profit USD', '1349.5058'],
  ],
  jupiter: [
    ['pair', 'Token name', 'PNLARP'], ['profit', 'Profit USD', '33.41K'], ['pnl', 'PNL %', '6407'],
    ['invested', 'Acquired USD', '521.50'], ['entry', 'Average entry', '36.11K'],
    ['position', 'Market cap', '2.89M'], ['displayName', 'Display name', 'anonlarper'], ['date', 'Date', '06 Aug 26'],
  ],
  fomo: [
    ['pair', 'Token symbol', 'PNLARP'], ['displayName', 'Token name', 'PNLARP'],
    ['profit', 'Profit USD', '20,213.54'], ['pnl', 'PNL %', '451.22'],
    ['invested', 'Invested USD', '4.4K'], ['entry', 'Entry market cap', '256.2K'],
    ['exit', 'Exit market cap', '1.4M'], ['date', 'Date', 'Jul 26, 2026'],
    ['handle', 'Trader handle', 'anonlarper'], ['inviteCode', 'Referral code', 'pnlarp'],
  ],
  pumpfun: [
    ['displayName', 'Token name', 'PNLARP Coin Official'], ['pair', 'Token symbol', 'PNLARP'],
    ['profit', 'Profit USD', '265.99'], ['pnl', 'PNL %', '72.34'],
    ['entry', 'Average entry', '74.28K'], ['position', 'Market cap', '116.83K'],
    ['handle', 'Trader name', 'anonlarper'],
  ],
  moonshot: [
    ['displayName', 'Token name', 'PNLARP'], ['pair', 'Token symbol', 'PNLARP'],
    ['profit', 'Profit USD', '4,218.37'], ['pnl', 'Gain %', '684.21'],
    ['invested', 'Invested USD', '616.52'], ['entry', 'Average entry', '82.4K'],
    ['position', 'Current value USD', '4.83K'], ['handle', 'Trader handle', 'anonlarper'],
    ['date', 'Since date', 'Aug 10, 2026'],
  ],
  trojan: [
    ['pair', 'Token name', 'PNLARP'], ['profit', 'Profit SOL', '42.69'], ['pnl', 'PNL %', '1337.42'],
    ['invested', 'Invested SOL', '3.19'], ['sold', 'Current SOL', '45.88'],
    ['entry', 'Entry market cap', '74.2K'], ['position', 'Current market cap', '1.07M'],
    ['handle', 'Referral code', 'anonlarper'],
  ],
}

const walletFields = [
  ['handle', 'Username', 'anonlarper'], ['walletName', 'Wallet name', 'PNLARP Wallet'],
  ['walletBalance', 'Wallet balance USD', '1,153.48'], ['profit', 'Wallet PNL USD', '-22.76'],
  ['pnl', 'Wallet PNL %', '-1.94'], ['pair', 'Token name', 'PNLARP'],
  ['tokenSymbol', 'Token symbol', 'PNLARP'], ['tokenAmount', 'Token amount', '8,994,980'],
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
  const [platformId, setPlatformId] = useState(() => {
    const requestedPlatform = new URLSearchParams(window.location.search).get('platform')
    return platforms.some((item) => item.id === requestedPlatform) ? requestedPlatform : 'binance'
  })
  const [values, setValues] = useState(() => ({
    ...initialValues,
    ...(platforms.find((item) => item.id === platformId)?.defaults || {}),
  }))
  const [theme, setTheme] = useState(() => localStorage.getItem('pnlarp-theme') || 'dark')
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
    localStorage.setItem('pnlarp-theme', theme)
  }, [theme])

  useGSAP(() => {
    const mediaQuery = gsap.matchMedia()

    mediaQuery.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.hero-reveal', {
        opacity: 0,
        y: 36,
        duration: 1,
        stagger: 0.1,
        ease: 'power3.out',
      })

      const words = gsap.utils.toArray('.manifesto-word')
      gsap.fromTo(words, { opacity: 0.14 }, {
        opacity: 1,
        stagger: 0.08,
        ease: 'none',
        scrollTrigger: {
          trigger: manifestoRef.current,
          start: 'top 72%',
          end: 'bottom 42%',
          scrub: 0.8,
        },
      })

      gsap.utils.toArray('.process-card').forEach((card) => {
        gsap.fromTo(card, { opacity: 0.28, scale: 0.92 }, {
          opacity: 1,
          scale: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: card,
            start: 'top 88%',
            end: 'center 54%',
            scrub: 0.65,
          },
        })
      })
    })

    mediaQuery.add('(min-width: 960px) and (prefers-reduced-motion: no-preference)', () => {
      const cards = gsap.utils.toArray('.process-card')
      cards.forEach((card, index) => {
        if (index === cards.length - 1) return
        ScrollTrigger.create({
          trigger: card,
          start: 'top top+=96',
          endTrigger: cards[cards.length - 1],
          end: 'top top+=96',
          pin: true,
          pinSpacing: false,
        })
        gsap.to(card, {
          opacity: 0.42,
          scale: 0.92,
          ease: 'none',
          scrollTrigger: {
            trigger: cards[index + 1],
            start: 'top bottom',
            end: 'top top+=96',
            scrub: true,
          },
        })
      })
    })

    return () => mediaQuery.revert()
  }, { scope: siteRef })

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
    if (file.size > 12 * 1024 * 1024) {
      setExportState('error')
      setMessage('Image is too large. Keep uploads under 12 MB.')
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

  const exportOptions = {
    cacheBust: true,
    pixelRatio: 2,
  }

  const downloadCard = async () => {
    if (!cardRef.current || exportState === 'loading') return
    setExportState('loading')
    setMessage('Rendering your imaginary gains...')
    try {
      const dataUrl = await toPng(cardRef.current, exportOptions)
      const link = document.createElement('a')
      link.download = `pnlarp-${platformId}-${values.pair.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`
      link.href = dataUrl
      link.click()
      setExportState('done')
      setMessage('PNL card downloaded.')
    } catch {
      setExportState('error')
      setMessage('Export failed. Try again in a moment.')
    }
  }

  const copyCard = async () => {
    if (!cardRef.current || exportState === 'loading') return
    if (!navigator.clipboard || !window.ClipboardItem) {
      await downloadCard()
      return
    }
    setExportState('loading')
    setMessage('Copying card...')
    try {
      const blob = await toBlob(cardRef.current, exportOptions)
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setExportState('done')
      setMessage('Copied. Go post your imaginary alpha.')
    } catch {
      setExportState('error')
      setMessage('Clipboard blocked. Use download instead.')
    }
  }

  const manifestoStart = ['PNLARP', 'turns', 'numbers', 'into']
  const manifestoEnd = ['screenshots', 'people', 'stop', 'scrolling', 'for.']
  const showcaseItems = [
    { id: 'binance', name: 'BINANCE', logo: '/binance.svg', width: 24, height: 24 },
    { id: 'axiom', name: 'AXIOM', logo: '/axiom-logo-original-v3.png', width: 421, height: 360 },
    { id: 'terminal', name: 'TERMINAL', logo: '/terminal-logo-v2.png', width: 2123, height: 384 },
    { id: 'gmgn', name: 'GMGN', logo: '/gmgn-logo-v2.png', width: 1478, height: 384 },
    { id: 'fomo', name: 'FOMO', logo: '/fomo-logo.jpg', width: 400, height: 400 },
    { id: 'pump', name: 'PUMP.FUN', logo: '/pump-logomark.svg', width: 200, height: 200 },
    { id: 'moonshot', name: 'MOONSHOT', logo: '/moonshot-logo.svg', width: 56, height: 56 },
    { id: 'trojan', name: 'TROJAN', logo: '/trojan-logo.png', width: 384, height: 144 },
  ]

  return (
    <div className="site-shell" ref={siteRef}>
      <nav className="site-nav" aria-label="Primary navigation">
        <a className="wordmark" href="#top" aria-label="PNLARP home">
          <img src="/logo.jpg" width="1024" height="1024" alt="" />
          <span>PNLARP</span>
        </a>
        <div className="nav-links">
          <a href="#generator">Generator</a>
          <a href="#platforms">Platforms</a>
          <a href="#apps">Get the app</a>
        </div>
        <button className="icon-button" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </nav>

      <main id="top">
        <section className="brand-hero" aria-labelledby="hero-title">
          <div className="brand-hero-copy">
            <p className="hero-kicker hero-reveal">PNL CARDS FOR THE TIMELINE</p>
            <h1 id="hero-title" className="hero-reveal"><span className="hero-line hero-line-primary">Make the gain.</span><span className="hero-line hero-line-muted">Own the frame.</span></h1>
            <p className="hero-reveal">Design sharp, share-ready PNL cards across the platforms traders already recognize.</p>
            <div className="hero-actions hero-reveal">
              <a className="button button-primary" href="#generator">Create a PNL <ArrowRight size={18} /></a>
              <a className="button button-secondary" href="#apps">Get the app</a>
            </div>
          </div>
          <div className="brand-hero-media hero-reveal">
            <div className="hero-logo-frame">
              <img src="/logo.jpg" width="1024" height="1024" fetchPriority="high" alt="PNLARP monogram" />
            </div>
          </div>
        </section>

        <div className="ticker" aria-label="Supported PNL styles">
          <div>
            {platforms.concat(platforms).map((item, index) => <span key={`${item.id}-${index}`}>{item.name}</span>)}
          </div>
        </div>

        <section className="manifesto-section" ref={manifestoRef} aria-label="PNLARP statement">
          <p>
            {manifestoStart.map((word) => <span className="manifesto-word" key={word}>{word} </span>)}
            <span className="manifesto-inline-image"><img src="/logo.jpg" width="1024" height="1024" alt="" /></span>{' '}
            {manifestoEnd.map((word) => <span className="manifesto-word" key={word}>{word} </span>)}
          </p>
        </section>

        <section className="generator-section" id="generator" aria-labelledby="generator-title">
          <div className="section-heading">
            <h2 id="generator-title">Build the screenshot.</h2>
            <p>Choose a platform, tune every detail, and export a polished simulated result.</p>
          </div>

          <div className="generator-layout">
            <aside className="editor-panel">
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
                      <button type="button" className={values.side === side ? 'selected' : ''} onClick={() => updateValue('side', side)} key={side}>{side}</button>
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
                <span>LIVE PREVIEW</span>
                <span>{platform.name} STYLE</span>
              </div>
              <div className="card-stage">
                <PnlCard ref={cardRef} platform={platform} values={values} media={cardMedia} />
              </div>
              <div className="export-actions">
                <button className="button button-primary" type="button" onClick={downloadCard} disabled={exportState === 'loading'}>
                  {exportState === 'loading' ? 'Rendering...' : 'Download PNG'} <DownloadSimple size={18} />
                </button>
                <button className="button button-secondary" type="button" onClick={copyCard} disabled={exportState === 'loading'}>
                  Copy image <Copy size={18} />
                </button>
              </div>
              <p role="status">{message || 'Ready to generate your PNL card.'}</p>
            </div>
          </div>
        </section>

        <section className="brand-bento" aria-labelledby="brand-tools-title">
          <div className="section-heading">
            <h2 id="brand-tools-title">Built for every kind of flex.</h2>
            <p>One precise editor for futures cards, memecoin wins, wallet screens, and fully custom visuals.</p>
          </div>
          <div className="brand-bento-grid">
            <article className="bento-platforms">
              <strong>16</strong>
              <h3>Platform styles, one workflow.</h3>
              <p>Move from Binance futures to Moonshot memecoins without relearning the editor.</p>
            </article>
            <article className="bento-logo">
              <img src="/logo.jpg" width="1024" height="1024" alt="PNLARP monogram" />
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
            <h2 id="showcase-title">One feed. Many visual languages.</h2>
            <p>Explore a few of the card families already inside PNLARP.</p>
          </div>
          <div className="platform-accordion">
            {showcaseItems.map((item) => (
              <button
                type="button"
                className={showcaseId === item.id ? 'active' : ''}
                onClick={() => setShowcaseId(item.id)}
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

        <section className="process-story" ref={storyRef} aria-labelledby="story-title">
          <div className="process-intro">
            <h2 id="story-title">A cleaner path from concept to card.</h2>
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
              <span>LIVE PREVIEW / DIRECT CONTROL</span>
            </article>
            <article className="process-card process-card-export">
              <Export size={40} />
              <div><strong>Export the finished frame</strong><p>Download a sharp PNG or copy the image straight to your clipboard.</p></div>
              <span>PNG / COPY / SHARE</span>
            </article>
          </div>
        </section>

        <section className="app-section" id="apps" aria-labelledby="apps-title">
          <img className="app-logo" src="/logo.jpg" width="1024" height="1024" alt="PNLARP" />
          <div className="app-copy">
            <h2 id="apps-title">PNLARP, wherever the timeline takes you.</h2>
            <p>Open the full generator on desktop, or keep the mobile experience close.</p>
            <div className="store-links">
              <a href="https://apps.apple.com/" target="_blank" rel="noreferrer" aria-label="Download on the App Store">
                <AppleLogo size={28} weight="fill" />
                <span>Download on the<strong>App Store</strong></span>
              </a>
              <a href="https://play.google.com/store/apps" target="_blank" rel="noreferrer" aria-label="Get it on Google Play">
                <GooglePlayLogo size={28} weight="fill" />
                <span>Get it on<strong>Google Play</strong></span>
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <a className="footer-brand" href="#top"><img src="/logo.jpg" width="1024" height="1024" alt="" /><span>PNLARP</span></a>
        <p>Simulated PNL cards for entertainment and parody.</p>
        <div className="footer-links">
          <a href="#generator">Generator</a>
          <a href="#platforms">Platforms</a>
          <a href="#apps">Apps</a>
          <a href="#top" aria-label="PNLARP on X"><XLogo size={20} /></a>
          <a href="#top" aria-label="PNLARP on Telegram"><TelegramLogo size={20} /></a>
        </div>
      </footer>
    </div>
  )
}

export default App
