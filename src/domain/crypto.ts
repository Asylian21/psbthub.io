/**
 * Cryptography domain module.
 *
 * Responsibilities:
 * - Generate and encode/decode symmetric share keys.
 * - Derive keys from passwords using PBKDF2-SHA256.
 * - Encrypt/decrypt payload bytes with AES-GCM.
 * - Validate and parse serialized encryption envelopes.
 */
import { base64ToBytes, bytesToBase64 } from '../utils/encoding'

const AES_GCM_ALGORITHM = 'AES-GCM'
const PBKDF2_ALGORITHM = 'PBKDF2'
const PBKDF2_HASH = 'SHA-256'
const ENVELOPE_ALGORITHM = 'AES-GCM-256'
const PASSWORD_DERIVATION_TYPE = 'PBKDF2-SHA256'
const KEY_LENGTH_BYTES = 32
const IV_LENGTH_BYTES = 12
const PASSWORD_SALT_LENGTH_BYTES = 16
const PASSWORD_DERIVATION_MIN_ITERATIONS = 100_000
const PASSWORD_DERIVATION_MAX_ITERATIONS = 1_000_000
const BASE64_URL_PATTERN = /^[A-Za-z0-9_-]+$/

export const DEFAULT_PASSWORD_DERIVATION_ITERATIONS = 310_000

export type CryptoErrorCode =
  | 'WEB_CRYPTO_UNAVAILABLE'
  | 'INVALID_KEY_LENGTH'
  | 'INVALID_PASSWORD'
  | 'INVALID_FRAGMENT_KEY'
  | 'INVALID_KEY_DERIVATION'
  | 'KEY_DERIVATION_FAILED'
  | 'INVALID_ENVELOPE'
  | 'ENCRYPTION_FAILED'
  | 'DECRYPTION_FAILED'

export interface CryptoError {
  kind: 'crypto_error'
  code: CryptoErrorCode
  message: string
}

export type CryptoResult<T> =
  | {
      ok: true
      value: T
    }
  | {
      ok: false
      error: CryptoError
    }

export interface PasswordKeyDerivationV1 {
  type: 'PBKDF2-SHA256'
  salt: string
  iterations: number
}

export interface EncryptionEnvelopeV1 {
  version: 1
  algorithm: 'AES-GCM-256'
  iv: string
  ciphertext: string
  keyDerivation?: PasswordKeyDerivationV1
}

function createCryptoError(code: CryptoErrorCode, message: string): CryptoResult<never> {
  return {
    ok: false,
    error: {
      kind: 'crypto_error',
      code,
      message,
    },
  }
}

function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(base64Url: string): string {
  const padding = (4 - (base64Url.length % 4)) % 4
  const padded = `${base64Url}${'='.repeat(padding)}`
  return padded.replace(/-/g, '+').replace(/_/g, '/')
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return toBase64Url(bytesToBase64(bytes))
}

function base64UrlToBytes(base64Url: string): Uint8Array {
  return base64ToBytes(fromBase64Url(base64Url))
}

function isWebCryptoAvailable(): boolean {
  return typeof globalThis.crypto !== 'undefined' && !!globalThis.crypto.subtle
}

function isValidKeyLength(keyBytes: Uint8Array): boolean {
  return keyBytes.byteLength === KEY_LENGTH_BYTES
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copied = new Uint8Array(bytes.byteLength)
  copied.set(bytes)
  return copied.buffer
}

function isValidPbkdf2Iterations(iterations: number): boolean {
  return (
    Number.isInteger(iterations) &&
    iterations >= PASSWORD_DERIVATION_MIN_ITERATIONS &&
    iterations <= PASSWORD_DERIVATION_MAX_ITERATIONS
  )
}

function isPasswordKeyDerivationShapeValid(
  value: unknown,
): value is PasswordKeyDerivationV1 {
  if (!value || typeof value !== 'object') {
    return false
  }

  const keyDerivation = value as Record<string, unknown>

  return (
    keyDerivation.type === PASSWORD_DERIVATION_TYPE &&
    typeof keyDerivation.salt === 'string' &&
    BASE64_URL_PATTERN.test(keyDerivation.salt) &&
    typeof keyDerivation.iterations === 'number' &&
    isValidPbkdf2Iterations(keyDerivation.iterations)
  )
}

