import { createRoot } from 'react-dom/client'
import PnlCard from './PnlCard.jsx'
import { platforms } from './platforms.js'
import './fonts.js'
import './styles.css'
import './access.css'

const data = window.__LARP_RENDER__
if (data && platforms.some(item => item.id === data.platformId)) {
  document.body.className = 'export-render-page'
  createRoot(document.getElementById('root')).render(<PnlCard platform={platforms.find(item => item.id === data.platformId)} values={data.values} media={data.media} />)
}
