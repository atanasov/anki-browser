import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import './services/uiScaleService' // Initialize global UI scale on app start
import App from './App.jsx'

// Capture install prompt before React mounts — the event fires very early
window.__pwaInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  window.__pwaInstallPrompt = e;
  window.dispatchEvent(new Event("pwainstallready"));
});

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
