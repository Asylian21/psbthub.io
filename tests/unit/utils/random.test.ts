/**
 * Unit coverage for shared random helpers.
 */
import { describe, expect, it } from 'vitest'
import { randomIntegerInRange, randomUint32 } from '../../../src/utils/random'

describe('random utils', () => {
  it('produces uint32 values', () => {
    const value = randomUint32(globalThis.crypto)

    expect(Number.isInteger(value)).toBe(true)
    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThanOrEqual(0xffff_ffff)
  })

  it('produces values in requested range', () => {
    for (let index = 0; index < 128; index += 1) {
      const value = randomIntegerInRange(5, 12, globalThis.crypto)
      expect(value).toBeGreaterThanOrEqual(5)
      expect(value).toBeLessThanOrEqual(12)
    }
  })

  it('retries when sampled value would bias range', () => {
    let calls = 0
    const cryptoApi = {
      getRandomValues(values: Uint32Array): Uint32Array {
        values[0] = calls === 0 ? 0xffff_ffff : 5
        calls += 1
        return values
      },
    } as Crypto

    const value = randomIntegerInRange(0, 10, cryptoApi)
    expect(value).toBe(5)
    expect(calls).toBeGreaterThan(1)
  })
})
