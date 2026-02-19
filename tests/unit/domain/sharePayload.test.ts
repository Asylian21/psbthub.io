/**
 * Unit coverage for share payload encoding/decoding and size obfuscation.
 */
import { describe, expect, it } from 'vitest'
import {
  createObfuscatedSizeBytes,
  decodeSharePayload,
  encodeSharePayload,
} from '../../../src/domain/sharePayload'
import { generateShareDeleteCapabilityToken } from '../../../src/domain/shareDeleteCapability'
import { base64ToBytes } from '../../../src/utils/encoding'
import { createSampleValidatedPsbt } from '../../shared/psbtFixture'

describe('sharePayload domain', () => {
  const validatedPsbt = createSampleValidatedPsbt()

  it('encodes and decodes v1 wrapped payload', () => {
    const encoded = encodeSharePayload(validatedPsbt)
    expect(encoded.ok).toBe(true)
    if (!encoded.ok) {
      return
    }

    const decoded = decodeSharePayload(encoded.value.bytes)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) {
      return
    }

    expect(decoded.value.psbtBase64).toBe(validatedPsbt.base64)
    expect(decoded.value.format).toBe('v1_json')
    expect(decoded.value.decoyLength).toBeGreaterThan(0)
    expect(decoded.value.deleteToken).toBeNull()
  })

  it('encodes and decodes payload with delete capability token', () => {
    const deleteTokenResult = generateShareDeleteCapabilityToken()
    expect(deleteTokenResult.ok).toBe(true)
    if (!deleteTokenResult.ok) {
      return
    }

    const encoded = encodeSharePayload(validatedPsbt, {
      deleteToken: deleteTokenResult.value,
    })
    expect(encoded.ok).toBe(true)
    if (!encoded.ok) {
      return
    }

    const decoded = decodeSharePayload(encoded.value.bytes)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) {
      return
    }

    expect(decoded.value.deleteToken).toBe(deleteTokenResult.value)
  })

  it('decodes legacy raw PSBT payload bytes', () => {
    const legacyBytes = base64ToBytes(validatedPsbt.base64)
    const decoded = decodeSharePayload(legacyBytes)

    expect(decoded.ok).toBe(true)
    if (!decoded.ok) {
      return
    }

    expect(decoded.value.psbtBase64).toBe(validatedPsbt.base64)
    expect(decoded.value.format).toBe('legacy_raw_psbt')
    expect(decoded.value.decoyLength).toBeNull()
    expect(decoded.value.deleteToken).toBeNull()
  })

  it('rejects payload with oversized decoy', () => {
    const oversizedPayload = JSON.stringify({
      version: 1,
      data: validatedPsbt.base64,
      decoy: 'a'.repeat(130 * 1024),
    })
    const decoded = decodeSharePayload(new TextEncoder().encode(oversizedPayload))

    expect(decoded).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_PAYLOAD',
        }),
      }),
    )
  })

  it('creates obfuscated size bytes in allowed range', () => {
    const result = createObfuscatedSizeBytes(validatedPsbt.byteLength)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.value).toBeGreaterThanOrEqual(validatedPsbt.byteLength)
    expect(result.value).toBeLessThanOrEqual(1024 * 1024)
  })

  it('rejects invalid PSBT size for obfuscation', () => {
    const result = createObfuscatedSizeBytes(0)

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_PSBT',
        }),
      }),
    )
  })
})
