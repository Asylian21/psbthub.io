/**
 * Unit coverage for shared WebCrypto accessor.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getWebCrypto } from '../../../src/utils/webCrypto'

describe('webCrypto utils', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns global WebCrypto API when available', () => {
    expect(getWebCrypto()).toBe(globalThis.crypto)
  })

  it('returns null when WebCrypto API is unavailable', () => {
    vi.stubGlobal('crypto', undefined)
    expect(getWebCrypto()).toBeNull()
  })
})
