import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import './services/uiScaleService' // Initialize global UI scale on app start
import App from './App.jsx'

registerSW({
  onNeedRefresh(updateSW) {
    updateSW(true)
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
