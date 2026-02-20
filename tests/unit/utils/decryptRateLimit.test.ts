/**
 * Unit coverage for password decryption attempt rate limiting utility.
 */
import { describe, expect, it } from 'vitest'
import {
  checkDecryptRateLimit,
  recordDecryptAttempt,
  DECRYPT_COOLDOWN_MS,
} from '../../../src/utils/decryptRateLimit'
import type { BrowserStorageLike } from '../../../src/utils/decryptRateLimit'

function createMemoryStorage(initial: Record<string, string> = {}): BrowserStorageLike {
  const map = new Map<string, string>(Object.entries(initial))
  return {
    getItem(key: string): string | null {
      return map.get(key) ?? null
    },
    setItem(key: string, value: string): void {
      map.set(key, value)
    },
  }
}

describe('decryptRateLimit utils', () => {
  it('allows first attempt when no previous attempt exists', () => {
    const storage = createMemoryStorage()
    const result = checkDecryptRateLimit('share-abc', storage, 1_000)
    expect(result.allowed).toBe(true)
    expect(result.retryAfterMs).toBe(0)
  })

  it('allows attempt after cooldown has fully elapsed', () => {
    const storage = createMemoryStorage()
    recordDecryptAttempt('share-abc', storage, 1_000)
    const result = checkDecryptRateLimit('share-abc', storage, 1_000 + DECRYPT_COOLDOWN_MS)
    expect(result.allowed).toBe(true)
    expect(result.retryAfterMs).toBe(0)
  })

  it('blocks attempt within cooldown window and reports remaining time', () => {
    const storage = createMemoryStorage()
    const attemptTime = 10_000
    recordDecryptAttempt('share-abc', storage, attemptTime)

    const checkTime = attemptTime + 2_000
    const result = checkDecryptRateLimit('share-abc', storage, checkTime)
    expect(result.allowed).toBe(false)
    expect(result.retryAfterMs).toBe(DECRYPT_COOLDOWN_MS - 2_000)
  })

  it('is independent per shareId', () => {
    const storage = createMemoryStorage()
    recordDecryptAttempt('share-aaa', storage, 1_000)

    const resultAaa = checkDecryptRateLimit('share-aaa', storage, 1_001)
    const resultBbb = checkDecryptRateLimit('share-bbb', storage, 1_001)

    expect(resultAaa.allowed).toBe(false)
    expect(resultBbb.allowed).toBe(true)
  })

  it('allows attempt exactly at cooldown boundary', () => {
    const storage = createMemoryStorage()
    recordDecryptAttempt('share-abc', storage, 1_000)
    const result = checkDecryptRateLimit('share-abc', storage, 1_000 + DECRYPT_COOLDOWN_MS)
    expect(result.allowed).toBe(true)
  })

  it('tolerates corrupt storage value and allows attempt', () => {
    const storage = createMemoryStorage({ 'psbthub:decrypt-attempt:share-abc': 'not-a-number' })
    const result = checkDecryptRateLimit('share-abc', storage, 1_000)
    expect(result.allowed).toBe(true)
  })

  it('tolerates empty string in storage and allows attempt', () => {
    const storage = createMemoryStorage({ 'psbthub:decrypt-attempt:share-abc': '' })
    const result = checkDecryptRateLimit('share-abc', storage, 1_000)
    expect(result.allowed).toBe(true)
  })
})
