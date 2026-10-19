import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'

// Global Unhandled Rejection & Error Protection
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[Global-UnhandledRejection]', event.reason)
    event.preventDefault?.()
  })

  window.addEventListener('error', (event) => {
    console.warn('[Global-Error]', event.message)
  })

  // Register PWA service worker for mobile installation and offline support
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.debug('[ServiceWorker] Registration skipped:', err)
      })
    })
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
