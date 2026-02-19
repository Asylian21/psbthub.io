/**
 * Share payload domain module.
 *
 * Encodes/decodes plaintext payloads before encryption, including randomized
 * decoy padding to reduce straightforward size fingerprinting.
 */
import {
  DEFAULT_MAX_PSBT_BYTES,
  type ValidatedPsbt,
  validatePsbtBase64,
} from './psbt'
import { isValidShareDeleteCapabilityToken } from './shareDeleteCapability'
import { bytesToBase64 } from '../utils/encoding'
import { randomIntegerInRange } from '../utils/random'
import { isRecord } from '../utils/typeGuards'
import { getWebCrypto } from '../utils/webCrypto'

const SHARE_PLAINTEXT_VERSION = 1
const DECOY_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const DECOY_LENGTH_MIN = 4096
const DECOY_LENGTH_MAX = 24576
const MAX_ACCEPTED_DECOY_LENGTH = 128 * 1024
const SIZE_MASK_JITTER_MIN = 2048
const SIZE_MASK_JITTER_MAX = 16384

export type SharePayloadErrorCode =
  | 'WEB_CRYPTO_UNAVAILABLE'
  | 'INVALID_PAYLOAD'
  | 'INVALID_PSBT'

export interface SharePayloadError {
  kind: 'share_payload_error'
  code: SharePayloadErrorCode
  message: string
}

export type SharePayloadResult<T> =
  | {
    ok: true
    value: T
  }
  | {
    ok: false
    error: SharePayloadError
  }

export interface SharePlaintextPayloadV1 {
  version: 1
  data: string
  decoy: string
  deleteToken?: string
}

export interface EncodedSharePayload {
  bytes: Uint8Array
  decoyLength: number
}

export interface EncodeSharePayloadOptions {
  deleteToken?: string
}

export interface DecodedSharePayload {
  psbtBase64: string
  decoyLength: number | null
  format: 'v1_json' | 'legacy_raw_psbt'
  deleteToken: string | null
}

function createPayloadError(
  code: SharePayloadErrorCode,
  message: string,
): SharePayloadResult<never> {
  return {
    ok: false,
    error: {
      kind: 'share_payload_error',
      code,
      message,
    },
  }
}

function isSharePlaintextPayload(value: unknown): value is SharePlaintextPayloadV1 {
  if (!isRecord(value)) {
    return false
  }

  const deleteTokenCandidate = value.deleteToken
  const hasValidDeleteToken =
    typeof deleteTokenCandidate === 'undefined' ||
    (typeof deleteTokenCandidate === 'string' &&
      isValidShareDeleteCapabilityToken(deleteTokenCandidate))

  return (
    value.version === SHARE_PLAINTEXT_VERSION &&
    typeof value.data === 'string' &&
    typeof value.decoy === 'string' &&
    value.decoy.length > 0 &&
    hasValidDeleteToken
  )
}

function generateDecoy(length: number, cryptoApi: Crypto): string {
  const randomBytes = new Uint8Array(length)
  cryptoApi.getRandomValues(randomBytes)

  let output = ''

  for (const randomByte of randomBytes) {
    output += DECOY_ALPHABET[randomByte & 63] ?? DECOY_ALPHABET[0]
  }

  return output
}

export function encodeSharePayload(
  validatedPsbt: ValidatedPsbt,
  options: EncodeSharePayloadOptions = {},
): SharePayloadResult<EncodedSharePayload> {
  const cryptoApi = getWebCrypto()

  if (!cryptoApi) {
    return createPayloadError(
      'WEB_CRYPTO_UNAVAILABLE',
      'WebCrypto API is not available in this environment.',
    )
  }

  const decoyLength = randomIntegerInRange(
    DECOY_LENGTH_MIN,
    DECOY_LENGTH_MAX,
    cryptoApi,
  )
  const normalizedDeleteToken = options.deleteToken?.trim() ?? ''

  if (
    normalizedDeleteToken &&
    !isValidShareDeleteCapabilityToken(normalizedDeleteToken)
  ) {
    return createPayloadError(
      'INVALID_PAYLOAD',
      'Share delete capability token has an invalid format.',
    )
  }

  const payloadBase: SharePlaintextPayloadV1 = {
    version: SHARE_PLAINTEXT_VERSION,
    data: validatedPsbt.base64,
    decoy: generateDecoy(decoyLength, cryptoApi),
  }
  const payload: SharePlaintextPayloadV1 = normalizedDeleteToken
    ? {
        ...payloadBase,
        deleteToken: normalizedDeleteToken,
      }
    : payloadBase

  return {
    ok: true,
    value: {
      bytes: new TextEncoder().encode(JSON.stringify(payload)),
      decoyLength,
    },
  }
}

/**
 * Decodes decrypted payload bytes back into canonical PSBT base64.
 *
 * Supports both current JSON envelope format and legacy raw PSBT bytes.
 */
export function decodeSharePayload(
  decryptedBytes: Uint8Array,
): SharePayloadResult<DecodedSharePayload> {
  const decryptedText = new TextDecoder().decode(decryptedBytes)

  try {
    const parsed: unknown = JSON.parse(decryptedText)

    if (isSharePlaintextPayload(parsed)) {
      if (parsed.decoy.length > MAX_ACCEPTED_DECOY_LENGTH) {
        return createPayloadError(
          'INVALID_PAYLOAD',
          'Decrypted decoy payload exceeds the allowed size.',
        )
      }

      const psbtValidation = validatePsbtBase64(parsed.data)

      if (!psbtValidation.ok) {
        return createPayloadError(
          'INVALID_PSBT',
          'Decrypted payload does not contain a valid PSBT.',
        )
      }

      return {
        ok: true,
        value: {
          psbtBase64: psbtValidation.value.base64,
          decoyLength: parsed.decoy.length,
          format: 'v1_json',
          deleteToken: parsed.deleteToken ?? null,
        },
      }
    }
  } catch {
    // Intentionally ignored to support legacy raw-byte payloads.
  }

  const legacyCandidate = bytesToBase64(decryptedBytes)
  const legacyValidation = validatePsbtBase64(legacyCandidate)

  if (!legacyValidation.ok) {
    return createPayloadError(
      'INVALID_PAYLOAD',
      'Decrypted payload does not match the expected PSBT package format.',
    )
  }

  return {
    ok: true,
    value: {
      psbtBase64: legacyValidation.value.base64,
      decoyLength: null,
      format: 'legacy_raw_psbt',
      deleteToken: null,
    },
  }
}

/**
 * Returns a size value with randomized positive jitter for metadata obfuscation.
 */
export function createObfuscatedSizeBytes(
  psbtByteLength: number,
): SharePayloadResult<number> {
  if (
    !Number.isInteger(psbtByteLength) ||
    psbtByteLength <= 0 ||
    psbtByteLength > DEFAULT_MAX_PSBT_BYTES
  ) {
    return createPayloadError('INVALID_PSBT', 'PSBT byte length is out of accepted range.')
  }

  const cryptoApi = getWebCrypto()

  if (!cryptoApi) {
    return createPayloadError(
      'WEB_CRYPTO_UNAVAILABLE',
      'WebCrypto API is not available in this environment.',
    )
  }

  const jitter = randomIntegerInRange(
    SIZE_MASK_JITTER_MIN,
    SIZE_MASK_JITTER_MAX,
    cryptoApi,
  )

  return {
    ok: true,
    value: Math.min(DEFAULT_MAX_PSBT_BYTES, psbtByteLength + jitter),
  }
}
