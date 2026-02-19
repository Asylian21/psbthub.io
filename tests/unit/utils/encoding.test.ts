/**
 * Unit coverage for shared base64/byte encoding helpers.
 */
import { describe, expect, it } from 'vitest'
import { base64ToBytes, bytesToBase64 } from '../../../src/utils/encoding'

describe('encoding utils', () => {
  it('roundtrips bytes through base64', () => {
    const input = new Uint8Array([1, 2, 3, 250, 251, 252, 253, 254, 255])
    const encoded = bytesToBase64(input)
    const decoded = base64ToBytes(encoded)

    expect(Array.from(decoded)).toEqual(Array.from(input))
  })

  it('encodes and decodes empty arrays', () => {
    const input = new Uint8Array([])
    const encoded = bytesToBase64(input)
    const decoded = base64ToBytes(encoded)

    expect(encoded).toBe('')
    expect(decoded.byteLength).toBe(0)
  })
})
