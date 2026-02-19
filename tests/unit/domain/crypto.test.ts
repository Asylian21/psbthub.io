/**
 * Unit coverage for cryptographic primitives and envelope workflows.
 */
import { describe, expect, it } from 'vitest'
import {
  createPasswordKeyDerivation,
  decodeShareKeyFromFragment,
  decryptBytes,
  deriveShareKeyFromPassword,
  encodeShareKeyForFragment,
  encryptBytes,
  generateShareKeyBytes,
  isPasswordProtectedEnvelope,
  parseEnvelope,
  serializeEnvelope,
} from '../../../src/domain/crypto'

describe('crypto domain', () => {
  it('generates fixed-length share key bytes', () => {
    const keyBytes = generateShareKeyBytes()

    expect(keyBytes.byteLength).toBe(32)
  })

  it('encodes and decodes fragment keys roundtrip', () => {
    const keyBytes = generateShareKeyBytes()
    const encodedResult = encodeShareKeyForFragment(keyBytes)
    expect(encodedResult.ok).toBe(true)
    if (!encodedResult.ok) {
      return
    }

    const decodedResult = decodeShareKeyFromFragment(encodedResult.value)
    expect(decodedResult.ok).toBe(true)
    if (!decodedResult.ok) {
      return
    }

    expect(Array.from(decodedResult.value)).toEqual(Array.from(keyBytes))
  })

  it('rejects malformed fragment keys', () => {
    const result = decodeShareKeyFromFragment('not-base64-url!!!')

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_FRAGMENT_KEY',
        }),
      }),
    )
  })

  it('encrypts and decrypts plaintext with a generated key', async () => {
    const plaintext = new TextEncoder().encode('psbthub-roundtrip')
    const keyBytes = generateShareKeyBytes()
    const encryptedResult = await encryptBytes(plaintext, keyBytes)
    expect(encryptedResult.ok).toBe(true)
    if (!encryptedResult.ok) {
      return
    }

    const decryptedResult = await decryptBytes(encryptedResult.value, keyBytes)
    expect(decryptedResult.ok).toBe(true)
    if (!decryptedResult.ok) {
      return
    }

    expect(new TextDecoder().decode(decryptedResult.value)).toBe('psbthub-roundtrip')
  })

  it('fails decryption with wrong key', async () => {
    const plaintext = new TextEncoder().encode('psbthub-secret')
    const keyBytes = generateShareKeyBytes()
    const encryptedResult = await encryptBytes(plaintext, keyBytes)
    expect(encryptedResult.ok).toBe(true)
    if (!encryptedResult.ok) {
      return
    }

    const wrongKeyBytes = generateShareKeyBytes()
    const decryptedResult = await decryptBytes(encryptedResult.value, wrongKeyBytes)

    expect(decryptedResult).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'DECRYPTION_FAILED',
        }),
      }),
    )
  })

  it('serializes and parses envelope safely', async () => {
    const plaintext = new TextEncoder().encode('envelope-json')
    const keyBytes = generateShareKeyBytes()
    const encryptedResult = await encryptBytes(plaintext, keyBytes)
    expect(encryptedResult.ok).toBe(true)
    if (!encryptedResult.ok) {
      return
    }

    const serialized = serializeEnvelope(encryptedResult.value)
    const parsed = parseEnvelope(serialized)

    expect(parsed).toEqual({
      ok: true,
      value: encryptedResult.value,
    })
  })

  it('creates password-based envelope metadata and decrypts with derived key', async () => {
    const keyDerivationResult = createPasswordKeyDerivation()
    expect(keyDerivationResult.ok).toBe(true)
    if (!keyDerivationResult.ok) {
      return
    }

    const password = 'StrongPassword#2026'
    const keyResult = await deriveShareKeyFromPassword(password, keyDerivationResult.value)
    expect(keyResult.ok).toBe(true)
    if (!keyResult.ok) {
      return
    }

    const plaintext = new TextEncoder().encode('password-protected')
    const encryptedResult = await encryptBytes(plaintext, keyResult.value, {
      keyDerivation: keyDerivationResult.value,
    })
    expect(encryptedResult.ok).toBe(true)
    if (!encryptedResult.ok) {
      return
    }

    expect(isPasswordProtectedEnvelope(encryptedResult.value)).toBe(true)

    const decryptedResult = await decryptBytes(encryptedResult.value, keyResult.value)
    expect(decryptedResult.ok).toBe(true)
    if (!decryptedResult.ok) {
      return
    }

    expect(new TextDecoder().decode(decryptedResult.value)).toBe('password-protected')
  })

  it('rejects invalid password key-derivation metadata', async () => {
    const result = await deriveShareKeyFromPassword('pw', {
      type: 'PBKDF2-SHA256',
      salt: 'bad',
      iterations: 1,
    })

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'INVALID_KEY_DERIVATION',
        }),
      }),
    )
  })
})
