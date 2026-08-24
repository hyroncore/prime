import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { DirectionProvider } from './components/ui/direction'
import { applyTheme, SETTINGS_STORAGE_KEY, type ThemePreference } from './store/useSettingsStore'
import './index.css'

try {
  const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
  if (stored) {
    const parsed = JSON.parse(stored) as { state?: { theme?: ThemePreference } }
    applyTheme(parsed?.state?.theme ?? 'system')
  } else {
    applyTheme('system')
  }
} catch {
  applyTheme('system')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <DirectionProvider direction="rtl">
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </DirectionProvider>
    </ErrorBoundary>
  </React.StrictMode>
)