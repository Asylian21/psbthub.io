/**
 * Unit coverage for browser-side share creation rate limiting utility.
 */
import { describe, expect, it } from 'vitest'
import {
  readShareCreationRateLimitState,
  recordShareCreationAttempt,
} from '../../../src/utils/shareCreationRateLimit'

function createMemoryStorage(initial: Record<string, string> = {}): {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
} {
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

describe('shareCreationRateLimit utils', () => {
  it('allows requests while under the limit', () => {
    const storage = createMemoryStorage()
    const now = 1_000
    const options = {
      maxAttempts: 2,
      windowMs: 10_000,
      storageKey: 'test',
    }

    let state = readShareCreationRateLimitState(storage, now, options)
    expect(state.allowed).toBe(true)
    expect(state.attemptsInWindow).toBe(0)

    recordShareCreationAttempt(storage, now, options)
    state = readShareCreationRateLimitState(storage, now + 1, options)
    expect(state.allowed).toBe(true)
    expect(state.attemptsInWindow).toBe(1)
  })

  it('blocks requests at the limit and reports retry delay', () => {
    const storage = createMemoryStorage()
    const options = {
      maxAttempts: 2,
      windowMs: 10_000,
      storageKey: 'test',
    }

    recordShareCreationAttempt(storage, 1_000, options)
    recordShareCreationAttempt(storage, 2_000, options)

    const blocked = readShareCreationRateLimitState(storage, 3_000, options)
    expect(blocked.allowed).toBe(false)
    expect(blocked.attemptsInWindow).toBe(2)
    expect(blocked.retryAfterMs).toBe(8_000)
  })

  it('expires stale timestamps outside the active window', () => {
    const storage = createMemoryStorage({
      test: JSON.stringify([1_000, 40_000]),
    })
    const options = {
      maxAttempts: 2,
      windowMs: 10_000,
      storageKey: 'test',
    }

    const state = readShareCreationRateLimitState(storage, 50_000, options)
    expect(state.allowed).toBe(true)
    expect(state.attemptsInWindow).toBe(1)
  })

  it('handles malformed storage payloads safely', () => {
    const storage = createMemoryStorage({
      test: '{"bad":"payload"}',
    })

    const state = readShareCreationRateLimitState(storage, 100_000, {
      storageKey: 'test',
    })

    expect(state.allowed).toBe(true)
    expect(state.attemptsInWindow).toBe(0)
  })
})
