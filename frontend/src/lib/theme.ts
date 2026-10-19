import { useState, useEffect } from 'react'

export type ThemeMode = 'dark' | 'light'

const THEME_STORAGE_KEY = 'w2w_theme'

export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'dark' || saved === 'light') {
      return saved
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light'
    }
  } catch {
    // Fallback safely to dark theme
  }

  return 'dark'
}

export function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.add('light')
    root.classList.remove('dark')
  }

  root.style.colorScheme = theme

  // Update mobile status bar theme color
  const metaThemeColor = document.querySelector('meta[name="theme-color"]')
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#000000' : '#f6f8fb')
  }

  window.dispatchEvent(new CustomEvent('w2w-theme-change', { detail: { theme } }))
}

export function setTheme(theme: ThemeMode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage access unavailable
  }
  applyTheme(theme)
}

export function toggleTheme(): ThemeMode {
  const current = getInitialTheme()
  const next: ThemeMode = current === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}

export function useTheme() {
  const [theme, setLocalTheme] = useState<ThemeMode>(getInitialTheme)

  useEffect(() => {
    // Apply on initial mount
    applyTheme(theme)

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme: ThemeMode }>
      if (customEvent.detail?.theme) {
        setLocalTheme(customEvent.detail.theme)
      }
    }

    window.addEventListener('w2w-theme-change', handleThemeChange)

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleMediaChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem(THEME_STORAGE_KEY)
      if (!saved) {
        const autoTheme: ThemeMode = e.matches ? 'dark' : 'light'
        applyTheme(autoTheme)
        setLocalTheme(autoTheme)
      }
    }

    mediaQuery.addEventListener('change', handleMediaChange)

    return () => {
      window.removeEventListener('w2w-theme-change', handleThemeChange)
      mediaQuery.removeEventListener('change', handleMediaChange)
    }
  }, [theme])

  const toggle = () => {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setLocalTheme(next)
  }

  const set = (newTheme: ThemeMode) => {
    setTheme(newTheme)
    setLocalTheme(newTheme)
  }

  return {
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    toggleTheme: toggle,
    setTheme: set,
  }
}