function isEnvelopeShapeValid(value: unknown): value is EncryptionEnvelopeV1 {
  if (!value || typeof value !== 'object') {
    return false
  }

  const envelope = value as Record<string, unknown>

  const hasValidBaseShape =
    envelope.version === 1 &&
    envelope.algorithm === ENVELOPE_ALGORITHM &&
    typeof envelope.iv === 'string' &&
    typeof envelope.ciphertext === 'string' &&
    BASE64_URL_PATTERN.test(envelope.iv) &&
    BASE64_URL_PATTERN.test(envelope.ciphertext)

  if (!hasValidBaseShape) {
    return false
  }

  if (typeof envelope.keyDerivation === 'undefined') {
    return true
  }

  return isPasswordKeyDerivationShapeValid(envelope.keyDerivation)
}

async function importAesKey(
  keyBytes: Uint8Array,
  usages: KeyUsage[],
): Promise<CryptoResult<CryptoKey>> {
  if (!isWebCryptoAvailable()) {
    return createCryptoError(
      'WEB_CRYPTO_UNAVAILABLE',
      'WebCrypto API is not available in this environment.',
    )
  }

  if (!isValidKeyLength(keyBytes)) {
    return createCryptoError(
      'INVALID_KEY_LENGTH',
      `AES-GCM key must be exactly ${KEY_LENGTH_BYTES} bytes.`,
    )
  }

  try {
    const cryptoKey = await globalThis.crypto.subtle.importKey(
      'raw',
      toArrayBuffer(keyBytes),
      { name: AES_GCM_ALGORITHM },
      false,
      usages,
    )

    return {
      ok: true,
      value: cryptoKey,
    }
  } catch {
    return createCryptoError(
      'INVALID_KEY_LENGTH',
      `AES-GCM key must be exactly ${KEY_LENGTH_BYTES} bytes.`,
    )
  }
}

async function importPasswordMaterial(password: string): Promise<CryptoResult<CryptoKey>> {
  if (!isWebCryptoAvailable()) {
    return createCryptoError(
      'WEB_CRYPTO_UNAVAILABLE',
      'WebCrypto API is not available in this environment.',
    )
  }

  const normalizedPassword = password.trim()

  if (!normalizedPassword) {
    return createCryptoError(
      'INVALID_PASSWORD',
      'Password is required to derive a decryption key.',
    )
  }

  try {
    const passwordBytes = new TextEncoder().encode(normalizedPassword)
    const passwordKey = await globalThis.crypto.subtle.importKey(
      'raw',
      passwordBytes.buffer,
      { name: PBKDF2_ALGORITHM },
      false,
      ['deriveBits'],
    )

    return {
      ok: true,
      value: passwordKey,
    }
  } catch {
    return createCryptoError(
      'KEY_DERIVATION_FAILED',
      'Unable to initialize password-based key derivation.',
    )
  }
}

/**
 * Creates fresh PBKDF2 parameters for password mode.
 */
export function createPasswordKeyDerivation(
  iterations: number = DEFAULT_PASSWORD_DERIVATION_ITERATIONS,
): CryptoResult<PasswordKeyDerivationV1> {
  if (!isWebCryptoAvailable()) {
    return createCryptoError(
      'WEB_CRYPTO_UNAVAILABLE',
      'WebCrypto API is not available in this environment.',
    )
  }

  if (!isValidPbkdf2Iterations(iterations)) {
    return createCryptoError(
      'INVALID_KEY_DERIVATION',
      `PBKDF2 iterations must be between ${PASSWORD_DERIVATION_MIN_ITERATIONS} and ${PASSWORD_DERIVATION_MAX_ITERATIONS}.`,
    )
  }

  const saltBytes = new Uint8Array(PASSWORD_SALT_LENGTH_BYTES)
  globalThis.crypto.getRandomValues(saltBytes)

  return {
    ok: true,
    value: {
      type: PASSWORD_DERIVATION_TYPE,
      salt: bytesToBase64Url(saltBytes),
      iterations,
    },
  }
}

