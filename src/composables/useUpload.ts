/**
 * Upload orchestration composable.
 *
 * Coordinates input validation, expiry resolution, security mode handling,
 * encryption, and encrypted-share persistence.
 */
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import {
  createPasswordKeyDerivation,
  deriveShareKeyFromPassword,
  encryptBytes,
  encodeShareKeyForFragment,
  generateShareKeyBytes,
  serializeEnvelope,
  type CryptoError,
  type PasswordKeyDerivationV1,
} from '../domain/crypto'
import {
  createObfuscatedSizeBytes,
  encodeSharePayload,
  type SharePayloadError,
} from '../domain/sharePayload'
import {
  generateShareDeleteCapabilityToken,
  hashShareDeleteCapabilityToken,
  type ShareDeleteCapabilityError,
} from '../domain/shareDeleteCapability'
import {
  resolveShareExpiry,
  type ShareExpiryError,
} from '../domain/shareExpiry'
import {
  validatePsbtPayloadText,
  type PsbtValidationError,
} from '../domain/psbt'
import { generateShareId } from '../domain/shareId'
import { validateSharePassword } from '../domain/sharePassword'
import {
  createShareRepository,
  type ShareRepositoryError,
} from '../infra/repositories/shareRepository'
import { sanitizeObservabilityMessage } from '../infra/observability/errorMonitoring'
import { isSupabaseConfigured } from '../infra/supabaseClient'
import {
  getBrowserStorage,
  readShareCreationRateLimitState,
  recordShareCreationAttempt,
} from '../utils/shareCreationRateLimit'

export type UploadErrorCode =
  | 'INVALID_PSBT'
  | 'INVALID_PASSWORD'
  | 'INVALID_EXPIRY'
  | 'EXPIRY_TOO_SOON'
  | 'EXPIRY_TOO_LATE'
  | 'RATE_LIMITED'
  | 'SUPABASE_NOT_CONFIGURED'
  | 'ENCRYPTION_FAILED'
  | 'STORE_FAILED'
  | 'UNEXPECTED_ERROR'

export type ShareSecurityMode = 'link_fragment' | 'password'

export interface ShareSecurityOptions {
  mode: ShareSecurityMode
  password?: string
}

export type UploadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'success'
      shareId: string
      shareUrl: string
      securityMode: ShareSecurityMode
      decryptionPassword: string | null
    }
  | {
      status: 'error'
      code: UploadErrorCode
      message: string
    }

export interface UseUpload {
  state: Ref<UploadState>
  isSupabaseReady: ComputedRef<boolean>
  createShareLink(
    psbtInput: string,
    expiryDate: Date | null,
    securityOptions: ShareSecurityOptions,
  ): Promise<void>
  reset(): void
}

const FRAGMENT_KEY_PARAM = 'k'
const SHARE_PAYLOAD_VERSION = 1
const shareRepository = createShareRepository()
const SHARE_CREATION_RATE_LIMIT_WINDOW_MS = 60_000
const SHARE_CREATION_RATE_LIMIT_MAX_ATTEMPTS = 6

function toUploadError(code: UploadErrorCode, message: string): UploadState {
  return {
    status: 'error',
    code,
    message,
  }
}

function normalizeUnknownErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message || error.name
  }

  if (typeof error === 'string') {
    return error
  }

  if (typeof error === 'number' || typeof error === 'boolean') {
    return String(error)
  }

  return 'Unknown runtime error'
}

function reportUnexpectedError(scope: string, error: unknown): void {
  if (!import.meta.env.DEV) {
    return
  }

  const normalizedMessage = sanitizeObservabilityMessage(
    normalizeUnknownErrorMessage(error),
  )
  console.error(`[useUpload:${scope}] ${normalizedMessage}`, error)
}

function mapPsbtValidationError(error: PsbtValidationError): UploadState {
  return toUploadError('INVALID_PSBT', error.message)
}

function mapCryptoError(error: CryptoError): UploadState {
  if (error.code === 'INVALID_PASSWORD') {
    return toUploadError('INVALID_PASSWORD', 'Password is required for password-protected shares.')
  }

  if (error.code === 'INVALID_KEY_LENGTH' || error.code === 'INVALID_FRAGMENT_KEY') {
    return toUploadError('ENCRYPTION_FAILED', 'Unable to generate a valid share key.')
  }

  if (error.code === 'INVALID_KEY_DERIVATION' || error.code === 'KEY_DERIVATION_FAILED') {
    return toUploadError('ENCRYPTION_FAILED', 'Unable to derive an encryption key from password.')
  }

  return toUploadError('ENCRYPTION_FAILED', 'Unable to encrypt PSBT payload.')
}

