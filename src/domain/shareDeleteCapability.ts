/**
 * Share delete-capability domain module.
 *
 * A share carries a random delete token inside encrypted plaintext payload.
 * The backend stores only the token hash and requires it for manual deletion.
 */
import { bytesToBase64 } from '../utils/encoding'
import { getWebCrypto } from '../utils/webCrypto'

const DELETE_CAPABILITY_TOKEN_BYTES = 32
const DELETE_CAPABILITY_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/
const DELETE_CAPABILITY_HASH_PATTERN = /^[0-9a-f]{64}$/

export type ShareDeleteCapabilityErrorCode =
  | 'WEB_CRYPTO_UNAVAILABLE'
  | 'INVALID_DELETE_CAPABILITY'
  | 'HASH_FAILED'

export interface ShareDeleteCapabilityError {
  kind: 'share_delete_capability_error'
  code: ShareDeleteCapabilityErrorCode
  message: string
}

export type ShareDeleteCapabilityResult<T> =
  | {
      ok: true
      value: T
    }
  | {
      ok: false
      error: ShareDeleteCapabilityError
    }

function createShareDeleteCapabilityError(
  code: ShareDeleteCapabilityErrorCode,
  message: string,
): ShareDeleteCapabilityResult<never> {
  return {
    ok: false,
    error: {
      kind: 'share_delete_capability_error',
      code,
      message,
    },
  }
}

function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return toBase64Url(bytesToBase64(bytes))
}

function bytesToLowerHex(bytes: Uint8Array): string {
  let output = ''

  for (const byte of bytes) {
    output += byte.toString(16).padStart(2, '0')
  }

  return output
}

function normalizeDeleteCapabilityToken(rawToken: string): string {
  return rawToken.trim()
}

function normalizeDeleteCapabilityHash(rawHash: string): string {
  return rawHash.trim().toLowerCase()
}

export function isValidShareDeleteCapabilityToken(token: string): boolean {
  const normalizedToken = normalizeDeleteCapabilityToken(token)
  return DELETE_CAPABILITY_TOKEN_PATTERN.test(normalizedToken)
}

export function isValidShareDeleteCapabilityHash(hash: string): boolean {
  const normalizedHash = normalizeDeleteCapabilityHash(hash)
  return DELETE_CAPABILITY_HASH_PATTERN.test(normalizedHash)
}

/**
 * Generates a URL-safe random delete capability token.
 */
export function generateShareDeleteCapabilityToken(): ShareDeleteCapabilityResult<string> {
  const cryptoApi = getWebCrypto()

  if (!cryptoApi) {
    return createShareDeleteCapabilityError(
      'WEB_CRYPTO_UNAVAILABLE',
      'WebCrypto API is not available in this environment.',
    )
  }

  const tokenBytes = new Uint8Array(DELETE_CAPABILITY_TOKEN_BYTES)
  cryptoApi.getRandomValues(tokenBytes)

  return {
    ok: true,
    value: bytesToBase64Url(tokenBytes),
  }
}

/**
 * Returns lowercase SHA-256 hash for a valid delete capability token.
 */
export async function hashShareDeleteCapabilityToken(
  rawToken: string,
): Promise<ShareDeleteCapabilityResult<string>> {
  const cryptoApi = getWebCrypto()

  if (!cryptoApi || !cryptoApi.subtle) {
    return createShareDeleteCapabilityError(
      'WEB_CRYPTO_UNAVAILABLE',
      'WebCrypto API is not available in this environment.',
    )
  }

  const normalizedToken = normalizeDeleteCapabilityToken(rawToken)

  if (!isValidShareDeleteCapabilityToken(normalizedToken)) {
    return createShareDeleteCapabilityError(
      'INVALID_DELETE_CAPABILITY',
      'Share delete capability token has an invalid format.',
    )
  }

  try {
    const digestBuffer = await cryptoApi.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(normalizedToken),
    )

    return {
      ok: true,
      value: bytesToLowerHex(new Uint8Array(digestBuffer)),
    }
  } catch {
    return createShareDeleteCapabilityError(
      'HASH_FAILED',
      'Unable to hash share delete capability token.',
    )
  }
}