/**
 * Derives a deterministic AES key from user password and PBKDF2 metadata.
 */
export async function deriveShareKeyFromPassword(
  password: string,
  keyDerivation: PasswordKeyDerivationV1,
): Promise<CryptoResult<Uint8Array>> {
  if (!isPasswordKeyDerivationShapeValid(keyDerivation)) {
    return createCryptoError(
      'INVALID_KEY_DERIVATION',
      'Password key derivation metadata has an invalid format.',
    )
  }

  const passwordKeyResult = await importPasswordMaterial(password)

  if (!passwordKeyResult.ok) {
    return passwordKeyResult
  }

  let saltBytes: Uint8Array

  try {
    saltBytes = base64UrlToBytes(keyDerivation.salt)
  } catch {
    return createCryptoError(
      'INVALID_KEY_DERIVATION',
      'Password key derivation salt could not be decoded.',
    )
  }

  if (saltBytes.byteLength !== PASSWORD_SALT_LENGTH_BYTES) {
    return createCryptoError(
      'INVALID_KEY_DERIVATION',
      `PBKDF2 salt must be exactly ${PASSWORD_SALT_LENGTH_BYTES} bytes.`,
    )
  }

  try {
    const derivedBits = await globalThis.crypto.subtle.deriveBits(
      {
        name: PBKDF2_ALGORITHM,
        hash: PBKDF2_HASH,
        salt: toArrayBuffer(saltBytes),
        iterations: keyDerivation.iterations,
      },
      passwordKeyResult.value,
      KEY_LENGTH_BYTES * 8,
    )

    const derivedKeyBytes = new Uint8Array(derivedBits)

    if (!isValidKeyLength(derivedKeyBytes)) {
      return createCryptoError(
        'KEY_DERIVATION_FAILED',
        `Derived AES key must be exactly ${KEY_LENGTH_BYTES} bytes.`,
      )
    }

    return {
      ok: true,
      value: derivedKeyBytes,
    }
  } catch {
    return createCryptoError(
      'KEY_DERIVATION_FAILED',
      'Unable to derive a key from the provided password.',
    )
  }
}

/**
 * Type guard for envelopes that require password-based key derivation.
 */
export function isPasswordProtectedEnvelope(
  envelope: EncryptionEnvelopeV1,
): envelope is EncryptionEnvelopeV1 & { keyDerivation: PasswordKeyDerivationV1 } {
  return typeof envelope.keyDerivation !== 'undefined'
}

/**
 * Generates a random 32-byte AES key.
 */
export function generateShareKeyBytes(): Uint8Array {
  const keyBytes = new Uint8Array(KEY_LENGTH_BYTES)
  globalThis.crypto.getRandomValues(keyBytes)
  return keyBytes
}

/**
 * Encodes raw key bytes for URL fragment transport.
 */
export function encodeShareKeyForFragment(keyBytes: Uint8Array): CryptoResult<string> {
  if (!isValidKeyLength(keyBytes)) {
    return createCryptoError(
      'INVALID_KEY_LENGTH',
      `AES-GCM key must be exactly ${KEY_LENGTH_BYTES} bytes.`,
    )
  }

  return {
    ok: true,
    value: bytesToBase64Url(keyBytes),
  }
}

/**
 * Decodes and validates URL-fragment key material.
 */
export function decodeShareKeyFromFragment(fragmentKey: string): CryptoResult<Uint8Array> {
  const normalized = fragmentKey.trim()

  if (!normalized || !BASE64_URL_PATTERN.test(normalized)) {
    return createCryptoError(
      'INVALID_FRAGMENT_KEY',
      'Fragment key is missing or has an invalid format.',
    )
  }

  try {
    const keyBytes = base64UrlToBytes(normalized)

    if (!isValidKeyLength(keyBytes)) {
      return createCryptoError(
        'INVALID_FRAGMENT_KEY',
        `Fragment key must decode to ${KEY_LENGTH_BYTES} bytes.`,
      )
    }

    return {
      ok: true,
      value: keyBytes,
    }
  } catch {
    return createCryptoError(
      'INVALID_FRAGMENT_KEY',
      'Fragment key could not be decoded.',
    )
  }
}

