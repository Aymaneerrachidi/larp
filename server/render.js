import { chromium as playwright } from 'playwright-core'
import { platforms } from '../src/platforms.js'
import { HttpError } from './config.js'

export function validateCard(body) {
  const platform = platforms.find(item => item.id === body.platformId)
  if (!platform || !body.values || typeof body.values !== 'object' || Array.isArray(body.values)) throw new HttpError(400, 'Invalid card style or values.')
  const values = {}
  for (const [key, value] of Object.entries(body.values)) {
    if (!/^[a-zA-Z]+$/.test(key) || typeof value !== 'string' || value.length > 80) throw new HttpError(400, 'Card values must be short text.')
    values[key] = value
  }
  if (Object.keys(values).length > 30 || !values.pair) throw new HttpError(400, 'A token or trading pair is required.')
  const media = {}
  let bytes = 0
  for (const key of ['backgroundImage', 'coinImage', 'avatarImage']) {
    const value = body.media?.[key] || ''
    if (typeof value !== 'string') throw new HttpError(400, 'Invalid image.')
    if (value && !platform.backgrounds?.some(item => item.src === value)) {
      if (!/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value)) throw new HttpError(400, 'Only uploaded PNG, JPG, WebP or GIF images are allowed.')
      bytes += value.length
    }
    media[key] = value
  }
  if (bytes > 3_700_000) throw new HttpError(413, 'These images are too large together. Use smaller images and retry.')
  return { platformId: platform.id, values, media }
}

export async function renderCard(payload, config) {
  let browser
  try {
    let executablePath = process.env.CHROME_EXECUTABLE_PATH
    let args = []
    if (!executablePath) {
      const { default: chromium } = await import('@sparticuz/chromium')
      executablePath = await chromium.executablePath()
      args = chromium.args
    }
    browser = await playwright.launch({ executablePath, args, headless: true })
    const page = await browser.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 2, reducedMotion: 'reduce' })
    page.setDefaultTimeout(20000)
    await page.route('**/*', route => {
      const url = new URL(route.request().url())
      return url.origin === config.origin && !url.pathname.startsWith('/api/') ? route.continue() : route.abort()
    })
    await page.addInitScript(data => { window.__LARP_RENDER__ = data }, payload)
    await page.goto(`${config.origin}/render.html`, { waitUntil: 'networkidle', timeout: 25000 })
    await page.waitForSelector('.pnl-card')
    await page.evaluate(async () => {
      await document.fonts.ready
      await Promise.all([...document.images].map(image => image.decode()))
    })
    return await page.locator('.pnl-card').screenshot({ type: 'png', animations: 'disabled', omitBackground: true })
  } finally { await browser?.close() }
}
