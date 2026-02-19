/**
 * Unit coverage for theme utility persistence and DOM class behavior.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { initializeThemeMode, updateThemeMode } from '../../../src/utils/theme'

describe('theme utils', () => {
  beforeEach(() => {
    if (typeof window.localStorage.clear === 'function') {
      window.localStorage.clear()
    } else if (typeof window.localStorage.removeItem === 'function') {
      window.localStorage.removeItem('psbthub-theme-mode')
    }
    document.documentElement.className = ''
    document.documentElement.style.colorScheme = ''
  })

  it('initializes to default dark mode when nothing stored', () => {
    const mode = initializeThemeMode()

    expect(mode).toBe('dark')
    expect(document.documentElement.classList.contains('app-dark')).toBe(true)
    expect(document.documentElement.classList.contains('app-light')).toBe(false)
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('initializes from stored theme mode', () => {
    window.localStorage.setItem('psbthub-theme-mode', 'light')

    const mode = initializeThemeMode()

    expect(mode).toBe('light')
    expect(document.documentElement.classList.contains('app-light')).toBe(true)
    expect(document.documentElement.classList.contains('app-dark')).toBe(false)
    expect(document.documentElement.style.colorScheme).toBe('light')
  })

  it('updates theme mode and persists it', () => {
    updateThemeMode('light')

    expect(window.localStorage.getItem('psbthub-theme-mode')).toBe('light')
    expect(document.documentElement.classList.contains('app-light')).toBe(true)
    expect(document.documentElement.classList.contains('app-dark')).toBe(false)
  })
})
