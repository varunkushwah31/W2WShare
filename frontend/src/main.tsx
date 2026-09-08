import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'

// Global Unhandled Rejection & Error Protection
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[Global-UnhandledRejection]', event.reason)
    // Prevent default browser popup/error crashing
    event.preventDefault?.()
  })

  window.addEventListener('error', (event) => {
    console.warn('[Global-Error]', event.message)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