function mapShareRepositoryError(error: ShareRepositoryError): UploadState {
  if (error.code === 'SUPABASE_NOT_CONFIGURED') {
    return toUploadError(
      'SUPABASE_NOT_CONFIGURED',
      'Supabase environment variables are not configured.',
    )
  }

  if (error.code === 'RATE_LIMITED') {
    return toUploadError('RATE_LIMITED', error.message)
  }

  return toUploadError('STORE_FAILED', 'Unable to store encrypted PSBT payload.')
}

function mapSharePayloadError(error: SharePayloadError): UploadState {
  if (error.code === 'INVALID_PSBT') {
    return toUploadError('INVALID_PSBT', 'PSBT payload is invalid and cannot be encrypted.')
  }

  return toUploadError('ENCRYPTION_FAILED', 'Unable to prepare obfuscated PSBT payload.')
}

function mapDeleteCapabilityError(error: ShareDeleteCapabilityError): UploadState {
  if (error.code === 'WEB_CRYPTO_UNAVAILABLE') {
    return toUploadError(
      'ENCRYPTION_FAILED',
      'WebCrypto API is not available for share capability generation.',
    )
  }

  return toUploadError(
    'ENCRYPTION_FAILED',
    'Unable to prepare secure share delete capability metadata.',
  )
}

function mapShareExpiryError(error: ShareExpiryError): UploadState {
  if (error.code === 'INVALID_EXPIRY') {
    return toUploadError('INVALID_EXPIRY', error.message)
  }

  if (error.code === 'EXPIRY_TOO_SOON') {
    return toUploadError('EXPIRY_TOO_SOON', error.message)
  }

  return toUploadError('EXPIRY_TOO_LATE', error.message)
}

function toRateLimitedUploadError(retryAfterMs: number): UploadState {
  const retrySeconds = Math.max(Math.ceil(retryAfterMs / 1_000), 1)
  return toUploadError(
    'RATE_LIMITED',
    `Too many share creations in a short time. Please retry in ${retrySeconds} seconds.`,
  )
}

function getBasePath(): string {
  const baseUrl = import.meta.env.BASE_URL ?? '/'

  if (baseUrl === '/') {
    return ''
  }

  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}

function buildShareUrl(shareId: string, fragmentKey: string | null): string {
  const sharePath = `${getBasePath()}/p/${shareId}`
  const url = new URL(sharePath, window.location.origin)

  if (fragmentKey) {
    url.hash = `${FRAGMENT_KEY_PARAM}=${fragmentKey}`
  }

  return url.toString()
}

