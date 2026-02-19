/**
 * Theme persistence and DOM synchronization utilities.
 *
 * Keeps PrimeVue dark/light mode in sync with localStorage and root classes.
 */
export type ThemeMode = 'light' | 'dark'

const THEME_MODE_STORAGE_KEY = 'psbthub-theme-mode'
const DARK_MODE_CLASS = 'app-dark'
const LIGHT_MODE_CLASS = 'app-light'
const DEFAULT_THEME_MODE: ThemeMode = 'dark'

function canUseDom(): boolean {
  return typeof window !== 'undefined'
}

function isThemeMode(value: string): value is ThemeMode {
  return value === 'light' || value === 'dark'
}

function resolveDefaultThemeMode(): ThemeMode {
  return DEFAULT_THEME_MODE
}

function readStoredThemeMode(): ThemeMode | null {
  if (!canUseDom()) {
    return null
  }

  const storedValue = window.localStorage.getItem(THEME_MODE_STORAGE_KEY)
  if (!storedValue || !isThemeMode(storedValue)) {
    return null
  }

  return storedValue
}

function applyThemeClass(mode: ThemeMode): void {
  if (!canUseDom()) {
    return
  }

  const root = window.document.documentElement
  root.classList.toggle(DARK_MODE_CLASS, mode === 'dark')
  root.classList.toggle(LIGHT_MODE_CLASS, mode === 'light')
  root.style.colorScheme = mode
}

export function initializeThemeMode(): ThemeMode {
  const initialMode = readStoredThemeMode() ?? resolveDefaultThemeMode()
  applyThemeClass(initialMode)
  return initialMode
}

/**
 * Persists and applies the selected theme mode.
 */
export function updateThemeMode(mode: ThemeMode): void {
  if (canUseDom()) {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode)
  }

  applyThemeClass(mode)
}
