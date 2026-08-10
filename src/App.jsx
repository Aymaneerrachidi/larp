import { useEffect, useMemo, useRef, useState } from 'react'
import { toBlob, toPng } from 'html-to-image'
import {
  ArrowRight,
  ChartLineUp,
  Check,
  Copy,
  DownloadSimple,
  ImageSquare,
  Moon,
  Shuffle,
  Sun,
  TelegramLogo,
  UploadSimple,
  X,
  XLogo,
} from '@phosphor-icons/react'
import PnlCard from './PnlCard.jsx'
import { futuresPresets, memecoinPresets, platforms } from './platforms.js'

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
  handle: 'anonlarper',
  walletName: 'LARP Wallet',
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
  ['handle', 'Handle', 'anonlarper'],
]

const memeFields = {
  axiom: [
    ['pair', 'Token name', 'LARP'], ['profit', 'Profit USD', '2.74K'], ['pnl', 'PNL %', '214.75'],
    ['invested', 'Bought USD', '1.28K'], ['position', 'Position USD', '4.02K'], ['handle', 'Handle', 'anonlarper'],
  ],
  gmgn: [
    ['pair', 'Token name', 'LARP'], ['profit', 'Profit SOL', '300.94'], ['pnl', 'PNL %', '643.03'],
    ['hold', 'Hold SOL', '96.9'], ['sold', 'Sold SOL', '302.24'], ['invested', 'Bought SOL', '43.3'],
    ['displayName', 'Display name', 'Sheep'], ['multiplier', 'Multiplier', '13.13K'], ['inviteCode', 'Invite code', 'larp'],
  ],
  padre: [
    ['profit', 'Profit SOL', '-34.60'], ['pnl', 'PNL %', '-7.13'],
    ['invested', 'Total bought SOL', '484.89'], ['sold', 'Total sold SOL', '450.29'],
    ['date', 'Date', '3 Aug 2026'], ['handle', 'Handle', 'anonlarper'],
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
    ['position', 'Market cap', '2.89M'], ['displayName', 'Display name', 'anonlarper'], ['date', 'Date', '06 Aug 26'],
  ],
  fomo: [
    ['pair', 'Token symbol', 'CATE'], ['displayName', 'Token name', 'Cate'],
    ['profit', 'Profit USD', '20,213.54'], ['pnl', 'PNL %', '451.22'],
    ['invested', 'Invested USD', '4.4K'], ['entry', 'Entry market cap', '256.2K'],
    ['exit', 'Exit market cap', '1.4M'], ['date', 'Date', 'Jul 26, 2026'],
    ['handle', 'Trader handle', 'Schoen_xyz'], ['inviteCode', 'Referral code', 'Schoen_xyz'],
  ],
  pumpfun: [
    ['displayName', 'Token name', 'LARP Coin Official'], ['pair', 'Token symbol', 'LARP'],
    ['profit', 'Profit USD', '265.99'], ['pnl', 'PNL %', '72.34'],
    ['entry', 'Average entry', '74.28K'], ['position', 'Market cap', '116.83K'],
    ['handle', 'Trader name', 'anonlarper'],
  ],
}