export function useUpload(): UseUpload {
  const state = ref<UploadState>({ status: 'idle' })
  const isSupabaseReady = computed<boolean>(() => isSupabaseConfigured())

  /**
   * Creates a new encrypted share link from user input and selected options.
   */
  async function createShareLink(
    psbtInput: string,
    expiryDate: Date | null,
    securityOptions: ShareSecurityOptions,
  ): Promise<void> {
    state.value = { status: 'loading' }
    const browserStorage = getBrowserStorage()

    try {
      const psbtValidationResult = validatePsbtPayloadText(psbtInput)

      if (!psbtValidationResult.ok) {
        state.value = mapPsbtValidationError(psbtValidationResult.error)
        return
      }

      const shareExpiryResult = resolveShareExpiry(expiryDate)

      if (!shareExpiryResult.ok) {
        state.value = mapShareExpiryError(shareExpiryResult.error)
        return
      }

      let shareKeyBytes: Uint8Array
      let fragmentKey: string | null = null
      let decryptionPassword: string | null = null
      let passwordKeyDerivation: PasswordKeyDerivationV1 | undefined

      if (securityOptions.mode === 'password') {
        const passwordValidationResult = validateSharePassword(securityOptions.password ?? '')

        if (!passwordValidationResult.ok) {
          state.value = toUploadError('INVALID_PASSWORD', passwordValidationResult.error.message)
          return
        }

        const keyDerivationResult = createPasswordKeyDerivation()

        if (!keyDerivationResult.ok) {
          state.value = mapCryptoError(keyDerivationResult.error)
          return
        }

        const passwordKeyResult = await deriveShareKeyFromPassword(
          passwordValidationResult.value,
          keyDerivationResult.value,
        )

        if (!passwordKeyResult.ok) {
          state.value = mapCryptoError(passwordKeyResult.error)
          return
        }

        shareKeyBytes = passwordKeyResult.value
        passwordKeyDerivation = keyDerivationResult.value
        decryptionPassword = passwordValidationResult.value
      } else {
        shareKeyBytes = generateShareKeyBytes()
        const fragmentResult = encodeShareKeyForFragment(shareKeyBytes)

        if (!fragmentResult.ok) {
          state.value = mapCryptoError(fragmentResult.error)
          return
        }

        fragmentKey = fragmentResult.value
      }

      const deleteCapabilityTokenResult = generateShareDeleteCapabilityToken()

      if (!deleteCapabilityTokenResult.ok) {
        state.value = mapDeleteCapabilityError(deleteCapabilityTokenResult.error)
        return
      }

      const deleteCapabilityHashResult = await hashShareDeleteCapabilityToken(
        deleteCapabilityTokenResult.value,
      )

      if (!deleteCapabilityHashResult.ok) {
        state.value = mapDeleteCapabilityError(deleteCapabilityHashResult.error)
        return
      }

      const payloadEncodingResult = encodeSharePayload(psbtValidationResult.value, {
        deleteToken: deleteCapabilityTokenResult.value,
      })

      if (!payloadEncodingResult.ok) {
        state.value = mapSharePayloadError(payloadEncodingResult.error)
        return
      }

      const encryptionResult = await encryptBytes(
        payloadEncodingResult.value.bytes,
        shareKeyBytes,
        {
          keyDerivation: passwordKeyDerivation,
        },
      )

      if (!encryptionResult.ok) {
        state.value = mapCryptoError(encryptionResult.error)
        return
      }

      const sizeMaskingResult = createObfuscatedSizeBytes(psbtValidationResult.value.byteLength)

      if (!sizeMaskingResult.ok) {
        state.value = mapSharePayloadError(sizeMaskingResult.error)
        return
      }

      const shareId = generateShareId()
      if (browserStorage) {
        const rateLimitState = readShareCreationRateLimitState(
          browserStorage,
          Date.now(),
          {
            windowMs: SHARE_CREATION_RATE_LIMIT_WINDOW_MS,
            maxAttempts: SHARE_CREATION_RATE_LIMIT_MAX_ATTEMPTS,
          },
        )

        if (!rateLimitState.allowed) {
          state.value = toRateLimitedUploadError(rateLimitState.retryAfterMs)
          return
        }
      }

      const insertResult = await shareRepository.insertShare({
        id: shareId,
        ciphertextPayload: serializeEnvelope(encryptionResult.value),
        deleteTokenHash: deleteCapabilityHashResult.value,
        sizeBytes: sizeMaskingResult.value,
        version: SHARE_PAYLOAD_VERSION,
        expiresAt: shareExpiryResult.value.expiresAtIso,
      })

      if (!insertResult.ok) {
        state.value = mapShareRepositoryError(insertResult.error)
        return
      }

      if (browserStorage) {
        recordShareCreationAttempt(browserStorage, Date.now(), {
          windowMs: SHARE_CREATION_RATE_LIMIT_WINDOW_MS,
          maxAttempts: SHARE_CREATION_RATE_LIMIT_MAX_ATTEMPTS,
        })
      }

      state.value = {
        status: 'success',
        shareId,
        shareUrl: buildShareUrl(shareId, fragmentKey),
        securityMode: securityOptions.mode,
        decryptionPassword,
      }
    } catch (error: unknown) {
      reportUnexpectedError('createShareLink', error)
      state.value = toUploadError(
        'UNEXPECTED_ERROR',
        'Unexpected error while creating the share link.',
      )
    }
  }

  /**
   * Resets upload state back to idle.
   */
  function reset(): void {
    state.value = { status: 'idle' }
  }

  return {
    state,
    isSupabaseReady,
    createShareLink,
    reset,
  }
}