/**
 * Encrypts plaintext bytes into a versioned envelope.
 */
export async function encryptBytes(
  plaintext: Uint8Array,
  keyBytes: Uint8Array,
  options: {
    keyDerivation?: PasswordKeyDerivationV1
  } = {},
): Promise<CryptoResult<EncryptionEnvelopeV1>> {
  if (
    typeof options.keyDerivation !== 'undefined' &&
    !isPasswordKeyDerivationShapeValid(options.keyDerivation)
  ) {
    return createCryptoError(
      'INVALID_KEY_DERIVATION',
      'Password key derivation metadata has an invalid format.',
    )
  }

  const importedKeyResult = await importAesKey(keyBytes, ['encrypt'])

  if (!importedKeyResult.ok) {
    return importedKeyResult
  }

  const iv = new Uint8Array(IV_LENGTH_BYTES)
  globalThis.crypto.getRandomValues(iv)

  try {
    const encrypted = await globalThis.crypto.subtle.encrypt(
      {
        name: AES_GCM_ALGORITHM,
        iv: toArrayBuffer(iv),
      },
      importedKeyResult.value,
      toArrayBuffer(plaintext),
    )

    return {
      ok: true,
      value: {
        version: 1,
        algorithm: ENVELOPE_ALGORITHM,
        iv: bytesToBase64Url(iv),
        ciphertext: bytesToBase64Url(new Uint8Array(encrypted)),
        keyDerivation: options.keyDerivation,
      },
    }
  } catch {
    return createCryptoError('ENCRYPTION_FAILED', 'PSBT encryption failed.')
  }
}

/**
 * Decrypts envelope bytes using the provided symmetric key.
 */
export async function decryptBytes(
  envelope: EncryptionEnvelopeV1,
  keyBytes: Uint8Array,
): Promise<CryptoResult<Uint8Array>> {
  if (!isEnvelopeShapeValid(envelope)) {
    return createCryptoError(
      'INVALID_ENVELOPE',
      'Ciphertext envelope has an invalid schema.',
    )
  }

  const importedKeyResult = await importAesKey(keyBytes, ['decrypt'])

  if (!importedKeyResult.ok) {
    return importedKeyResult
  }

  let ivBytes: Uint8Array
  let ciphertextBytes: Uint8Array

  try {
    ivBytes = base64UrlToBytes(envelope.iv)
    ciphertextBytes = base64UrlToBytes(envelope.ciphertext)
  } catch {
    return createCryptoError(
      'INVALID_ENVELOPE',
      'Ciphertext envelope could not be decoded.',
    )
  }

  if (ivBytes.byteLength !== IV_LENGTH_BYTES) {
    return createCryptoError(
      'INVALID_ENVELOPE',
      `AES-GCM IV must be exactly ${IV_LENGTH_BYTES} bytes.`,
    )
  }

  try {
    const decrypted = await globalThis.crypto.subtle.decrypt(
      {
        name: AES_GCM_ALGORITHM,
        iv: toArrayBuffer(ivBytes),
      },
      importedKeyResult.value,
      toArrayBuffer(ciphertextBytes),
    )

    return {
      ok: true,
      value: new Uint8Array(decrypted),
    }
  } catch {
    return createCryptoError(
      'DECRYPTION_FAILED',
      'Ciphertext could not be decrypted with the provided key.',
    )
  }
}

/**
 * Serializes an encryption envelope into JSON for storage transport.
 */
export function serializeEnvelope(envelope: EncryptionEnvelopeV1): string {
  return JSON.stringify(envelope)
}

/**
 * Parses and validates a serialized encryption envelope.
 */
export function parseEnvelope(rawEnvelope: string): CryptoResult<EncryptionEnvelopeV1> {
  try {
    const parsed: unknown = JSON.parse(rawEnvelope)

    if (!isEnvelopeShapeValid(parsed)) {
      return createCryptoError(
        'INVALID_ENVELOPE',
        'Ciphertext envelope has an invalid schema.',
      )
    }

    return {
      ok: true,
      value: parsed,
    }
  } catch {
    return createCryptoError(
      'INVALID_ENVELOPE',
      'Ciphertext envelope is not valid JSON.',
    )
  }
}
