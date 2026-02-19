import { defineStore } from 'pinia'
import { initializeThemeMode, type ThemeMode, updateThemeMode } from '../utils/theme'

interface AppState {
  appName: string
  pitch: string
  themeMode: ThemeMode
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    appName: 'PSBTHub',
    pitch:
      'End-to-end encrypted PSBT sharing for Bitcoin signers, built for multisig handoffs. No accounts, no custody, no private keys. Verify and sign in your own wallet.',
    themeMode: 'dark',
  }),
  actions: {
    /**
     * Loads the persisted theme mode and applies it to the document root.
     */
    initializeTheme(): void {
      this.themeMode = initializeThemeMode()
    },
    /**
     * Sets a new theme mode and persists the choice.
     */
    setThemeMode(mode: ThemeMode): void {
      this.themeMode = mode
      updateThemeMode(mode)
    },
    /**
     * Convenience toggle between dark and light mode.
     */
    toggleThemeMode(): void {
      this.setThemeMode(this.themeMode === 'dark' ? 'light' : 'dark')
    },
  },
})
