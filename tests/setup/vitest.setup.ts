/**
 * Global Vitest test environment setup.
 *
 * Provides browser-compatible polyfills/mocks (WebCrypto, atob/btoa,
 * matchMedia, localStorage) for deterministic unit test execution.
 */
import { webcrypto } from 'node:crypto'
import { beforeEach, vi } from 'vitest'

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  })
}

if (!globalThis.atob) {
  Object.defineProperty(globalThis, 'atob', {
    value: (value: string): string => Buffer.from(value, 'base64').toString('binary'),
    configurable: true,
  })
}

if (!globalThis.btoa) {
  Object.defineProperty(globalThis, 'btoa', {
    value: (value: string): string => Buffer.from(value, 'binary').toString('base64'),
    configurable: true,
  })
}

if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

if (typeof window !== 'undefined') {
  const storageState = new Map<string, string>()
  const memoryStorage: Storage = {
    get length(): number {
      return storageState.size
    },
    clear(): void {
      storageState.clear()
    },
    getItem(key: string): string | null {
      return storageState.get(key) ?? null
    },
    key(index: number): string | null {
      return Array.from(storageState.keys())[index] ?? null
    },
    removeItem(key: string): void {
      storageState.delete(key)
    },
    setItem(key: string, value: string): void {
      storageState.set(key, String(value))
    },
  }

  Object.defineProperty(window, 'localStorage', {
    value: memoryStorage,
    configurable: true,
  })
}

beforeEach(() => {
  if (typeof window !== 'undefined') {
    window.localStorage.clear()
    window.location.hash = ''
  }
})