const walletFields = [
  ['handle', 'Username', 'anonlarper'], ['walletName', 'Wallet name', 'LARP Wallet'],
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
  const [platformId, setPlatformId] = useState('binance')
  const [values, setValues] = useState(initialValues)
  const [theme, setTheme] = useState(() => localStorage.getItem('larp-theme') || 'dark')
  const [exportState, setExportState] = useState('idle')
  const [message, setMessage] = useState('')
  const [media, setMedia] = useState({ coinImages: {}, avatarImages: {}, backgrounds: {} })
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
    localStorage.setItem('larp-theme', theme)
  }, [theme])

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
      link.download = `larp-${platformId}-${values.pair.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`
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

  return (
    <div className="site-shell">
      <nav className="site-nav" aria-label="Primary navigation">
        <a className="wordmark" href="#top">
          <span className="wordmark-mask" aria-hidden="true">L</span>
          LARP
        </a>
        <div className="nav-links">
          <a href="#generator">Generator</a>
          <a href="#how">How it works</a>
          <a href="#token">$LARP</a>
        </div>
        <button className="icon-button" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </nav>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="hero-kicker">THE PROFIT IS TEMPORARY. THE SCREENSHOT IS FOREVER.</p>
            <h1 id="hero-title">Fake it till<br />you make it.</h1>
            <p>Generate killer PNL cards for the timeline. Clean, sharp, painfully believable.</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#generator">Generate PNL <ArrowRight size={18} /></a>
              <a className="button button-secondary" href="#token">Meet $LARP</a>
            </div>
          </div>
          <div className="hero-visual">
            <img
              src="/larp-coin.webp"
              width="1200"
              height="800"
              fetchPriority="high"
              alt="Chrome theatrical mask coin suspended above trading receipts"
            />
            <div className="hero-quote">
              <ChartLineUp size={21} />
              <span>Market truth</span>
              <strong>Everyone is up on the timeline.</strong>
            </div>
          </div>
        </section>

        <div className="ticker" aria-hidden="true">
          <div>
            <span>LARP +42069%</span><span>COPE +1337%</span><span>REALITY -99%</span><span>SCREENSHOTS +8008%</span>
            <span>LARP +42069%</span><span>COPE +1337%</span><span>REALITY -99%</span><span>SCREENSHOTS +8008%</span>
          </div>
        </div>

        <section className="generator-section" id="generator" aria-labelledby="generator-title">
          <div className="section-heading">
            <h2 id="generator-title">Manufacture your alpha.</h2>
            <p>Choose a terminal, type a fantasy, export the evidence.</p>
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
                {['gmgn', 'jupiter', 'phantom', 'fomo', 'pumpfun'].includes(platform.id) && <>
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
                {['axiom', 'padre', 'phantom'].includes(platform.id) && <ImageUpload
                  key={`${platform.id}-user`}
                  label={`${platform.name} user image`}
                  value={cardMedia.avatarImage}
                  onChange={(file) => uploadImage('avatarImage', file)}
                  onClear={() => clearImage('avatarImage')}
                  hint="Square image used for the profile shown on the card."
                />}
              </div>

              <button className="random-button" type="button" onClick={randomize}>
                <Shuffle size={18} /> Randomize delusion
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
              <p>{message || 'Ready to generate your PNL card.'}</p>
            </div>
          </div>
        </section>

        <section className="how-section" id="how" aria-labelledby="how-title">
          <div className="how-copy">
            <h2 id="how-title">Three clicks. Infinite cope.</h2>
            <p>No wallet. No position. No liquidation risk. Just a polished joke ready for the group chat.</p>
          </div>
          <ol className="how-list">
            <li><Check size={19} /><div><strong>Pick a terminal</strong><span>Fourteen familiar visual systems.</span></div></li>
            <li><Check size={19} /><div><strong>Invent the trade</strong><span>Your numbers, your alternate reality.</span></div></li>
            <li><Check size={19} /><div><strong>Export the bit</strong><span>Clean image, ready to post.</span></div></li>
          </ol>
        </section>

        <section className="token-section" id="token" aria-labelledby="token-title">
          <div className="token-symbol">$LARP</div>
          <div className="token-copy">
            <h2 id="token-title">The official currency of imaginary gains.</h2>
            <p>No promises. No fake utility. Just a meme for anyone whose best trade happened in a screenshot editor.</p>
            <div className="token-actions">
              <a className="button button-primary" href="#generator">Generate PNL <ArrowRight size={18} /></a>
              <a className="social-link" href="#top" aria-label="LARP on X"><XLogo size={20} /></a>
              <a className="social-link" href="#top" aria-label="LARP on Telegram"><TelegramLogo size={20} /></a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>LARP</span>
        <p>Generate and export your own PNL cards.</p>
        <span>Not financial advice.</span>
      </footer>
    </div>
  )
}

export default App
