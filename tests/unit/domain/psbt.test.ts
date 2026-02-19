/**
 * Unit coverage for PSBT normalization, validation, and preview decoding.
 */
import { describe, expect, it } from 'vitest'
import {
  base64ToBytes,
  bytesToBase64,
  decodePsbtTransactionPreview,
  hexToBytes,
  isValidPsbtBase64,
  validatePsbtBase64,
  validatePsbtBytes,
  validatePsbtHex,
  validatePsbtPayloadText,
} from '../../../src/domain/psbt'
import { createSamplePsbtBase64 } from '../../shared/psbtFixture'

function bytesToHex(bytes: Uint8Array): string {
  let output = ''

  for (const byte of bytes) {
    output += byte.toString(16).padStart(2, '0')
  }

  return output
}

describe('psbt domain', () => {
  const sampleBase64 = createSamplePsbtBase64()
  const sampleBytes = base64ToBytes(sampleBase64)
  const sampleHex = bytesToHex(sampleBytes)

  it('converts base64 bytes and back', () => {
    const roundtripBase64 = bytesToBase64(sampleBytes)
    expect(roundtripBase64).toBe(sampleBase64)
  })

  it('validates base64 PSBT input', () => {
    const result = validatePsbtBase64(sampleBase64)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.value.base64).toBe(sampleBase64)
    expect(result.value.byteLength).toBeGreaterThan(0)
  })

  it('validates hex PSBT input', () => {
    const result = validatePsbtHex(sampleHex)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.value.base64).toBe(sampleBase64)
  })

  it('parses PSBT candidate from query-like payload', () => {
    const input = `https://example.com/import?psbt=${encodeURIComponent(sampleBase64)}`
    const result = validatePsbtPayloadText(input)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.value.base64).toBe(sampleBase64)
  })

  it('parses PSBT candidate from nested JSON payload', () => {
    const input = JSON.stringify({
      transfer: {
        nested: {
          psbtBase64: sampleBase64,
        },
      },
    })
    const result = validatePsbtPayloadText(input)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.value.base64).toBe(sampleBase64)
  })

  it('returns INVALID_BASE64_OR_HEX for garbage payload', () => {
    const result = validatePsbtPayloadText('this-is-not-a-psbt')

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_BASE64_OR_HEX',
        }),
      }),
    )
  })

  it('returns PSBT_TOO_LARGE when maxBytes is lower than payload size', () => {
    const result = validatePsbtBase64(sampleBase64, 10)

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'PSBT_TOO_LARGE',
        }),
      }),
    )
  })

  it('validates bytes and returns normalized base64', () => {
    const result = validatePsbtBytes(sampleBytes)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.value.base64).toBe(sampleBase64)
  })

  it('decodes a transaction preview for a valid PSBT', () => {
    const result = decodePsbtTransactionPreview(sampleBase64)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.value.inputs.length).toBe(1)
    expect(result.value.outputs.length).toBe(1)
    expect(result.value.txid).toHaveLength(64)
  })

  it('reports boolean validity with isValidPsbtBase64', () => {
    expect(isValidPsbtBase64(sampleBase64)).toBe(true)
    expect(isValidPsbtBase64('invalid')).toBe(false)
  })

  it('converts hex to bytes', () => {
    const bytes = hexToBytes(sampleHex)

    expect(Array.from(bytes)).toEqual(Array.from(sampleBytes))
  })
})
