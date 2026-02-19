/**
 * Unit coverage for share delete-capability token generation and hashing.
 */
import { describe, expect, it } from 'vitest'
import {
  generateShareDeleteCapabilityToken,
  hashShareDeleteCapabilityToken,
  isValidShareDeleteCapabilityHash,
  isValidShareDeleteCapabilityToken,
} from '../../../src/domain/shareDeleteCapability'

describe('shareDeleteCapability domain', () => {
  it('generates a valid delete capability token', () => {
    const tokenResult = generateShareDeleteCapabilityToken()
    expect(tokenResult.ok).toBe(true)
    if (!tokenResult.ok) {
      return
    }

    expect(isValidShareDeleteCapabilityToken(tokenResult.value)).toBe(true)
  })

  it('hashes token deterministically into lowercase sha256', async () => {
    const tokenResult = generateShareDeleteCapabilityToken()
    expect(tokenResult.ok).toBe(true)
    if (!tokenResult.ok) {
      return
    }

    const firstHash = await hashShareDeleteCapabilityToken(tokenResult.value)
    const secondHash = await hashShareDeleteCapabilityToken(tokenResult.value)

    expect(firstHash.ok).toBe(true)
    expect(secondHash.ok).toBe(true)

    if (!firstHash.ok || !secondHash.ok) {
      return
    }

    expect(firstHash.value).toBe(secondHash.value)
    expect(isValidShareDeleteCapabilityHash(firstHash.value)).toBe(true)
  })

  it('rejects hashing for invalid delete capability token', async () => {
    const hashResult = await hashShareDeleteCapabilityToken('bad token')

    expect(hashResult).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_DELETE_CAPABILITY',
        }),
      }),
    )
  })
})
