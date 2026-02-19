/**
 * Unit coverage for app store theme actions.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAppStore } from '../../../src/stores/app'

const { initializeThemeModeMock, updateThemeModeMock } = vi.hoisted(() => ({
  initializeThemeModeMock: vi.fn(() => 'dark' as const),
  updateThemeModeMock: vi.fn(),
}))

vi.mock('../../../src/utils/theme', () => ({
  initializeThemeMode: () => initializeThemeModeMock(),
  updateThemeMode: (mode: 'light' | 'dark') => updateThemeModeMock(mode),
}))

describe('app store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    initializeThemeModeMock.mockReset()
    updateThemeModeMock.mockReset()
    initializeThemeModeMock.mockReturnValue('dark')
  })

  it('initializes theme mode through utility', () => {
    initializeThemeModeMock.mockReturnValue('light')
    const store = useAppStore()
    store.initializeTheme()

    expect(store.themeMode).toBe('light')
    expect(initializeThemeModeMock).toHaveBeenCalledTimes(1)
  })

  it('sets and toggles theme mode', () => {
    const store = useAppStore()

    store.setThemeMode('light')
    expect(store.themeMode).toBe('light')
    expect(updateThemeModeMock).toHaveBeenCalledWith('light')

    store.toggleThemeMode()
    expect(store.themeMode).toBe('dark')
    expect(updateThemeModeMock).toHaveBeenCalledWith('dark')
  })
})
